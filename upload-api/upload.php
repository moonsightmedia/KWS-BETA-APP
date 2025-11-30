<?php
// upload.php - Chunked Upload Handler
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-File-Name, X-File-Size, X-File-Type, X-Chunk-Number, X-Total-Chunks, X-Upload-Session-Id, X-Sector-Id");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$uploadDir = __DIR__ . '/uploads';
$tempDir = $uploadDir . '/temp';
$finalDir = $uploadDir . '/final';

// Ensure directories exist
if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);
if (!file_exists($tempDir)) mkdir($tempDir, 0777, true);
if (!file_exists($finalDir)) mkdir($finalDir, 0777, true);

// Get headers
$headers = getallheaders();
// Normalize headers to lowercase keys to handle different server configurations
$normalizedHeaders = [];
foreach ($headers as $key => $value) {
    $normalizedHeaders[strtolower($key)] = $value;
}

$sessionId = $normalizedHeaders['x-upload-session-id'] ?? '';
$chunkIndex = isset($normalizedHeaders['x-chunk-number']) ? (int)$normalizedHeaders['x-chunk-number'] : -1;
$totalChunks = isset($normalizedHeaders['x-total-chunks']) ? (int)$normalizedHeaders['x-total-chunks'] : -1;
$fileName = $normalizedHeaders['x-file-name'] ?? 'unknown_file';
$sectorId = $normalizedHeaders['x-sector-id'] ?? 'unknown_sector';

if (empty($sessionId) || $chunkIndex === -1 || $totalChunks === -1) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required headers']);
    exit;
}

// Validate filename securely
$fileName = basename($fileName);
$fileName = preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);

// Create session directory
$sessionDir = $tempDir . '/' . $sessionId;
if (!file_exists($sessionDir)) {
    mkdir($sessionDir, 0777, true);
}

// Save chunk
$chunkFile = $sessionDir . '/part_' . $chunkIndex;

// Read input
$input = fopen("php://input", "r");
// Or check if file is sent as form-data (depending on how frontend sends it)
// If using FormData, use $_FILES['chunk']['tmp_name']
if (isset($_FILES['chunk'])) {
    if (!move_uploaded_file($_FILES['chunk']['tmp_name'], $chunkFile)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save chunk']);
        exit;
    }
} else {
    // Raw body upload
    $fp = fopen($chunkFile, "w");
    if (!$fp) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to open chunk file']);
        exit;
    }
    while ($data = fread($input, 1024)) {
        fwrite($fp, $data);
    }
    fclose($fp);
    fclose($input);
}

// Check if all chunks are uploaded
$allChunksUploaded = true;
for ($i = 0; $i < $totalChunks; $i++) {
    if (!file_exists($sessionDir . '/part_' . $i)) {
        $allChunksUploaded = false;
        break;
    }
}

if ($allChunksUploaded) {
    // Combine chunks
    $finalPath = $finalDir . '/' . $fileName;
    
    // Handle sector subdirectory if needed, or just flat structure
    // Example: uploads/final/sector_123/video.mp4
    if ($sectorId !== 'unknown_sector') {
        $sectorDir = $finalDir . '/' . $sectorId;
        if (!file_exists($sectorDir)) mkdir($sectorDir, 0777, true);
        $finalPath = $sectorDir . '/' . $fileName;
    }

    $fp = fopen($finalPath, 'w');
    for ($i = 0; $i < $totalChunks; $i++) {
        $chunkPath = $sessionDir . '/part_' . $i;
        $chunkContent = file_get_contents($chunkPath);
        fwrite($fp, $chunkContent);
        // Optional: Delete chunk after merging to save space immediately
        // unlink($chunkPath);
    }
    fclose($fp);

    // Cleanup session dir
    // Recursively delete session dir
    array_map('unlink', glob("$sessionDir/*.*"));
    rmdir($sessionDir);

    // Return public URL
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'];
    $basePath = dirname($_SERVER['SCRIPT_NAME']);
    
    // Construct URL correctly
    $relativePath = str_replace($uploadDir, '', $finalPath);
    // Ensure forward slashes
    $relativePath = str_replace('\\', '/', $relativePath);
    // Remove leading slash if present to avoid double slash
    $relativePath = ltrim($relativePath, '/');
    
    $publicUrl = $protocol . $host . $basePath . '/uploads' . '/' . $relativePath;

    echo json_encode([
        'status' => 'completed',
        'url' => $publicUrl,
        'message' => 'Upload finished successfully'
    ]);
} else {
    echo json_encode([
        'status' => 'chunk_uploaded',
        'chunk_index' => $chunkIndex,
        'message' => 'Chunk uploaded successfully'
    ]);
}
?>
