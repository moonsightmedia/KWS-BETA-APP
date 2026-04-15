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
$uploadedChunks = [];

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
    'uploaded_chunks' => $uploadedChunks
]);
?>
