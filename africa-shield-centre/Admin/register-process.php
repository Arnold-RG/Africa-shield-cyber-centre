<?php
// Admin/register-process.php
session_start();
require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $first_name = trim($_POST['first_name'] ?? '');
    $last_name = trim($_POST['last_name'] ?? '');
    $username = trim($_POST['username'] ?? '');

    // Basic validation
    if (empty($email) || empty($password) || empty($username)) {
        $_SESSION['register_error'] = 'Please fill in all required fields.';
        header('Location: register.html');
        exit;
    }

    $userData = [
        'email' => $email,
        'password' => $password,
        'username' => $username,
        'first_name' => $first_name,
        'last_name' => $last_name
    ];

    $auth = new Auth(new Database());
    $userId = $auth->register($userData);
    if ($userId) {
        // Optionally log the user in automatically
        $auth->login($email, $password);
        header('Location: ../Dashboard/index.html');
        exit;
    } else {
        $_SESSION['register_error'] = 'Registration failed. Email or username may already be in use.';
        header('Location: register.html');
        exit;
    }
} else {
    header('Location: register.html');
    exit;
}
