<?php
/**
 * Video Proxy with CORS Headers
 * This script serves videos with proper CORS headers
 * Usage: https://cdn.kletterwelt-sauerland.de/upload-api/video-proxy.php?file=filename.ext
 */

// Set CORS headers (must be before any output)
// Use header_remove() to prevent duplicate headers from .htaccess
if (function_exists('header_remove')) {
    header_remove('Access-Control-Allow-Origin');
    header_remove('Access-Control-Allow-Methods');
    header_remove('Access-Control-Allow-Headers');
}
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS', true);
header('Access-Control-Allow-Headers: Range, Content-Type', true);
header('Access-Control-Expose-Headers: Content-Length, Content-Range', true);

// Handle OPTIONS request (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Max-Age: 3600');
    http_response_code(200);
    exit;
}

// Get file parameter
$fileName = $_GET['file'] ?? '';

if (empty($fileName)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing file parameter']);
    exit;
}

// Security: Only allow alphanumeric, dash, underscore, and dot
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $fileName)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file name']);
    exit;
}

// Get file path
$baseDir = dirname(__DIR__) . '/uploads';
$filePath = $baseDir . '/' . $fileName;

// Security: Prevent directory traversal
$realPath = realpath($filePath);
$realBaseDir = realpath($baseDir);

if (!$realPath || !$realBaseDir || strpos($realPath, $realBaseDir) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit;
}

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

// Get file info
$fileSize = filesize($filePath);
$mimeType = mime_content_type($filePath);

// Set headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . $fileSize);
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=604800'); // 7 days instead of 1 year

// Handle range requests (for video seeking)
$range = $_SERVER['HTTP_RANGE'] ?? '';
if ($range) {
    // Parse range header
    if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
        $start = intval($matches[1]);
        $end = $matches[2] ? intval($matches[2]) : $fileSize - 1;
        
        if ($start > $end || $start < 0 || $end >= $fileSize) {
            http_response_code(416);
            header('Content-Range: bytes */' . $fileSize);
            exit;
        }
        
        $length = $end - $start + 1;
        
        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $fileSize);
        header('Content-Length: ' . $length);
        
        // Open file and seek to start position
        $file = fopen($filePath, 'rb');
        fseek($file, $start);
        
        // Output chunk
        $remaining = $length;
        $chunkSize = 8192;
        while ($remaining > 0 && !feof($file)) {
            $read = min($chunkSize, $remaining);
            echo fread($file, $read);
            $remaining -= $read;
            flush();
        }
        fclose($file);
        exit;
    }
}

// Output full file
readfile($filePath);
?>

