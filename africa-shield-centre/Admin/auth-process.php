<?php
// Admin/auth-process.php
session_start();
require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $remember = isset($_POST['remember']);

    // Basic validation
    if (empty($email) || empty($password)) {
        $_SESSION['auth_error'] = 'Please enter both email and password.';
        header('Location: auth.html');
        exit;
    }

    $auth = new Auth(new Database());
    if ($auth->login($email, $password, $remember)) {
        // Redirect to dashboard or home
        header('Location: ../Dashboard/index.html');
        exit;
    } else {
        $_SESSION['auth_error'] = 'Invalid email or password.';
        header('Location: auth.html');
        exit;
    }
} else {
    header('Location: auth.html');
    exit;
}