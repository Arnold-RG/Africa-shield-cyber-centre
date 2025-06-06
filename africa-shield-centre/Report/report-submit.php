<?php
// Report/report-submit.php
session_start();
require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$auth = new Auth(new Database());
if (!$auth->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user = $auth->getCurrentUser();

// Collect and sanitize input
data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$title = trim($data['title'] ?? '');
$description = trim($data['description'] ?? '');
$country = trim($data['country'] ?? '');
$city = trim($data['city'] ?? '');
$threat_type = trim($data['threat_type'] ?? '');
$evidence_files = '';

if (!$title || !$description || !$country || !$threat_type) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$db = new Database();
$reportId = $db->insert('reports', [
    'user_id' => $user['id'],
    'report_type_id' => 1, // You may want to map threat_type to report_type_id
    'title' => $title,
    'description' => $description,
    'country' => $country,
    'city' => $city,
    'evidence_files' => $evidence_files,
    'status' => 'pending',
    'is_anonymous' => 0,
    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
    'created_at' => date('Y-m-d H:i:s'),
    'updated_at' => date('Y-m-d H:i:s')
]);

if ($reportId) {
    echo json_encode(['success' => true, 'report_id' => $reportId]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to submit report']);
}
