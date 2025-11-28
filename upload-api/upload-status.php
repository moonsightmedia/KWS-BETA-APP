<?php
// upload-status.php - Check upload status for resume capability
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

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
