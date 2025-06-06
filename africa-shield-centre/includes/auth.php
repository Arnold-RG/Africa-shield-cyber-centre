<?php
/**
 * Authentication Class
 */

class Auth {
    private $db;
    
    /**
     * Constructor
     * 
     * @param Database $db Database instance
     */
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Register a new user
     * 
     * @param array $userData User data
     * @return int|false User ID or false on failure
     */
    public function register($userData) {
        // Validate email
        if (!filter_var($userData['email'], FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        
        // Check if email already exists
        $existingUser = $this->db->fetchOne("SELECT id FROM users WHERE email = ?", [$userData['email']]);
        
        if ($existingUser) {
            return false;
        }
        
        // Hash password
        $userData['password'] = password_hash($userData['password'], PASSWORD_BCRYPT, ['cost' => HASH_COST]);
        
        // Set default role if not provided
        if (!isset($userData['role'])) {
            $userData['role'] = 'user';
        }
        
        // Set created_at timestamp
        $userData['created_at'] = date('Y-m-d H:i:s');
        
        // Insert user
        $userId = $this->db->insert('users', $userData);
        
        if ($userId) {
            // Log activity
            logActivity('user_register', 'User registered', $userId);
            
            return $userId;
        }
        
        return false;
    }
    
    /**
     * Login a user
     * 
     * @param string $email User email
     * @param string $password User password
     * @param bool $remember Remember me
     * @return bool Success or failure
     */
    public function login($email, $password, $remember = false) {
        // Get user by email
        $user = $this->db->fetchOne("SELECT * FROM users WHERE email = ?", [$email]);
        
        if (!$user) {
            return false;
        }
        
        // Check if account is locked
        if (isset($user['login_attempts']) && $user['login_attempts'] >= MAX_LOGIN_ATTEMPTS) {
            $lockoutTime = strtotime($user['last_login_attempt']) + LOGIN_LOCKOUT_TIME;
            
            if (time() < $lockoutTime) {
                return false;
            }
        }
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            // Increment login attempts
            $this->db->update('users', [
                'login_attempts' => ($user['login_attempts'] ?? 0) + 1,
                'last_login_attempt' => date('Y-m-d H:i:s')
            ], 'id = ?', [$user['id']]);
            
            return false;
        }
        
        // Reset login attempts
        $this->db->update('users', [
            'login_attempts' => 0,
            'last_login_attempt' => null,
            'last_login_at' => date('Y-m-d H:i:s'),
            'last_login_ip' => getClientIp()
        ], 'id = ?', [$user['id']]);
        
        // Set session variables
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['last_activity'] = time();
        
        // Set remember me cookie
        if ($remember) {
            $token = generateSecureToken();
            $expiry = time() + (30 * 24 * 60 * 60); // 30 days
            
            // Store token in database
            $this->db->insert('remember_tokens', [
                'user_id' => $user['id'],
                'token' => password_hash($token, PASSWORD_DEFAULT),
                'expires_at' => date('Y-m-d H:i:s', $expiry)
            ]);
            
            // Set cookie
            setcookie('remember_token', $user['id'] . ':' . $token, $expiry, '/', '', true, true);
        }
        
        // Log activity
        logActivity('user_login', 'User logged in', $user['id']);
        
        return true;
    }
    
    /**
     * Logout a user
     * 
     * @return void
     */
    public function logout() {
        // Log activity before clearing session
        if (isset($_SESSION['user_id'])) {
            logActivity('user_logout', 'User logged out', $_SESSION['user_id']);
        }
        
        // Clear remember me cookie
        if (isset($_COOKIE['remember_token'])) {
            list($userId, $token) = explode(':', $_COOKIE['remember_token']);
            
            // Delete token from database
            $this->db->delete('remember_tokens', 'user_id = ?', [$userId]);
            
            // Clear cookie
            setcookie('remember_token', '', time() - 3600, '/', '', true, true);
        }
        
        // Clear session
        $_SESSION = [];
        
        // Destroy session
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
    
    /**
     * Check if user is logged in
     * 
     * @return bool True if logged in, false otherwise
     */
    public function isLoggedIn() {
        // Check if user ID is set in session
        if (isset($_SESSION['user_id'])) {
            // Check if session has expired
            if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > SESSION_LIFETIME)) {
                $this->logout();
                return false;
            }
            
            // Update last activity time
            $_SESSION['last_activity'] = time();
            
            return true;
        }
        
        // Check for remember me cookie
        if (isset($_COOKIE['remember_token'])) {
            list($userId, $token) = explode(':', $_COOKIE['remember_token']);
            
            // Get token from database
            $storedToken = $this->db->fetchOne(
                "SELECT * FROM remember_tokens WHERE user_id = ? AND expires_at > ?",
                [$userId, date('Y-m-d H:i:s')]
            );
            
            if ($storedToken && password_verify($token, $storedToken['token'])) {
                // Get user
                $user = $this->db->fetchOne("SELECT * FROM users WHERE id = ?", [$userId]);
                
                if ($user) {
                    // Set session variables
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_role'] = $user['role'];
                    $_SESSION['user_email'] = $user['email'];
                    $_SESSION['last_activity'] = time();
                    
                    // Log activity
                    logActivity('user_login', 'User logged in via remember me', $user['id']);
                    
                    return true;
                }
            }
            
            // Invalid token, clear cookie
            setcookie('remember_token', '', time() - 3600, '/', '', true, true);
        }
        
        return false;
    }
    
    /**
     * Get current user
     * 
     * @return array|false User data or false if not logged in
     */
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) {
            return false;
        }
        
        return $this->db->fetchOne("SELECT * FROM users WHERE id = ?", [$_SESSION['user_id']]);
    }
    
    /**
     * Check if user has role
     * 
     * @param string|array $roles Role(s) to check
     * @return bool True if user has role, false otherwise
     */
    public function hasRole($roles) {
        if (!$this->isLoggedIn()) {
            return false;
        }
        
        if (!is_array($roles)) {
            $roles = [$roles];
        }
        
        return in_array($_SESSION['user_role'], $roles);
    }
    
    /**
     * Update user password
     * 
     * @param int $userId User ID
     * @param string $currentPassword Current password
     * @param string $newPassword New password
     * @return bool Success or failure
     */
    public function updatePassword($userId, $currentPassword, $newPassword) {
        // Get user
        $user = $this->db->fetchOne("SELECT * FROM users WHERE id = ?", [$userId]);
        
        if (!$user) {
            return false;
        }
        
        // Verify current password
        if (!password_verify($currentPassword, $user['password'])) {
            return false;
        }
        
        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
        
        // Update password
        $result = $this->db->update('users', [
            'password' => $hashedPassword,
            'updated_at' => date('Y-m-d H:i:s')
        ], 'id = ?', [$userId]);
        
        if ($result) {
            // Log activity
            logActivity('password_change', 'User changed password', $userId);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Reset password (forgot password)
     * 
     * @param string $email User email
     * @return bool Success or failure
     */
    public function resetPassword($email) {
        // Get user by email
        $user = $this->db->fetchOne("SELECT * FROM users WHERE email = ?", [$email]);
        
        if (!$user) {
            return false;
        }
        
        // Generate reset token
        $token = generateSecureToken();
        $expiry = date('Y-m-d H:i:s', time() + 3600); // 1 hour
        
        // Store token in database
        $result = $this->db->insert('password_resets', [
            'user_id' => $user['id'],
            'token' => password_hash($token, PASSWORD_DEFAULT),
            'expires_at' => $expiry
        ]);
        
        if ($result) {
            // Send reset email
            $resetUrl = APP_URL . '/auth/reset-password.php?token=' . urlencode($user['id'] . ':' . $token);
            
            $subject = APP_NAME . ' - Password Reset';
            $message = "Hello {$user['username']},\n\n";
            $message .= "You have requested to reset your password. Please click the link below to reset your password:\n\n";
            $message .= $resetUrl . "\n\n";
            $message .= "This link will expire in 1 hour.\n\n";
            $message .= "If you did not request this, please ignore this email.\n\n";
            $message .= "Regards,\n" . APP_NAME . " Team";
            
            $headers = "From: " . MAIL_FROM_NAME . " <" . SMTP_USERNAME . ">\r\n";
            $headers .= "Reply-To: " . SMTP_USERNAME . "\r\n";
            
            mail($user['email'], $subject, $message, $headers);
            
            // Log activity
            logActivity('password_reset_request', 'User requested password reset', $user['id']);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Confirm password reset
     * 
     * @param string $token Reset token
     * @param string $newPassword New password
     * @return bool Success or failure
     */
    public function confirmPasswordReset($token, $newPassword) {
        list($userId, $resetToken) = explode(':', $token);
        
        // Get reset token from database
        $storedReset = $this->db->fetchOne(
            "SELECT * FROM password_resets WHERE user_id = ? AND expires_at > ?",
            [$userId, date('Y-m-d H:i:s')]
        );
        
        if (!$storedReset || !password_verify($resetToken, $storedReset['token'])) {
            return false;
        }
        
        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
        
        // Update password
        $result = $this->db->update('users', [
            'password' => $hashedPassword,
            'updated_at' => date('Y-m-d H:i:s')
        ], 'id = ?', [$userId]);
        
        if ($result) {
            // Delete reset token
            $this->db->delete('password_resets', 'user_id = ?', [$userId]);
            
            // Log activity
            logActivity('password_reset_complete', 'User completed password reset', $userId);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Update user profile
     * 
     * @param int $userId User ID
     * @param array $data Profile data
     * @return bool Success or failure
     */
    public function updateProfile($userId, $data) {
        // Set updated_at timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        // Update user
        $result = $this->db->update('users', $data, 'id = ?', [$userId]);
        
        if ($result) {
            // Log activity
            logActivity('profile_update', 'User updated profile', $userId);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Delete user account
     * 
     * @param int $userId User ID
     * @param string $password User password for confirmation
     * @return bool Success or failure
     */
    public function deleteAccount($userId, $password) {
        // Get user
        $user = $this->db->fetchOne("SELECT * FROM users WHERE id = ?", [$userId]);
        
        if (!$user) {
            return false;
        }
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            return false;
        }
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Delete user data from related tables
            $this->db->delete('remember_tokens', 'user_id = ?', [$userId]);
            $this->db->delete('password_resets', 'user_id = ?', [$userId]);
            $this->db->delete('user_activity', 'user_id = ?', [$userId]);
            
            // Delete user
            $this->db->delete('users', 'id = ?', [$userId]);
            
            // Commit transaction
            $this->db->commit();
            
            // Log activity (to system log, not user activity)
            error_log("User account deleted: ID {$userId}");
            
            // Logout
            $this->logout();
            
            return true;
        } catch (Exception $e) {
            // Rollback transaction
            $this->db->rollback();
            
            error_log("Error deleting user account: " . $e->getMessage());
            
            return false;
        }
    }
}

// Initialize auth
$auth = new Auth($db);

// Check if user is logged in
$isLoggedIn = $auth->isLoggedIn();
$currentUser = $isLoggedIn ? $auth->getCurrentUser() : null;