<?php
// Report/feedback-submit.php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once '../includes/config.php';
require_once '../includes/db.php';

$feedback = trim($_POST['feedback'] ?? '');
$rating = intval($_POST['rating'] ?? 0);
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

if (!$feedback || $rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid feedback or rating.']);
    exit;
}

$db = new Database();
$db->insert('feedback', [
    'feedback' => $feedback,
    'rating' => $rating,
    'ip_address' => $ip,
    'created_at' => date('Y-m-d H:i:s')
]);

echo json_encode(['success' => true]);
