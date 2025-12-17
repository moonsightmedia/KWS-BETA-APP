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
// Videos are stored directly in uploads/ (parent directory)
$parentUploadsDir = __DIR__ . '/../uploads/';
$baseUrl = 'https://cdn.kletterwelt-sauerland.de/uploads/';

// Also check upload-api/uploads/ (alternative location)
$uploadApiUploadsDir = __DIR__ . '/uploads/';
$uploadApiBaseUrl = 'https://cdn.kletterwelt-sauerland.de/upload-api/uploads/';

// Final directory (if it exists)
$finalDir = $parentUploadsDir . 'final/';
$uploadApiFinalDir = $uploadApiUploadsDir . 'final/';

// Allowed video extensions
$allowedExtensions = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'MOV', 'MP4', 'WEBM', 'AVI', 'MKV'];

// Debug mode (add ?debug=1 to URL)
$debugMode = isset($_GET['debug']) && $_GET['debug'] == '1';
$debugInfo = [
    'scannedDirs' => [],
    'foundVideos' => [],
    'errors' => [],
    'filesInDir' => []
];

// Check if uploads directory exists
if (!is_dir($parentUploadsDir) && !is_dir($uploadApiUploadsDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Uploads directory not found', 'paths' => [$parentUploadsDir, $uploadApiUploadsDir]]);
    exit;
}

if ($debugMode) {
    $debugInfo['parentUploadsDir'] = $parentUploadsDir;
    $debugInfo['parentUploadsDirExists'] = is_dir($parentUploadsDir);
    $debugInfo['parentUploadsDirReadable'] = is_dir($parentUploadsDir) ? is_readable($parentUploadsDir) : false;
    $debugInfo['uploadApiUploadsDir'] = $uploadApiUploadsDir;
    $debugInfo['uploadApiUploadsDirExists'] = is_dir($uploadApiUploadsDir);
    $debugInfo['uploadApiUploadsDirReadable'] = is_dir($uploadApiUploadsDir) ? is_readable($uploadApiUploadsDir) : false;
}

/**
 * Recursively scan directory for video files
 */
function scanDirectoryRecursive($dir, $baseDir, $baseUrl, $allowedExtensions, $debugMode = false, &$debugInfo = []) {
    $videos = [];
    
    if (!is_dir($dir)) {
        if ($debugMode) {
            $debugInfo['errors'][] = "Directory does not exist: $dir";
        }
        return $videos;
    }
    
    $files = scandir($dir);
    if ($files === false) {
        if ($debugMode) {
            $debugInfo['errors'][] = "Could not scan directory: $dir";
        }
        return $videos;
    }
    
    if ($debugMode) {
        $debugInfo['scannedDirs'][] = $dir;
        $debugInfo['filesInDir'][$dir] = count($files);
    }
    
    foreach ($files as $file) {
        // Skip . and ..
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        $filePath = $dir . '/' . $file;
        
        if (is_dir($filePath)) {
            // Recursively scan subdirectories
            $subVideos = scanDirectoryRecursive($filePath, $baseDir, $baseUrl, $allowedExtensions, $debugMode, $debugInfo);
            $videos = array_merge($videos, $subVideos);
        } else {
            // Check if file has a video extension
            $extension = pathinfo($file, PATHINFO_EXTENSION);
            if (in_array($extension, $allowedExtensions)) {
                // Get relative path from base directory
                $relativePath = str_replace($baseDir, '', $filePath);
                $relativePath = ltrim($relativePath, '/\\');
                
                // Remove double slashes
                $relativePath = preg_replace('#/+#', '/', $relativePath);
                
                // Build URL with proper path structure
                // Keep final/ in path for upload-api/uploads/final/ structure
                $videoUrl = $baseUrl . str_replace('\\', '/', $relativePath);
                
                // Only add if not already in array (prevent duplicates)
                if (!in_array($videoUrl, $videos)) {
                    $videos[] = $videoUrl;
                }
                
                if ($debugMode) {
                    $debugInfo['foundVideos'][] = [
                        'file' => $file,
                        'path' => $filePath,
                        'relativePath' => $relativePath,
                        'url' => $videoUrl
                    ];
                }
            }
        }
    }
    
    return $videos;
}

try {
    $videos = [];
    
    // Scan parent uploads directory (where videos are actually stored - main location)
    if (is_dir($parentUploadsDir)) {
        $parentVideos = scanDirectoryRecursive($parentUploadsDir, $parentUploadsDir, $baseUrl, $allowedExtensions, $debugMode, $debugInfo);
        foreach ($parentVideos as $video) {
            if (!in_array($video, $videos)) {
                $videos[] = $video;
            }
        }
    }
    
    // Also check upload-api/uploads directory (alternative location)
    if (is_dir($uploadApiUploadsDir)) {
        $uploadApiVideos = scanDirectoryRecursive($uploadApiUploadsDir, $uploadApiUploadsDir, $uploadApiBaseUrl, $allowedExtensions, $debugMode, $debugInfo);
        foreach ($uploadApiVideos as $video) {
            if (!in_array($video, $videos)) {
                $videos[] = $video;
            }
        }
    }
    
    // Check final directories if they exist
    if (is_dir($finalDir)) {
        if ($debugMode) {
            $debugInfo['finalDirExists'] = true;
            $debugInfo['finalDirPath'] = $finalDir;
        }
        $finalVideos = scanDirectoryRecursive($finalDir, $parentUploadsDir, $baseUrl, $allowedExtensions, $debugMode, $debugInfo);
        foreach ($finalVideos as $video) {
            if (!in_array($video, $videos)) {
                $videos[] = $video;
            }
        }
    }
    
    if (is_dir($uploadApiFinalDir)) {
        if ($debugMode) {
            $debugInfo['uploadApiFinalDirExists'] = true;
            $debugInfo['uploadApiFinalDirPath'] = $uploadApiFinalDir;
        }
        $uploadApiFinalVideos = scanDirectoryRecursive($uploadApiFinalDir, $uploadApiUploadsDir, $uploadApiBaseUrl, $allowedExtensions, $debugMode, $debugInfo);
        foreach ($uploadApiFinalVideos as $video) {
            if (!in_array($video, $videos)) {
                $videos[] = $video;
            }
        }
    }
    
    // Sort alphabetically
    sort($videos);
    
    if ($debugMode) {
        $debugInfo['totalVideos'] = count($videos);
        $debugInfo['videos'] = array_values($videos); // Re-index array
        http_response_code(200);
        echo json_encode($debugInfo, JSON_PRETTY_PRINT);
    } else {
        http_response_code(200);
        echo json_encode(array_values($videos)); // Re-index array
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to list videos',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
