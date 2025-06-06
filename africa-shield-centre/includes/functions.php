<?php
require_once 'config.php';

/**
 * Utility Functions
 */

/**
 * Get list of East African countries
 * 
 * @return array List of East African countries
 */
function getEastAfricanCountries() {
    return [
        'Burundi', 
        'Kenya', 
        'Rwanda', 
        'South Sudan', 
        'Tanzania', 
        'Uganda',
        'Ethiopia',
        'Somalia',
        'Djibouti',
        'Eritrea'
    ];
}

/**
 * Get country name from ISO code
 * 
 * @param string $code Country code
 * @return string Country name
 */
function getCountryName($code) {
    $countries = [
        'DZ' => 'Algeria',
        'AO' => 'Angola',
        'BJ' => 'Benin',
        'BW' => 'Botswana',
        'BF' => 'Burkina Faso',
        'BI' => 'Burundi',
        'CM' => 'Cameroon',
        'CV' => 'Cape Verde',
        'CF' => 'Central African Republic',
        'TD' => 'Chad',
        'KM' => 'Comoros',
        'CD' => 'Congo (Democratic Republic)',
        'CG' => 'Congo (Republic)',
        'CI' => 'Côte d\'Ivoire',
        'DJ' => 'Djibouti',
        'EG' => 'Egypt',
        'GQ' => 'Equatorial Guinea',
        'ER' => 'Eritrea',
        'SZ' => 'Eswatini',
        'ET' => 'Ethiopia',
        'GA' => 'Gabon',
        'GM' => 'Gambia',
        'GH' => 'Ghana',
        'GN' => 'Guinea',
        'GW' => 'Guinea-Bissau',
        'KE' => 'Kenya',
        'LS' => 'Lesotho',
        'LR' => 'Liberia',
        'LY' => 'Libya',
        'MG' => 'Madagascar',
        'MW' => 'Malawi',
        'ML' => 'Mali',
        'MR' => 'Mauritania',
        'MU' => 'Mauritius',
        'MA' => 'Morocco',
        'MZ' => 'Mozambique',
        'NA' => 'Namibia',
        'NE' => 'Niger',
        'NG' => 'Nigeria',
        'RW' => 'Rwanda',
        'ST' => 'São Tomé and Príncipe',
        'SN' => 'Senegal',
        'SC' => 'Seychelles',
        'SL' => 'Sierra Leone',
        'SO' => 'Somalia',
        'ZA' => 'South Africa',
        'SS' => 'South Sudan',
        'SD' => 'Sudan',
        'TZ' => 'Tanzania',
        'TG' => 'Togo',
        'TN' => 'Tunisia',
        'UG' => 'Uganda',
        'ZM' => 'Zambia',
        'ZW' => 'Zimbabwe'
    ];
    
    return $countries[$code] ?? 'Unknown';
}

/**
 * Get current language
 * 
 * @return string Current language code
 */
function getCurrentLanguage() {
    // Check URL parameter
    if (isset($_GET['lang']) && in_array($_GET['lang'], AVAILABLE_LANGUAGES)) {
        // Set cookie for future requests
        setcookie('language', $_GET['lang'], time() + (365 * 24 * 60 * 60), '/');
        return $_GET['lang'];
    }
    
    // Check cookie
    if (isset($_COOKIE['language']) && in_array($_COOKIE['language'], AVAILABLE_LANGUAGES)) {
        return $_COOKIE['language'];
    }
    
    // Default language
    return DEFAULT_LANGUAGE;
}

/**
 * Translate a string
 * 
 * @param string $key Translation key
 * @param array $params Parameters for string interpolation
 * @return string Translated string
 */
function translate($key, $params = []) {
    static $translations = null;
    
    if ($translations === null) {
        $lang = getCurrentLanguage();
        $file = __DIR__ . '/../lang/' . $lang . '.php';
        
        if (file_exists($file)) {
            $translations = include $file;
        } else {
            $translations = include __DIR__ . '/../lang/' . DEFAULT_LANGUAGE . '.php';
        }
    }
    
    // Get translation
    $text = $key;
    $keys = explode('.', $key);
    $current = $translations;
    
    foreach ($keys as $segment) {
        if (isset($current[$segment])) {
            $current = $current[$segment];
        } else {
            return $key; // Key not found, return the key itself
        }
    }
    
    if (is_string($current)) {
        $text = $current;
    } else {
        return $key; // Not a string, return the key itself
    }
    
    // Replace parameters
    if (!empty($params)) {
        foreach ($params as $param => $value) {
            $text = str_replace(':' . $param, $value, $text);
        }
    }
    
    return $text;
}

/**
 * Get client IP address
 * 
 * @return string IP address
 */
function getClientIp() {
    $ipAddress = '';
    
    if (isset($_SERVER['HTTP_CLIENT_IP'])) {
        $ipAddress = $_SERVER['HTTP_CLIENT_IP'];
    } else if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else if (isset($_SERVER['HTTP_X_FORWARDED'])) {
        $ipAddress = $_SERVER['HTTP_X_FORWARDED'];
    } else if (isset($_SERVER['HTTP_FORWARDED_FOR'])) {
        $ipAddress = $_SERVER['HTTP_FORWARDED_FOR'];
    } else if (isset($_SERVER['HTTP_FORWARDED'])) {
        $ipAddress = $_SERVER['HTTP_FORWARDED'];
    } else if (isset($_SERVER['REMOTE_ADDR'])) {
        $ipAddress = $_SERVER['REMOTE_ADDR'];
    } else {
        $ipAddress = 'UNKNOWN';
    }
    
    return $ipAddress;
}

/**
 * Generate secure random token
 * 
 * @param int $length Token length
 * @return string Random token
 */
function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Generate CSRF token
 * 
 * @return string CSRF token
 */
function generateCsrfToken() {
    $token = generateSecureToken();
    
    $_SESSION['csrf_token'] = $token;
    $_SESSION['csrf_token_expiry'] = time() + CSRF_TOKEN_EXPIRY;
    
    return $token;
}

/**
 * Verify CSRF token
 * 
 * @param string $token Token to verify
 * @return bool Valid or invalid
 */
function verifyCsrfToken($token) {
    if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_expiry'])) {
        return false;
    }
    
    if (time() > $_SESSION['csrf_token_expiry']) {
        unset($_SESSION['csrf_token']);
        unset($_SESSION['csrf_token_expiry']);
        return false;
    }
    
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Sanitize input
 * 
 * @param string $input Input to sanitize
 * @return string Sanitized input
 */
function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Set flash message
 * 
 * @param string $message Message content
 * @param string $type Message type (success, danger, warning, info)
 * @return void
 */
function setFlashMessage($message, $type = 'info') {
    $_SESSION['flash_message'] = [
        'message' => $message,
        'type' => $type
    ];
}

/**
 * Get flash message
 * 
 * @return array|null Flash message or null if none
 */
function getFlashMessage() {
    if (isset($_SESSION['flash_message'])) {
        $flashMessage = $_SESSION['flash_message'];
        unset($_SESSION['flash_message']);
        return $flashMessage;
    }
    
    return null;
}

/**
 * Log user activity
 * 
 * @param string $action Action performed
 * @param string $description Activity description
 * @param int $userId User ID (optional)
 * @return bool Success or failure
 */
function logActivity($action, $description, $userId = null) {
    global $db;
    
    if (!$userId && isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    }
    
    $data = [
        'user_id' => $userId,
        'action' => $action,
        'description' => $description,
        'ip_address' => getClientIp(),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    return $db->insert('user_activity', $data);
}

/**
 * Format date
 * 
 * @param string $date Date string
 * @param string $format Date format
 * @return string Formatted date
 */
function formatDate($date, $format = 'M j, Y') {
    return date($format, strtotime($date));
}

/**
 * Format time
 * 
 * @param string $time Time string
 * @param string $format Time format
 * @return string Formatted time
 */
function formatTime($time, $format = 'g:i A') {
    return date($format, strtotime($time));
}

/**
 * Format datetime
 * 
 * @param string $datetime Datetime string
 * @param string $format Datetime format
 * @return string Formatted datetime
 */
function formatDatetime($datetime, $format = 'M j, Y g:i A') {
    return date($format, strtotime($datetime));
}

/**
 * Get time ago
 * 
 * @param string $datetime Datetime string
 * @return string Time ago
 */
function timeAgo($datetime) {
    $time = strtotime($datetime);
    $now = time();
    $diff = $now - $time;
    
    if ($diff < 60) {
        return 'Just now';
    } else if ($diff < 3600) {
        $minutes = floor($diff / 60);
        return $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
    } else if ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
    } else if ($diff < 604800) {
        $days = floor($diff / 86400);
        return $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
    } else if ($diff < 2592000) {
        $weeks = floor($diff / 604800);
        return $weeks . ' week' . ($weeks > 1 ? 's' : '') . ' ago';
    } else if ($diff < 31536000) {
        $months = floor($diff / 2592000);
        return $months . ' month' . ($months > 1 ? 's' : '') . ' ago';
    } else {
        $years = floor($diff / 31536000);
        return $years . ' year' . ($years > 1 ? 's' : '') . ' ago';
    }
}

/**
 * Validate email
 * 
 * @param string $email Email to validate
 * @return bool True if valid, false otherwise
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate URL
 * 
 * @param string $url URL to validate
 * @return bool True if valid, false otherwise
 */
function isValidUrl($url) {
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

/**
 * Truncate text
 * 
 * @param string $text Text to truncate
 * @param int $length Maximum length
 * @param string $append Text to append if truncated
 * @return string Truncated text
 */
function truncateText($text, $length = 100, $append = '...') {
    if (strlen($text) <= $length) {
        return $text;
    }
    
    $text = substr($text, 0, $length);
    $text = substr($text, 0, strrpos($text, ' '));
    
    return $text . $append;
}

/**
 * Format file size
 * 
 * @param int $bytes Size in bytes
 * @param int $precision Decimal precision
 * @return string Formatted size
 */
function formatFileSize($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    
    $bytes /= (1 << (10 * $pow));
    
    return round($bytes, $precision) . ' ' . $units[$pow];
}

/**
 * Validate file upload
 * 
 * @param array $file File data ($_FILES array item)
 * @param array $allowedExtensions Allowed file extensions
 * @param int $maxSize Maximum file size in bytes
 * @return array|string Success with file info or error message
 */
function validateFileUpload($file, $allowedExtensions = null, $maxSize = null) {
    // Use default values if not specified
    if ($allowedExtensions === null) {
        $allowedExtensions = explode(',', ALLOWED_EXTENSIONS);
    }
    
    if ($maxSize === null) {
        $maxSize = MAX_UPLOAD_SIZE;
    }
    
    // Check for errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
            UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form',
            UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload'
        ];
        
        return $errorMessages[$file['error']] ?? 'Unknown upload error';
    }
    
    // Check file size
    if ($file['size'] > $maxSize) {
        return 'File size exceeds the maximum allowed size (' . formatFileSize($maxSize) . ')';
    }
    
    // Check file extension
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($extension, $allowedExtensions)) {
        return 'File type not allowed. Allowed types: ' . implode(', ', $allowedExtensions);
    }
    
    // Return file info
    return [
        'name' => $file['name'],
        'tmp_name' => $file['tmp_name'],
        'type' => $file['type'],
        'size' => $file['size'],
        'extension' => $extension
    ];
}

/**
 * Upload file
 * 
 * @param array $file File data ($_FILES array item)
 * @param string $destination Destination directory
 * @param string $filename Custom filename (optional)
 * @param array $allowedExtensions Allowed file extensions
 * @param int $maxSize Maximum file size in bytes
 * @return string|false Uploaded file path or false on failure
 */
function uploadFile($file, $destination, $filename = null, $allowedExtensions = null, $maxSize = null) {
    // Validate file
    $validation = validateFileUpload($file, $allowedExtensions, $maxSize);
    
    if (!is_array($validation)) {
        error_log('File upload validation failed: ' . $validation);
        return false;
    }
    
    // Create destination directory if it doesn't exist
    if (!is_dir($destination)) {
        mkdir($destination, 0755, true);
    }
    
    // Generate filename if not provided
    if ($filename === null) {
        $filename = uniqid() . '.' . $validation['extension'];
    }
    
    // Full path
    $filePath = rtrim($destination, '/') . '/' . $filename;
    
    // Move uploaded file
    if (move_uploaded_file($validation['tmp_name'], $filePath)) {
        return $filePath;
    }
    
    error_log('Failed to move uploaded file to destination: ' . $filePath);
    return false;
}

/**
 * Get file extension
 * 
 * @param string $filename Filename
 * @return string File extension
 */
function getFileExtension($filename) {
    return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
}

/**
 * Check if file extension is allowed
 * 
 * @param string $filename Filename
 * @param array $allowedExtensions Allowed extensions
 * @return bool True if allowed, false otherwise
 */
function isAllowedExtension($filename, $allowedExtensions = ALLOWED_EXTENSIONS) {
    $extension = getFileExtension($filename);
    return in_array($extension, $allowedExtensions);
}

/**
 * Generate pagination HTML
 * 
 * @param array $pagination Pagination data
 * @param string $queryParam Query parameter name
 * @return string Pagination HTML
 */
function generatePagination($pagination, $queryParam = 'page') {
    if ($pagination['last_page'] <= 1) {
        return '';
    }
    
    $currentUrl = strtok($_SERVER['REQUEST_URI'], '?');
    $queryString = $_GET;
    
    $html = '<nav aria-label="Page navigation"><ul class="pagination justify-content-center">';
    
    // Previous page link
    if ($pagination['current_page'] > 1) {
        $queryString[$queryParam] = $pagination['current_page'] - 1;
        $prevUrl = $currentUrl . '?' . http_build_query($queryString);
        $html .= '<li class="page-item"><a class="page-link" href="' . $prevUrl . '" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a></li>';
    } else {
        $html .= '<li class="page-item disabled"><a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a></li>';
    }
    
    // Page links
    $startPage = max(1, $pagination['current_page'] - 2);
    $endPage = min($pagination['last_page'], $pagination['current_page'] + 2);
    
    if ($startPage > 1) {
        $queryString[$queryParam] = 1;
        $html .= '<li class="page-item"><a class="page-link" href="' . $currentUrl . '?' . http_build_query($queryString) . '">1</a></li>';
        
        if ($startPage > 2) {
            $html .= '<li class="page-item disabled"><a class="page-link" href="#">...</a></li>';
        }
    }
    
    for ($i = $startPage; $i <= $endPage; $i++) {
        $queryString[$queryParam] = $i;
        $url = $currentUrl . '?' . http_build_query($queryString);
        
        if ($i == $pagination['current_page']) {
            $html .= '<li class="page-item active"><a class="page-link" href="#">' . $i . '</a></li>';
        } else {
            $html .= '<li class="page-item"><a class="page-link" href="' . $url . '">' . $i . '</a></li>';
        }
    }
    
    if ($endPage < $pagination['last_page']) {
        if ($endPage < $pagination['last_page'] - 1) {
            $html .= '<li class="page-item disabled"><a class="page-link" href="#">...</a></li>';
        }
        
        $queryString[$queryParam] = $pagination['last_page'];
        $html .= '<li class="page-item"><a class="page-link" href="' . $currentUrl . '?' . http_build_query($queryString) . '">' . $pagination['last_page'] . '</a></li>';
    }
    
    // Next page link
    if ($pagination['current_page'] < $pagination['last_page']) {
        $queryString[$queryParam] = $pagination['current_page'] + 1;
        $nextUrl = $currentUrl . '?' . http_build_query($queryString);
        $html .= '<li class="page-item"><a class="page-link" href="' . $nextUrl . '" aria-label="Next"><span aria-hidden="true">&raquo;</span></a></li>';
    } else {
        $html .= '<li class="page-item disabled"><a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a></li>';
    }
    
    $html .= '</ul></nav>';
    
    return $html;
}

/**
 * Get current page URL
 * 
 * @return string Current URL
 */
function getCurrentUrl() {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['REQUEST_URI'];
    
    return $protocol . '://' . $host . $uri;
}

/**
 * Get current page name
 * 
 * @return string Current page name
 */
function getCurrentPage() {
    return basename($_SERVER['PHP_SELF']);
}

/**
 * Check if current page is active
 * 
 * @param string $page Page to check
 * @return bool Is active or not
 */
function isActivePage($page) {
    return strpos($_SERVER['PHP_SELF'], $page) !== false;
}

/**
 * Get threat level name
 * 
 * @param int $level Threat level (1-5)
 * @return string Threat level name
 */
function getThreatLevelName($level) {
    $levels = [
        1 => 'Low',
        2 => 'Guarded',
        3 => 'Elevated',
        4 => 'High',
        5 => 'Critical'
    ];
    
    return $levels[$level] ?? 'Unknown';
}

/**
 * Get threat level color
 * 
 * @param int $level Threat level (1-5)
 * @return string CSS color class
 */
function getThreatLevelColor($level) {
    $colors = [
        1 => 'success',
        2 => 'info',
        3 => 'warning',
        4 => 'orange',
        5 => 'danger'
    ];
    
    return $colors[$level] ?? 'secondary';
}

/**
 * Get file icon by extension
 * 
 * @param string $extension File extension
 * @return string Font Awesome icon class
 */
function getFileIcon($extension) {
    $icons = [
        'pdf' => 'fa-file-pdf',
        'doc' => 'fa-file-word',
        'docx' => 'fa-file-word',
        'xls' => 'fa-file-excel',
        'xlsx' => 'fa-file-excel',
        'ppt' => 'fa-file-powerpoint',
        'pptx' => 'fa-file-powerpoint',
        'txt' => 'fa-file-alt',
        'csv' => 'fa-file-csv',
        'zip' => 'fa-file-archive',
        'rar' => 'fa-file-archive',
        'jpg' => 'fa-file-image',
        'jpeg' => 'fa-file-image',
        'png' => 'fa-file-image',
        'gif' => 'fa-file-image',
        'mp3' => 'fa-file-audio',
        'wav' => 'fa-file-audio',
        'mp4' => 'fa-file-video',
        'avi' => 'fa-file-video',
        'html' => 'fa-file-code',
        'css' => 'fa-file-code',
        'js' => 'fa-file-code',
        'php' => 'fa-file-code'
    ];
    
    return 'fas ' . ($icons[strtolower($extension)] ?? 'fa-file');
}
?>
