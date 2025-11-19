<?php
/**
 * All-Inkl Upload API für Beta-Videos und Sektor-Bilder
 * Unterstützt Chunked Uploads für große Dateien
 */

// Set CORS headers (must be before any output)
// Remove any existing CORS headers first to prevent duplicates from .htaccess or server config
if (function_exists('header_remove')) {
    @header_remove('Access-Control-Allow-Origin');
    @header_remove('Access-Control-Allow-Methods');
    @header_remove('Access-Control-Allow-Headers');
    @header_remove('Access-Control-Expose-Headers');
    @header_remove('Access-Control-Max-Age');
}
// Set headers - the replace parameter (true) will overwrite existing headers
header('Content-Type: application/json', true);
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: POST, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Session-Id, X-Chunk-Number, X-Total-Chunks, X-File-Name, X-File-Size, X-File-Type, X-Sector-Id', true);

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Configuration
// Videos should be stored in the root uploads/ directory, not in upload-api/uploads/
// This allows the .htaccess in uploads/ to set CORS headers
$baseDir = dirname(__DIR__) . '/uploads';
$maxFileSize = 500 * 1024 * 1024; // 500MB (increased to allow larger videos)
$allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];
$allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Get headers
$uploadSessionId = $_SERVER['HTTP_X_UPLOAD_SESSION_ID'] ?? null;
$chunkNumber = isset($_SERVER['HTTP_X_CHUNK_NUMBER']) ? (int)$_SERVER['HTTP_X_CHUNK_NUMBER'] : null;
$totalChunks = isset($_SERVER['HTTP_X_TOTAL_CHUNKS']) ? (int)$_SERVER['HTTP_X_TOTAL_CHUNKS'] : null;
$fileName = $_SERVER['HTTP_X_FILE_NAME'] ?? null;
$fileSize = isset($_SERVER['HTTP_X_FILE_SIZE']) ? (int)$_SERVER['HTTP_X_FILE_SIZE'] : null;
$fileType = $_SERVER['HTTP_X_FILE_TYPE'] ?? null;
$sectorId = $_SERVER['HTTP_X_SECTOR_ID'] ?? null;
$isChunked = $chunkNumber !== null && $totalChunks !== null;

// Validate required headers
if (!$fileName || !$fileType || !$fileSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required headers: X-File-Name, X-File-Type, X-File-Size']);
    exit;
}

// Validate file size
if ($fileSize > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['error' => "File size exceeds maximum of {$maxFileSize} bytes"]);
    exit;
}

// Determine file type and allowed types
$isVideo = strpos($fileType, 'video/') === 0;
$isImage = strpos($fileType, 'image/') === 0;

if (!$isVideo && !$isImage) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only videos and images are allowed.']);
    exit;
}

$allowedTypes = $isVideo ? $allowedVideoTypes : $allowedImageTypes;
if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => "File type not allowed: {$fileType}"]);
    exit;
}

// Create base directory if it doesn't exist
if (!is_dir($baseDir)) {
    mkdir($baseDir, 0755, true);
}

// Generate session ID if not provided (for chunked uploads)
if ($isChunked && !$uploadSessionId) {
    $uploadSessionId = bin2hex(random_bytes(16));
}

// Determine upload directory
// Videos are stored directly in uploads/ (not in uploads/videos/)
// Sector images are stored in uploads/sectors/{sectorId}/
// Thumbnails (images without sectorId) are stored in uploads/thumbnails/
if ($isImage && $sectorId) {
    $uploadDir = $baseDir . '/sectors/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $sectorId);
} elseif ($isImage && !$sectorId) {
    // Thumbnails go to uploads/thumbnails/
    $uploadDir = $baseDir . '/thumbnails';
} else {
    // Store videos directly in uploads/ directory
    $uploadDir = $baseDir;
}

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$fileExt = pathinfo($fileName, PATHINFO_EXTENSION);
$uniqueFileName = ($isChunked && $uploadSessionId) 
    ? $uploadSessionId . '.' . $fileExt
    : bin2hex(random_bytes(16)) . '.' . $fileExt;

$filePath = $uploadDir . '/' . $uniqueFileName;
$tempFilePath = $filePath . '.tmp';

// Handle chunked upload
if ($isChunked) {
    // Validate chunk parameters
    if ($chunkNumber < 0 || $chunkNumber >= $totalChunks) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid chunk number']);
        exit;
    }

    // Get uploaded file
    if (!isset($_FILES['chunk']) || $_FILES['chunk']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded or upload error']);
        exit;
    }

    $chunkFile = $_FILES['chunk']['tmp_name'];
    
    // Append chunk to temp file
    $chunkData = file_get_contents($chunkFile);
    if ($chunkData === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to read chunk data']);
        exit;
    }

    // Open temp file in append mode
    $handle = fopen($tempFilePath, $chunkNumber === 0 ? 'wb' : 'ab');
    if ($handle === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to open temp file']);
        exit;
    }

    fwrite($handle, $chunkData);
    fclose($handle);

    // If this is the last chunk, finalize the upload
    if ($chunkNumber === $totalChunks - 1) {
        // Verify file size
        $finalSize = filesize($tempFilePath);
        if ($finalSize !== $fileSize) {
            @unlink($tempFilePath);
            http_response_code(400);
            echo json_encode(['error' => 'File size mismatch']);
            exit;
        }

        // Move temp file to final location
        if (!rename($tempFilePath, $filePath)) {
            @unlink($tempFilePath);
            http_response_code(500);
            echo json_encode(['error' => 'Failed to finalize upload']);
            exit;
        }

        // Generate public URL
        // Videos are directly in uploads/, sector images in uploads/sectors/{sectorId}/
        // Thumbnails are in uploads/thumbnails/
        if ($isImage && $sectorId) {
            $publicUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/sectors/' . 
                        preg_replace('/[^a-zA-Z0-9_-]/', '', $sectorId) . '/' . $uniqueFileName;
        } elseif ($isImage && !$sectorId) {
            // Thumbnails
            $publicUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/thumbnails/' . $uniqueFileName;
        } else {
            // Videos are directly in uploads/
            $publicUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/' . $uniqueFileName;
        }

        echo json_encode([
            'success' => true,
            'url' => $publicUrl,
            'fileName' => $uniqueFileName,
            'fileSize' => $finalSize,
            'sessionId' => $uploadSessionId
        ]);
    } else {
        // Return session ID for next chunk
        echo json_encode([
            'success' => true,
            'sessionId' => $uploadSessionId,
            'chunkNumber' => $chunkNumber,
            'totalChunks' => $totalChunks,
            'message' => 'Chunk uploaded successfully'
        ]);
    }
} else {
    // Handle single file upload (non-chunked)
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded or upload error']);
        exit;
    }

    $uploadedFile = $_FILES['file']['tmp_name'];
    
    // Verify file size
    if (filesize($uploadedFile) !== $fileSize) {
        http_response_code(400);
        echo json_encode(['error' => 'File size mismatch']);
        exit;
    }

    // Move uploaded file
    if (!move_uploaded_file($uploadedFile, $filePath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
        exit;
    }

    // Generate public URL
    // Videos are directly in uploads/, sector images in uploads/sectors/{sectorId}/
    // Thumbnails are in uploads/thumbnails/
    if ($isImage && $sectorId) {
        $publicUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/sectors/' . 
                    preg_replace('/[^a-zA-Z0-9_-]/', '', $sectorId) . '/' . $uniqueFileName;
    } elseif ($isImage && !$sectorId) {
        // Thumbnails
        $publicUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/thumbnails/' . $uniqueFileName;
    } else {
        // Videos are directly in uploads/
        $publicUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/' . $uniqueFileName;
    }

    echo json_encode([
        'success' => true,
        'url' => $publicUrl,
        'fileName' => $uniqueFileName,
        'fileSize' => filesize($filePath)
    ]);
}
?>

