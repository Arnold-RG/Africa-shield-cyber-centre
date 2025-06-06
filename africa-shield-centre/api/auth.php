<?php
/**
 * Authentication API Endpoint
 * Africa Shield Cyber Centre
 */

// Start session and include required files
session_start();
require_once '../config/config.php';
require_once '../includes/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

// Set JSON response headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// CORS headers (adjust as needed)
header('Access-Control-Allow-Origin: ' . APP_URL);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Rate limiting
$clientIp = getClientIp();
$rateLimitKey = 'auth_attempts_' . $clientIp;
$maxAttempts = 10;
$timeWindow = 300; // 5 minutes

if (!checkRateLimit($rateLimitKey, $maxAttempts, $timeWindow)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Too many requests. Please try again later.',
        'error_code' => 'RATE_LIMIT_EXCEEDED'
    ]);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // CSRF protection
    if (!isset($input['csrf_token']) || !validateCSRFToken($input['csrf_token'])) {
        throw new Exception('Invalid CSRF token');
    }
    
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'login':
            handleLogin($input);
            break;
            
        case 'register':
            handleRegister($input);
            break;
            
        case 'forgot_password':
            handleForgotPassword($input);
            break;
            
        case 'reset_password':
            handleResetPassword($input);
            break;
            
        case 'check_email':
            handleCheckEmail($input);
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    error_log('Auth API Error: ' . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'GENERAL_ERROR'
    ]);
}

/**
 * Handle user login
 */
function handleLogin($input) {
    global $auth, $db;
    
    // Validate required fields
    $required = ['email', 'password'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("$field is required");
        }
    }
    
    $email = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
    $password = $input['password'];
    $remember = $input['remember'] ?? false;
    
    // Additional validation
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format',
            'error_code' => 'INVALID_EMAIL'
        ]);
        return;
    }
    
    // Check for account lockout
    $user = $db->fetchOne("SELECT * FROM users WHERE email = ?", [$email]);
    
    if ($user && isset($user['locked_until']) && $user['locked_until'] > date('Y-m-d H:i:s')) {
        echo json_encode([
            'success' => false,
            'message' => 'Account is temporarily locked',
            'error_code' => 'ACCOUNT_LOCKED'
        ]);
        return;
    }
    
    // Attempt login
    $loginResult = $auth->login($email, $password, $remember);
    
    if ($loginResult) {
        // Get user data
        $user = $auth->getCurrentUser();
        
        // Log successful login
        logActivity('login_success', 'User logged in successfully', $user['id']);
        
        // Update last login
        $db->update('users', [
            'last_login' => date('Y-m-d H:i:s'),
            'login_attempts' => 0,
            'locked_until' => null
        ], 'id = ?', [$user['id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'email' => $user['email'],
                'role' => $user['user_type'],
                'email_verified' => (bool)$user['email_verified']
            ]
        ]);
        
    } else {
        // Handle failed login
        if ($user) {
            $attempts = ($user['login_attempts'] ?? 0) + 1;
            $lockUntil = null;
            
            // Lock account after 5 failed attempts
            if ($attempts >= 5) {
                $lockUntil = date('Y-m-d H:i:s', time() + 900); // 15 minutes
            }
            
            $db->update('users', [
                'login_attempts' => $attempts,
                'locked_until' => $lockUntil
            ], 'id = ?', [$user['id']]);
            
            // Log failed attempt
            logActivity('login_failed', 'Failed login attempt', $user['id']);
        }
        
        // Log attempt in login_attempts table
        $db->insert('login_attempts', [
            'email' => $email,
            'ip_address' => getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'success' => false,
            'failure_reason' => 'Invalid credentials'
        ]);
        
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password',
            'error_code' => 'INVALID_CREDENTIALS'
        ]);
    }
}

/**
 * Handle user registration
 */
function handleRegister($input) {
    global $auth, $db;
    
    // Validate required fields
    $required = ['firstName', 'lastName', 'email', 'phone', 'country', 'password', 'confirmPassword'];
    $validationErrors = [];
    
    foreach ($required as $field) {
        if (empty($input[$field])) {
            $validationErrors[$field] = ucfirst($field) . ' is required';
        }
    }
    
    // Email validation
    if (!empty($input['email']) && !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        $validationErrors['email'] = 'Invalid email format';
    }
    
    // Password validation
    if (!empty($input['password'])) {
        if (strlen($input['password']) < 8) {
            $validationErrors['password'] = 'Password must be at least 8 characters';
        }
        
        if ($input['password'] !== $input['confirmPassword']) {
            $validationErrors['confirmPassword'] = 'Passwords do not match';
        }
        
        // Check password strength
        $strength = checkPasswordStrength($input['password']);
        if ($strength['score'] < 2) {
            $validationErrors['password'] = 'Password is too weak';
        }
    }
    
    // Phone validation
    if (!empty($input['phone']) && !preg_match('/^[\+]?[1-9][\d]{0,15}$/', preg_replace('/[\s\-\(\)]/', '', $input['phone']))) {
        $validationErrors['phone'] = 'Invalid phone number format';
    }
    
    // Terms agreement
    if (empty($input['agreeTerms'])) {
        $validationErrors['agreeTerms'] = 'You must agree to the terms and conditions';
    }
    
    if (!empty($validationErrors)) {
        echo json_encode([
            'success' => false,
            'message' => 'Validation failed',
            'validation_errors' => $validationErrors,
            'error_code' => 'VALIDATION_ERROR'
        ]);
        return;
    }
    
    // Check if email already exists
    $existingUser = $db->fetchOne("SELECT id FROM users WHERE email = ?", [$input['email']]);
    if ($existingUser) {
        echo json_encode([
            'success' => false,
            'message' => 'Email already registered',
            'error_code' => 'EMAIL_EXISTS'
        ]);
        return;
    }
    
    // Prepare user data
    $userData = [
        'first_name' => sanitizeInput($input['firstName']),
        'last_name' => sanitizeInput($input['lastName']),
        'email' => filter_var($input['email'], FILTER_SANITIZE_EMAIL),
        'phone' => sanitizeInput($input['phone']),
        'country' => sanitizeInput($input['country']),
        'password_hash' => password_hash($input['password'], PASSWORD_DEFAULT),
        'user_type' => 'user',
        'status' => 'active',
        'email_verified' => false
    ];
    
    // Insert user
    $userId = $db->insert('users', $userData);
    
    if ($userId) {
        // Generate email verification token
        $verificationToken = generateSecureToken();
        $db->insert('email_verification_tokens', [
            'user_id' => $userId,
            'token' => $verificationToken,
            'expires_at' => date('Y-m-d H:i:s', time() + 86400) // 24 hours
        ]);
        
        // Send verification email
        sendVerificationEmail($userData['email'], $userData['first_name'], $verificationToken);
        
        // Log registration
        logActivity('user_registered', 'New user registered', $userId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful. Please check your email for verification.',
            'user' => [
                'id' => $userId,
                'email' => $userData['email'],
                'first_name' => $userData['first_name']
            ]
        ]);
        
    } else {
        throw new Exception('Registration failed. Please try again.');
    }
}

/**
 * Handle forgot password
 */
function handleForgotPassword($input) {
    global $db;
    
    if (empty($input['email'])) {
        throw new Exception('Email is required');
    }
    
    $email = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format',
            'error_code' => 'INVALID_EMAIL'
        ]);
        return;
    }
    
    // Check if user exists
    $user = $db->fetchOne("SELECT * FROM users WHERE email = ?", [$email]);
    
    if ($user) {
        // Generate reset token
        $resetToken = generateSecureToken();
        
        // Store token in database
        $db->insert('password_reset_tokens', [
            'user_id' => $user['id'],
            'token' => $resetToken,
            'expires_at' => date('Y-m-d H:i:s', time() + 3600) // 1 hour
        ]);
        
        // Send reset email
        sendPasswordResetEmail($user['email'], $user['first_name'], $resetToken);
        
        // Log activity
        logActivity('password_reset_requested', 'Password reset requested', $user['id']);
    }
    
    // Always return success to prevent email enumeration
    echo json_encode([
        'success' => true,
        'message' => 'If the email exists, a reset link has been sent.'
    ]);
}

/**
 * Handle password reset
 */
function handleResetPassword($input) {
    global $db;
    
    $required = ['token', 'password', 'confirmPassword'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("$field is required");
        }
    }
    
    if ($input['password'] !== $input['confirmPassword']) {
        echo json_encode([
            'success' => false,
            'message' => 'Passwords do not match',
            'error_code' => 'PASSWORD_MISMATCH'
        ]);
        return;
    }
    
    // Validate password strength
    $strength = checkPasswordStrength($input['password']);
    if ($strength['score'] < 2) {
        echo json_encode([
            'success' => false,
            'message' => 'Password is too weak',
            'error_code' => 'WEAK_PASSWORD'
        ]);
        return;
    }
    
    // Verify token
    $resetRecord = $db->fetchOne(
        "SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ? AND used = FALSE",
        [$input['token'], date('Y-m-d H:i:s')]
    );
    
    if (!$resetRecord) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired reset token',
            'error_code' => 'INVALID_TOKEN'
        ]);
        return;
    }
    
    // Update password
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    $db->update('users', [
        'password_hash' => $hashedPassword,
        'updated_at' => date('Y-m-d H:i:s')
    ], 'id = ?', [$resetRecord['user_id']]);
    
    // Mark token as used
    $db->update('password_reset_tokens', [
        'used' => true
    ], 'id = ?', [$resetRecord['id']]);
    
    // Log activity
    logActivity('password_reset_completed', 'Password reset completed', $resetRecord['user_id']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password reset successful. You can now log in with your new password.'
    ]);
}

/**
 * Check email availability
 */
function handleCheckEmail($input) {
    global $db;
    
    if (empty($input['email'])) {
        throw new Exception('Email is required');
    }
    
    $email = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'available' => false,
            'message' => 'Invalid email format'
        ]);
        return;
    }
    
    $existingUser = $db->fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
    
    echo json_encode([
        'success' => true,
        'available' => !$existingUser,
        'message' => $existingUser ? 'Email already registered' : 'Email available'
    ]);
}

/**
 * Handle logout
 */
function handleLogout() {
    global $auth;
    
    $auth->logout();
    
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

/**
 * Helper Functions
 */

/**
 * Check rate limiting
 */
function checkRateLimit($key, $maxAttempts, $timeWindow) {
    $cacheFile = sys_get_temp_dir() . '/rate_limit_' . md5($key) . '.json';
    
    $data = [];
    if (file_exists($cacheFile)) {
        $content = file_get_contents($cacheFile);
        $data = json_decode($content, true) ?: [];
    }
    
    $now = time();
    $windowStart = $now - $timeWindow;
    
    // Clean old entries
    $data = array_filter($data, function($timestamp) use ($windowStart) {
        return $timestamp > $windowStart;
    });
    
    // Check if limit exceeded
    if (count($data) >= $maxAttempts) {
        return false;
    }
    
    // Add current attempt
    $data[] = $now;
    
    // Save to cache
    file_put_contents($cacheFile, json_encode($data));
    
    return true;
}

/**
 * Validate CSRF token
 */
function validateCSRFToken($token) {
    // In a real application, you would validate against a stored token
    // For now, we'll do basic validation
    return !empty($token) && strlen($token) >= 16;
}

/**
 * Check password strength
 */
function checkPasswordStrength($password) {
    $score = 0;
    $feedback = [];
    
    // Length check
    if (strlen($password) >= 8) {
        $score++;
    } else {
        $feedback[] = 'Use at least 8 characters';
    }
    
    // Uppercase check
    if (preg_match('/[A-Z]/', $password)) {
        $score++;
    } else {
        $feedback[] = 'Add uppercase letters';
    }
    
    // Lowercase check
    if (preg_match('/[a-z]/', $password)) {
        $score++;
    } else {
        $feedback[] = 'Add lowercase letters';
    }
    
    // Number check
    if (preg_match('/\d/', $password)) {
        $score++;
    } else {
        $feedback[] = 'Add numbers';
    }
    
    // Special character check
    if (preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
        $score++;
    } else {
        $feedback[] = 'Add special characters';
    }
    
    // Common password check
    $commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (in_array(strtolower($password), $commonPasswords)) {
        $score = max(0, $score - 2);
        $feedback[] = 'Avoid common passwords';
    }
    
    return [
        'score' => $score,
        'feedback' => $feedback
    ];
}

/**
 * Send verification email
 */
function sendVerificationEmail($email, $firstName, $token) {
    $verificationUrl = APP_URL . '/verify-email.php?token=' . urlencode($token);
    
    $subject = APP_NAME . ' - Verify Your Email Address';
    
    $message = "
    <html>
    <head>
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a365d, #2d5a87); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #1a365d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Welcome to Africa Shield</h1>
                <p>Cyber Defence Centre</p>
            </div>
            <div class='content'>
                <h2>Hello {$firstName},</h2>
                <p>Thank you for registering with Africa Shield Cyber Defence Centre. To complete your registration, please verify your email address by clicking the button below:</p>
                
                <p style='text-align: center;'>
                    <a href='{$verificationUrl}' class='button'>Verify Email Address</a>
                </p>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style='word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;'>{$verificationUrl}</p>
                
                <p>This verification link will expire in 24 hours.</p>
                
                <p>If you didn't create an account with us, please ignore this email.</p>
                
                <p>Best regards,<br>The Africa Shield Team</p>
            </div>
            <div class='footer'>
                <p>&copy; " . date('Y') . " Africa Shield Cyber Defence Centre. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . APP_NAME . ' <noreply@africashield.org>',
        'Reply-To: support@africashield.org',
        'X-Mailer: PHP/' . phpversion()
    ];
    
    return mail($email, $subject, $message, implode("\r\n", $headers));
}

/**
 * Send password reset email
 */
function sendPasswordResetEmail($email, $firstName, $token) {
    $resetUrl = APP_URL . '/reset-password.php?token=' . urlencode($token);
    
    $subject = APP_NAME . ' - Password Reset Request';
    
    $message = "
    <html>
    <head>
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a365d, #2d5a87); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Password Reset</h1>
                <p>Africa Shield Cyber Defence Centre</p>
            </div>
            <div class='content'>
                <h2>Hello {$firstName},</h2>
                <p>We received a request to reset your password for your Africa Shield account. If you made this request, click the button below to reset your password:</p>
                
                <p style='text-align: center;'>
                    <a href='{$resetUrl}' class='button'>Reset Password</a>
                </p>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style='word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;'>{$resetUrl}</p>
                
                <div class='warning'>
                    <strong>Security Notice:</strong>
                    <ul>
                        <li>This reset link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password will remain unchanged until you create a new one</li>
                    </ul>
                </div>
                
                <p>For security reasons, we recommend choosing a strong password that includes:</p>
                <ul>
                    <li>At least 8 characters</li>
                    <li>A mix of uppercase and lowercase letters</li>
                    <li>Numbers and special characters</li>
                </ul>
                
                <p>If you have any concerns about your account security, please contact our support team immediately.</p>
                
                <p>Best regards,<br>The Africa Shield Security Team</p>
            </div>
            <div class='footer'>
                <p>&copy; " . date('Y') . " Africa Shield Cyber Defence Centre. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . APP_NAME . ' Security <security@africashield.org>',
        'Reply-To: support@africashield.org',
        'X-Mailer: PHP/' . phpversion(),
        'X-Priority: 1'
    ];
    
    return mail($email, $subject, $message, implode("\r\n", $headers));
}

/**
 * Generate secure token
 */
function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length));
}

/**
 * Sanitize input
 */
function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Get client IP address
 */
function getClientIp() {
    $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ips = explode(',', $_SERVER[$key]);
            $ip = trim($ips[0]);
            
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Log activity
 */
function logActivity($action, $description, $userId = null) {
    global $db;
    
    try {
        $db->insert('activity_logs', [
            'user_id' => $userId,
            'action' => $action,
            'ip_address' => getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    } catch (Exception $e) {
        error_log('Failed to log activity: ' . $e->getMessage());
    }
}
?>