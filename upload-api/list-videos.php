<?php
/**
 * API endpoint to list all video files in the uploads directory
 * Returns JSON array of video URLs
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Configuration
$uploadsDir = __DIR__ . '/../uploads/';
$baseUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/';

// Allowed video extensions
$allowedExtensions = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'MOV', 'MP4', 'WEBM', 'AVI', 'MKV'];

// Check if uploads directory exists
if (!is_dir($uploadsDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Uploads directory not found']);
    exit;
}

try {
    $videos = [];
    $files = scandir($uploadsDir);
    
    if ($files === false) {
        throw new Exception('Could not read uploads directory');
    }
    
    foreach ($files as $file) {
        // Skip . and ..
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        $filePath = $uploadsDir . $file;
        
        // Skip directories
        if (is_dir($filePath)) {
            continue;
        }
        
        // Check if file has a video extension
        $extension = pathinfo($file, PATHINFO_EXTENSION);
        if (in_array($extension, $allowedExtensions)) {
            $videoUrl = $baseUrl . urlencode($file);
            $videos[] = $videoUrl;
        }
    }
    
    // Sort alphabetically
    sort($videos);
    
    http_response_code(200);
    echo json_encode($videos);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to list videos',
        'message' => $e->getMessage()
    ]);
}
?>
