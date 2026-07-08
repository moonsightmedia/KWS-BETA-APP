<?php
// upload-status.php - Check upload status for resume capability
// Replace inherited CORS headers to ensure Authorization is allowed in preflight.
if (function_exists('header_remove')) {
    @header_remove('Access-Control-Allow-Origin');
    @header_remove('Access-Control-Allow-Methods');
    @header_remove('Access-Control-Allow-Headers');
    @header_remove('Access-Control-Expose-Headers');
    @header_remove('Access-Control-Max-Age');
}

header('Content-Type: application/json', true);
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: GET, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Upload-Auth', true);
header('Access-Control-Max-Age: 86400', true);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/auth.php';
require_supabase_user(['admin', 'setter']);

$uploadDir = __DIR__ . '/uploads';
$tempDir = $uploadDir . '/temp';

$sessionId = $_GET['session_id'] ?? '';

if (empty($sessionId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing session_id']);
    exit;
}

$sessionDir = $tempDir . '/' . $sessionId;
$completedStatusPath = $tempDir . '/' . $sessionId . '.completed.json';
$uploadedChunks = [];

if (is_file($completedStatusPath)) {
    $completed = json_decode(file_get_contents($completedStatusPath), true);
    if (is_array($completed) && !empty($completed['url'])) {
        echo json_encode([
            'session_id' => $sessionId,
            'status' => 'completed',
            'url' => $completed['url'],
            'uploaded_chunks' => []
        ]);
        exit;
    }
}

if (is_dir($sessionDir)) {
    $files = scandir($sessionDir);
    foreach ($files as $file) {
        if (strpos($file, 'part_') === 0) {
            $chunkIndex = (int)str_replace('part_', '', $file);
            $uploadedChunks[] = $chunkIndex;
        }
    }
    sort($uploadedChunks);
}

echo json_encode([
    'session_id' => $sessionId,
    'status' => 'uploading',
    'uploaded_chunks' => $uploadedChunks
]);
?>
