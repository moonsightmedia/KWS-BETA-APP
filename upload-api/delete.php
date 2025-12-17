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

// Remove double slashes and normalize path
$relativePath = preg_replace('#/+#', '/', $relativePath);
$relativePath = ltrim($relativePath, '/');

// Construct file path - use absolute path to avoid issues
// Videos are stored directly in uploads/ (parent directory)
$uploadsDir = dirname(__DIR__) . '/uploads';
// Also check upload-api/uploads/ (alternative location)
$uploadApiUploadsDir = __DIR__ . '/uploads';

// Security: Prevent directory traversal
$baseDir = realpath($uploadsDir);
$uploadApiBaseDir = is_dir($uploadApiUploadsDir) ? realpath($uploadApiUploadsDir) : null;

if (!$baseDir && !$uploadApiBaseDir) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error', 'debug' => 'uploads directory not found']);
    exit;
}

// Normalize the relative path to prevent directory traversal
// Remove directory traversal attempts (..) but keep valid dots in filenames
// Only remove '..' if it's a directory traversal pattern, not part of filename
$normalizedRelative = preg_replace('#\.\./#', '', $relativePath); // Remove ../ patterns
$normalizedRelative = preg_replace('#/\.\.#', '', $normalizedRelative); // Remove /.. patterns
$normalizedRelative = preg_replace('#^\.\.#', '', $normalizedRelative); // Remove leading ..
$normalizedRelative = preg_replace('#\./\.#', '', $normalizedRelative); // Remove ./ patterns
$normalizedRelative = ltrim($normalizedRelative, '/');

// Try both possible locations
$filePath = null;
$baseDirToUse = null;

if ($baseDir) {
    $testPath = $baseDir . '/' . $normalizedRelative;
    if (file_exists($testPath)) {
        $filePath = $testPath;
        $baseDirToUse = $baseDir;
    }
}

if (!$filePath && $uploadApiBaseDir) {
    $testPath = $uploadApiBaseDir . '/' . $normalizedRelative;
    if (file_exists($testPath)) {
        $filePath = $testPath;
        $baseDirToUse = $uploadApiBaseDir;
    }
}

// If file not found in either location, try recursive search
if (!$filePath) {
    $filename = basename($normalizedRelative);
    
    // Function to recursively search for file
    $searchInDir = function($dir, $searchFilename) use (&$searchInDir) {
        if (!is_dir($dir)) return null;
        
        $files = scandir($dir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $filePath = $dir . '/' . $file;
            
            if (is_dir($filePath)) {
                // Recursively search in subdirectories
                $found = $searchInDir($filePath, $searchFilename);
                if ($found) return $found;
            } else if ($file === $searchFilename) {
                return $filePath;
            }
        }
        return null;
    };
    
    // Try recursive search in both directories
    if ($baseDir) {
        $found = $searchInDir($baseDir, $filename);
        if ($found) {
            $filePath = $found;
            $baseDirToUse = $baseDir;
        }
    }
    
    if (!$filePath && $uploadApiBaseDir) {
        $found = $searchInDir($uploadApiBaseDir, $filename);
        if ($found) {
            $filePath = $found;
            $baseDirToUse = $uploadApiBaseDir;
        }
    }
}

// Final security check: ensure the normalized path is still within base directory
if ($filePath && $baseDirToUse) {
    $realFilePath = realpath($filePath);
    $realBaseDir = realpath($baseDirToUse);
    
    if ($realFilePath && $realBaseDir) {
        // Check if file path is within base directory
        if (strpos($realFilePath, $realBaseDir) !== 0) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied', 'debug' => 'Path traversal detected', 'filePath' => $realFilePath, 'baseDir' => $realBaseDir]);
            exit;
        }
    } else if (!$realFilePath) {
        // File doesn't exist, but that's OK (idempotent)
        // Don't treat as error, just return success
    }
}

// Also check the directory of the file (in case file doesn't exist)
if ($filePath && $baseDirToUse) {
    $fileDir = dirname($filePath);
    $realFileDir = realpath($fileDir);
    $realBaseDir = realpath($baseDirToUse);
    
    if ($realFileDir && $realBaseDir && strpos($realFileDir, $realBaseDir) !== 0) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied', 'debug' => 'Directory path traversal detected', 'fileDir' => $realFileDir, 'baseDir' => $realBaseDir]);
        exit;
    }
}

// Check if file exists
if (!$filePath || !file_exists($filePath)) {
    // File doesn't exist - return success anyway (idempotent)
    // But log for debugging
    error_log("Delete API: File not found - URL: $fileUrl, Path: " . ($filePath ?? 'null') . ", Relative: $normalizedRelative");
    echo json_encode([
        'success' => true,
        'message' => 'File not found (already deleted or never existed)',
        'debug' => [
            'url' => $fileUrl,
            'relativePath' => $normalizedRelative,
            'searchedPaths' => [
                $baseDir ? $baseDir . '/' . $normalizedRelative : null,
                $uploadApiBaseDir ? $uploadApiBaseDir . '/' . $normalizedRelative : null,
            ]
        ]
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

