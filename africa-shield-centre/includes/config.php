<?php
/**
 * Configuration File
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Application settings
define('APP_NAME', 'Africa Shield Cyber Centre');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'https://africashield.org');
define('APP_EMAIL', 'info@africashield.org');

// Database settings
define('DB_HOST', 'localhost');
define('DB_NAME', 'africashield_db');
define('DB_USER', 'africashield_user');
define('DB_PASS', 'your_secure_password_here');
define('DB_CHARSET', 'utf8mb4');

// Security settings
define('HASH_COST', 12); // For password hashing
define('SESSION_LIFETIME', 7200); // 2 hours
define('CSRF_TOKEN_EXPIRY', 3600); // 1 hour
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes

// File upload settings
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']);

// Language settings
define('DEFAULT_LANGUAGE', 'en');
define('AVAILABLE_LANGUAGES', ['en', 'fr', 'sw']);

// API settings
define('API_KEY', 'your_api_key_here');
define('API_RATE_LIMIT', 100); // Requests per hour

// Email settings
define('SMTP_HOST', 'smtp.example.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'noreply@africashield.org');
define('SMTP_PASSWORD', 'your_smtp_password_here');
define('SMTP_ENCRYPTION', 'tls');
define('MAIL_FROM_NAME', APP_NAME);

// Social media links
define('TWITTER_URL', 'https://twitter.com/africashield');
define('FACEBOOK_URL', 'https://facebook.com/africashield');
define('LINKEDIN_URL', 'https://linkedin.com/company/africashield');
define('YOUTUBE_URL', 'https://youtube.com/africashield');
define('GITHUB_URL', 'https://github.com/africashield');

// Emergency contact
define('EMERGENCY_PHONE', '+254700000000');
define('EMERGENCY_EMAIL', 'soc@africashield.org');

// Set timezone
date_default_timezone_set('Africa/Nairobi');

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
session_set_cookie_params(SESSION_LIFETIME);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}