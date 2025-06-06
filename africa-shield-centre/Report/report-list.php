<?php
// Report/report-list.php
session_start();
require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/auth.php';

header('Content-Type: application/json');

$auth = new Auth(new Database());
if (!$auth->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user = $auth->getCurrentUser();
$db = new Database();

$reports = $db->fetchAll("SELECT id, title, description, country, city, status, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC", [$user['id']]);

echo json_encode(['success' => true, 'reports' => $reports]);
