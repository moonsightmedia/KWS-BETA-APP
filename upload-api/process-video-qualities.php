<?php
/**
 * Server-side video quality processing
 * 
 * This script processes uploaded videos to create HD, SD, and Low quality versions
 * It should be called after a video is uploaded, either:
 * 1. Automatically via webhook/cron
 * 2. Manually via API call
 * 3. As a background job
 * 
 * Usage: POST to this endpoint with video URL or file path
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Configuration
$uploadDir = __DIR__ . '/uploads';
$finalDir = $uploadDir . '/final';
$tempDir = sys_get_temp_dir() . '/video-processing-' . uniqid();

// Get input
$input = json_decode(file_get_contents('php://input'), true);
$videoUrl = $input['video_url'] ?? null;
$videoPath = $input['video_path'] ?? null;
$sectorId = $input['sector_id'] ?? null;

if (!$videoUrl && !$videoPath) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing video_url or video_path']);
    exit;
}

// Determine file path and extract directory structure
$filePath = null;
$originalDir = null; // Directory where original file is stored (for sectorId subdirectory)

if ($videoPath) {
    $filePath = $videoPath;
    // Extract directory from path
    $originalDir = dirname($filePath);
} else if ($videoUrl) {
    // Extract path from URL
    $parsedUrl = parse_url($videoUrl);
    $path = $parsedUrl['path'] ?? '';
    
    // Try to find file in uploads directory
    $relativePath = str_replace('/upload-api/uploads/', '', $path);
    $relativePath = str_replace('/uploads/', '', $relativePath);
    $relativePath = ltrim($relativePath, '/');
    
    // Check final directory first (where uploads go)
    $testPath = $finalDir . '/' . $relativePath;
    if (file_exists($testPath)) {
        $filePath = $testPath;
        $originalDir = dirname($testPath);
    } else {
        $testPath = $uploadDir . '/' . $relativePath;
        if (file_exists($testPath)) {
            $filePath = $testPath;
            $originalDir = dirname($testPath);
        }
    }
    
    // If sectorId is provided but not in path, use it
    if ($sectorId && $sectorId !== 'unknown_sector' && (!$originalDir || $originalDir === $finalDir)) {
        $originalDir = $finalDir . '/' . $sectorId;
    }
}

if (!$filePath || !file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Video file not found', 'path' => $filePath]);
    exit;
}

// Check if FFmpeg is available
$ffmpegPath = trim(shell_exec('which ffmpeg 2>/dev/null') ?: 'ffmpeg');
$ffmpegCheck = shell_exec("$ffmpegPath -version 2>&1");
if (strpos($ffmpegCheck, 'ffmpeg version') === false) {
    http_response_code(500);
    echo json_encode(['error' => 'FFmpeg is not installed on the server']);
    exit;
}

// Get base filename
$fileName = basename($filePath);
$baseFileName = preg_replace('/\.(mp4|mov|MOV|MP4)$/i', '', $fileName);
$extension = 'mp4';

// Create temp directory
if (!mkdir($tempDir, 0777, true)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create temp directory']);
    exit;
}

try {
    // Quality settings (same as client-side)
    $qualities = [
        'hd' => ['width' => 1920, 'bitrate' => '4000000', 'crf' => 23],
        'sd' => ['width' => 1280, 'bitrate' => '2000000', 'crf' => 24],
        'low' => ['width' => 640, 'bitrate' => '500000', 'crf' => 26],
    ];
    
    $results = [];
    
    foreach ($qualities as $qualityName => $settings) {
        $outputPath = $tempDir . '/' . $baseFileName . '_' . $qualityName . '.mp4';
        
        // Build FFmpeg command
        $cmd = sprintf(
            '%s -i %s -c:v libx264 -preset fast -crf %d -vf scale=%d:-2 -c:a aac -b:a 128k -b:v %s -movflags +faststart -y %s 2>&1',
            escapeshellarg($ffmpegPath),
            escapeshellarg($filePath),
            $settings['crf'],
            $settings['width'],
            $settings['bitrate'],
            escapeshellarg($outputPath)
        );
        
        // Execute FFmpeg
        exec($cmd, $output, $returnCode);
        
        if ($returnCode !== 0 || !file_exists($outputPath)) {
            throw new Exception("Failed to create $qualityName quality: " . implode("\n", $output));
        }
        
        // Upload to final directory (same structure as original)
        $finalFileName = $baseFileName . '_' . $qualityName . '.mp4';
        
        // Use same directory as original file (preserves sectorId subdirectory structure)
        if ($originalDir && $originalDir !== $finalDir && strpos($originalDir, $finalDir) === 0) {
            // Original is in a subdirectory (e.g., final/sectorId/)
            $finalPath = $originalDir . '/' . $finalFileName;
        } else if ($sectorId && $sectorId !== 'unknown_sector') {
            // Use sectorId if provided and originalDir not available
            $sectorDir = $finalDir . '/' . $sectorId;
            if (!file_exists($sectorDir)) {
                mkdir($sectorDir, 0777, true);
            }
            $finalPath = $sectorDir . '/' . $finalFileName;
        } else {
            // Default: root final directory
            $finalPath = $finalDir . '/' . $finalFileName;
        }
        
        if (!copy($outputPath, $finalPath)) {
            throw new Exception("Failed to copy $qualityName quality to final directory");
        }
        
        // Build URL (matching upload.php structure)
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $basePath = dirname($_SERVER['SCRIPT_NAME']);
        
        // Construct relative path matching upload.php structure
        $relativePath = str_replace($uploadDir, '', $finalPath);
        $relativePath = str_replace('\\', '/', $relativePath);
        $relativePath = ltrim($relativePath, '/');
        
        $url = $protocol . $host . $basePath . '/uploads/' . $relativePath;
        
        $results[$qualityName] = [
            'url' => $url,
            'path' => $finalPath,
            'size' => filesize($finalPath),
        ];
    }
    
    // Cleanup temp directory
    array_map('unlink', glob("$tempDir/*"));
    rmdir($tempDir);
    
    echo json_encode([
        'success' => true,
        'qualities' => $results,
        'message' => 'Video qualities created successfully'
    ]);
    
} catch (Exception $e) {
    // Cleanup on error
    if (is_dir($tempDir)) {
        array_map('unlink', glob("$tempDir/*"));
        @rmdir($tempDir);
    }
    
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>

