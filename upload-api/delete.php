<?php
/**
 * All-Inkl Delete API für Beta-Videos und Sektor-Bilder
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
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type', true);

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST and DELETE requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get request body
$input = json_decode(file_get_contents('php://input'), true);
$fileUrl = $input['url'] ?? null;

if (!$fileUrl) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing file URL']);
    exit;
}

// Extract file path from URL
// Expected formats:
// - https://cdn.kletterwelt-sauerland.de/uploads/filename.ext (videos)
// - https://cdn.kletterwelt-sauerland.de/uploads/sectors/sectorId/filename.ext (images)
// - https://cdn.kletterwelt-sauerland.de/uploads/videos/filename.ext (legacy format)
// - https://cdn.kletterwelt-sauerland.de/upload-api/uploads/final/sectorId/filename.ext (thumbnails)
// - https://cdn.kletterwelt-sauerland.de/upload-api/uploads/final/filename.ext (thumbnails)

// Check for upload-api format first (newer format)
if (strpos($fileUrl, 'https://cdn.kletterwelt-sauerland.de/upload-api/uploads/') === 0) {
    // Extract path after /upload-api/uploads/
    $relativePath = substr($fileUrl, strlen('https://cdn.kletterwelt-sauerland.de/upload-api/uploads/'));
    // Remove 'final/' prefix if present
    if (strpos($relativePath, 'final/') === 0) {
        $relativePath = substr($relativePath, 6); // Remove "final/" prefix
    }
} else if (strpos($fileUrl, 'https://cdn.kletterwelt-sauerland.de/uploads/') === 0) {
    // Legacy format: direct uploads/
    $relativePath = substr($fileUrl, strlen('https://cdn.kletterwelt-sauerland.de/uploads/'));
    // Remove /videos/ prefix if present (legacy format)
    if (strpos($relativePath, 'videos/') === 0) {
        $relativePath = substr($relativePath, 7); // Remove "videos/" prefix
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file URL', 'debug' => 'URL must start with https://cdn.kletterwelt-sauerland.de/uploads/ or https://cdn.kletterwelt-sauerland.de/upload-api/uploads/']);
    exit;
}

// Construct file path - use absolute path to avoid issues
$uploadsDir = dirname(__DIR__) . '/uploads';
$filePath = $uploadsDir . '/' . $relativePath;

// Security: Prevent directory traversal
$baseDir = realpath($uploadsDir);
if (!$baseDir) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error', 'debug' => 'uploads directory not found: ' . $uploadsDir]);
    exit;
}

// Normalize the relative path to prevent directory traversal
// Remove any '..' or '.' components
$normalizedRelative = str_replace('..', '', $relativePath);
$normalizedRelative = str_replace('./', '', $normalizedRelative);
$normalizedRelative = ltrim($normalizedRelative, '/');

// Reconstruct file path with normalized relative path
$filePath = $baseDir . '/' . $normalizedRelative;

// Final security check: ensure the normalized path is still within base directory
$realFilePath = realpath($filePath);
if ($realFilePath && strpos($realFilePath, $baseDir) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied', 'debug' => 'Path traversal detected']);
    exit;
}

// Also check the directory of the file (in case file doesn't exist)
$fileDir = dirname($filePath);
$realFileDir = realpath($fileDir);
if ($realFileDir && strpos($realFileDir, $baseDir) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied', 'debug' => 'Directory path traversal detected']);
    exit;
}

// Check if file exists
if (!file_exists($filePath)) {
    // File doesn't exist - return success anyway (idempotent)
    echo json_encode([
        'success' => true,
        'message' => 'File not found (already deleted or never existed)'
    ]);
    exit;
}

// Delete file
if (unlink($filePath)) {
    echo json_encode([
        'success' => true,
        'message' => 'File deleted successfully'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete file']);
}
?>

