/**
 * Script to convert CDN videos to multi-quality versions
 * 
 * This script:
 * 1. Lists all videos from the CDN
 * 2. Finds videos without quality suffixes (_hd, _sd, _low)
 * 3. Downloads and converts them to HD, SD, and Low quality
 * 4. Uploads all 3 qualities to CDN
 * 
 * Usage: node scripts/convert-cdn-videos-to-multi-quality.js
 * 
 * Requirements:
 * - FFmpeg must be installed and available in PATH
 * - node-fetch and form-data packages
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';

// Temporary directory for processing
const TEMP_DIR = join(__dirname, '../temp-video-processing');
if (!existsSync(TEMP_DIR)) {
  const { mkdirSync } = await import('fs');
  mkdirSync(TEMP_DIR, { recursive: true });
}

// Store FFmpeg path
let FFMPEG_PATH = 'ffmpeg';

/**
 * Find FFmpeg executable
 */
async function findFFmpeg() {
  const possiblePaths = [
    'ffmpeg', // In PATH
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\tools\\ffmpeg\\bin\\ffmpeg.exe',
    process.env.FFMPEG_PATH, // Custom path from environment
  ];

  // Also check common installation locations
  if (process.platform === 'win32') {
    const commonPaths = [
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\Git\\usr\\bin\\ffmpeg.exe',
      join(process.env.USERPROFILE || '', 'ffmpeg\\bin\\ffmpeg.exe'),
      join(process.env.LOCALAPPDATA || '', 'ffmpeg\\bin\\ffmpeg.exe'),
    ];
    possiblePaths.push(...commonPaths);
  }

  console.log('🔍 Searching for FFmpeg...');
  
  for (const path of possiblePaths) {
    if (!path) continue;
    
    try {
      // Try to execute ffmpeg with version flag
      // For paths with spaces, we need to quote them
      let testPath = path;
      if (path !== 'ffmpeg' && path.includes(' ')) {
        testPath = `"${path}"`;
      }
      await execAsync(`${testPath} -version`);
      FFMPEG_PATH = path;
      console.log(`✅ Found FFmpeg at: ${FFMPEG_PATH}`);
      return true;
    } catch (error) {
      // Continue searching
    }
  }
  
  return false;
}

/**
 * Try to install FFmpeg using winget
 */
async function installFFmpegWithWinget() {
  if (process.platform !== 'win32') {
    return false;
  }
  
  try {
    console.log('📦 Attempting to install FFmpeg using winget...');
    console.log('   This may take a few minutes...');
    await execAsync('winget install -e --id Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements');
    
    // Wait a moment for installation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find it again
    return await findFFmpeg();
  } catch (error) {
    console.error('   Failed to install FFmpeg automatically');
    return false;
  }
}

/**
 * Check if FFmpeg is available
 */
async function checkFFmpeg() {
  const found = await findFFmpeg();
  if (!found) {
    console.error('❌ FFmpeg is not installed or not in PATH');
    console.log('\n💡 Options:');
    console.log('   1. Install FFmpeg automatically using winget (recommended)');
    console.log('   2. Install manually from https://ffmpeg.org/download.html');
    console.log('   3. Set FFMPEG_PATH environment variable to the full path of ffmpeg.exe');
    console.log('\n   Trying automatic installation...\n');
    
    const installed = await installFFmpegWithWinget();
    if (!installed) {
      console.error('\n❌ Could not install FFmpeg automatically.');
      console.error('   Please install FFmpeg manually or set FFMPEG_PATH environment variable.');
      return false;
    }
  }
  return true;
}

/**
 * Get all video URLs from the CDN
 */
async function getCdnVideoUrls() {
  console.log('📂 Fetching video URLs from CDN...');
  
  try {
    const response = await fetch(`${ALLINKL_API_URL}/list-videos.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch videos from CDN: ${response.status} ${response.statusText}`);
    }

    const videoUrls = await response.json();
    
    if (!Array.isArray(videoUrls)) {
      throw new Error('Invalid response format from CDN API');
    }

    console.log(`✅ Found ${videoUrls.length} videos in CDN`);
    return videoUrls;
  } catch (error) {
    console.error(`❌ Could not fetch from CDN: ${error.message}`);
    throw error;
  }
}

/**
 * Get filename from URL
 */
function getFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop();
    return decodeURIComponent(fileName);
  } catch {
    return url.split('/').pop();
  }
}

/**
 * Get base filename without extension and quality suffix
 */
function getBaseFileName(fileName) {
  return fileName
    .replace(/_hd\.mp4$/, '')
    .replace(/_sd\.mp4$/, '')
    .replace(/_low\.mp4$/, '')
    .replace(/\.mp4$/, '')
    .replace(/\.mov$/, '')
    .replace(/\.MOV$/, '')
    .replace(/\.MP4$/, '');
}

/**
 * Check if video has quality suffix
 */
function hasQualitySuffix(fileName) {
  return fileName.includes('_hd.mp4') || 
         fileName.includes('_sd.mp4') || 
         fileName.includes('_low.mp4');
}

/**
 * Download video from CDN
 */
async function downloadVideoFromCdn(videoUrl) {
  try {
    console.log(`  📥 Downloading from CDN: ${videoUrl}`);
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`  ✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    return buffer;
  } catch (error) {
    console.error(`  ❌ Download failed:`, error.message);
    throw error;
  }
}

/**
 * Create multiple quality versions using FFmpeg
 */
async function createMultiQualityVersions(inputBuffer, baseFileName) {
  const inputPath = join(TEMP_DIR, `input_${baseFileName}`);
  const hdPath = join(TEMP_DIR, `${baseFileName}_hd.mp4`);
  const sdPath = join(TEMP_DIR, `${baseFileName}_sd.mp4`);
  const lowPath = join(TEMP_DIR, `${baseFileName}_low.mp4`);

  try {
    // Write input file
    writeFileSync(inputPath, inputBuffer);
    console.log(`  🎬 Creating quality versions...`);

    // Quality settings
    const qualitySettings = [
      { name: 'hd', path: hdPath, width: 1920, bitrate: '4000000', crf: 23 },
      { name: 'sd', path: sdPath, width: 1280, bitrate: '2000000', crf: 24 },
      { name: 'low', path: lowPath, width: 640, bitrate: '500000', crf: 26 },
    ];

    const results = {};

    // Process each quality
    for (const quality of qualitySettings) {
      const args = [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', quality.crf.toString(),
        '-vf', `scale=${quality.width}:-2`, // Maintain aspect ratio
        '-c:a', 'aac',
        '-b:a', '128k',
        '-b:v', quality.bitrate,
        '-movflags', '+faststart',
        '-y', // Overwrite output
        quality.path,
      ];

      console.log(`    Creating ${quality.name} quality...`);
      // Escape paths with spaces for Windows
      const escapedArgs = args.map(arg => {
        if (arg.includes(' ') && !arg.startsWith('-')) {
          return `"${arg}"`;
        }
        return arg;
      });
      // Use FFMPEG_PATH and escape it if it contains spaces
      const ffmpegCmd = FFMPEG_PATH.includes(' ') ? `"${FFMPEG_PATH}"` : FFMPEG_PATH;
      await execAsync(`${ffmpegCmd} ${escapedArgs.join(' ')}`);
      
      const stats = await import('fs').then(fs => fs.promises.stat(quality.path));
      results[quality.name] = {
        path: quality.path,
        size: stats.size,
      };
      console.log(`    ✅ ${quality.name}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }

    return results;
  } finally {
    // Clean up input file
    if (existsSync(inputPath)) {
      unlinkSync(inputPath);
    }
  }
}

/**
 * Upload video to All-Inkl using chunked upload
 */
async function uploadVideoToAllInkl(videoBuffer, fileName) {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(videoBuffer.length / chunkSize);
  const useChunked = totalChunks > 1;
  const uploadSessionId = useChunked ? randomUUID() : null;
  
  if (useChunked) {
    // Chunked upload for large files
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, videoBuffer.length);
      const chunk = videoBuffer.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk, {
        filename: fileName,
        contentType: 'video/mp4',
      });
      
      const headers = formData.getHeaders();
      headers['X-File-Name'] = fileName;
      headers['X-File-Size'] = videoBuffer.length.toString();
      headers['X-File-Type'] = 'video/mp4';
      headers['X-Chunk-Number'] = i.toString();
      headers['X-Total-Chunks'] = totalChunks.toString();
      
      if (uploadSessionId) {
        headers['X-Upload-Session-Id'] = uploadSessionId;
      }
      
      const response = await fetch(`${ALLINKL_API_URL}/upload.php`, {
        method: 'POST',
        body: formData,
        headers: headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chunk upload failed: ${response.status} ${errorText}`);
      }
      
      // If this is the last chunk, get the URL from response
      if (i === totalChunks - 1) {
        const result = await response.json();
        if (result.url) {
          return result.url;
        }
        // If no URL in response, try status endpoint
        const statusResponse = await fetch(`${ALLINKL_API_URL}/upload-status.php?session_id=${uploadSessionId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.url) {
            return statusData.url;
          }
        }
        throw new Error('Upload completed but no URL returned');
      }
    }
  } else {
    // Single chunk upload
    const singleSessionId = randomUUID();
    const formData = new FormData();
    formData.append('chunk', videoBuffer, {
      filename: fileName,
      contentType: 'video/mp4',
    });
    
    const headers = formData.getHeaders();
    headers['X-File-Name'] = fileName;
    headers['X-File-Size'] = videoBuffer.length.toString();
    headers['X-File-Type'] = 'video/mp4';
    headers['X-Chunk-Number'] = '0';
    headers['X-Total-Chunks'] = '1';
    headers['X-Upload-Session-Id'] = singleSessionId;
    
    const response = await fetch(`${ALLINKL_API_URL}/upload.php`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.url;
  }
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles() {
  try {
    if (existsSync(TEMP_DIR)) {
      const files = readdirSync(TEMP_DIR);
      let cleanedCount = 0;
      files.forEach(file => {
        const filePath = join(TEMP_DIR, file);
        try {
          unlinkSync(filePath);
          cleanedCount++;
        } catch (err) {
          // Ignore errors when deleting
        }
      });
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old temporary file(s)\n`);
      }
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

/**
 * Main conversion function
 */
async function convertCdnVideos() {
  console.log('🚀 Starting CDN video conversion to multi-quality...\n');

  // Clean up old temporary files first
  cleanupTempFiles();

  // Check FFmpeg
  if (!(await checkFFmpeg())) {
    process.exit(1);
  }

  // Get all videos from CDN
  const allVideos = await getCdnVideoUrls();
  
  // Find videos without quality suffixes
  const videosToConvert = [];
  const videoGroups = new Map();

  allVideos.forEach(videoUrl => {
    const fileName = getFileNameFromUrl(videoUrl);
    const baseFileName = getBaseFileName(fileName);
    
    if (!hasQualitySuffix(fileName)) {
      // This is a video without quality suffix - needs conversion
      if (!videoGroups.has(baseFileName)) {
        videoGroups.set(baseFileName, {
          baseFileName,
          originalUrl: videoUrl,
          fileName,
        });
        videosToConvert.push(videoGroups.get(baseFileName));
      }
    }
  });

  if (videosToConvert.length === 0) {
    console.log('✅ No videos found that need conversion (all videos already have quality suffixes)');
    return;
  }

  console.log(`📊 Found ${videosToConvert.length} video(s) to convert\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < videosToConvert.length; i++) {
    const video = videosToConvert[i];
    console.log(`\n[${i + 1}/${videosToConvert.length}] Processing: ${video.fileName}`);
    console.log(`  URL: ${video.originalUrl}`);

    try {
      // Download original video
      const videoBuffer = await downloadVideoFromCdn(video.originalUrl);
      
      // Create quality versions
      const qualityFiles = await createMultiQualityVersions(videoBuffer, video.baseFileName);
      
      // Upload quality versions
      const videoUrls = {};
      const filesToCleanup = [];

      try {
        console.log(`  📤 Uploading quality versions...`);
        
        // Upload HD
        const hdBuffer = readFileSync(qualityFiles.hd.path);
        const hdFileName = `${video.baseFileName}_hd.mp4`;
        videoUrls.hd = await uploadVideoToAllInkl(hdBuffer, hdFileName);
        console.log(`    ✅ HD: ${videoUrls.hd}`);
        filesToCleanup.push(qualityFiles.hd.path);
        
        // Upload SD
        const sdBuffer = readFileSync(qualityFiles.sd.path);
        const sdFileName = `${video.baseFileName}_sd.mp4`;
        videoUrls.sd = await uploadVideoToAllInkl(sdBuffer, sdFileName);
        console.log(`    ✅ SD: ${videoUrls.sd}`);
        filesToCleanup.push(qualityFiles.sd.path);
        
        // Upload Low
        const lowBuffer = readFileSync(qualityFiles.low.path);
        const lowFileName = `${video.baseFileName}_low.mp4`;
        videoUrls.low = await uploadVideoToAllInkl(lowBuffer, lowFileName);
        console.log(`    ✅ Low: ${videoUrls.low}`);
        filesToCleanup.push(qualityFiles.low.path);
      } finally {
        // Always clean up temporary files
        filesToCleanup.forEach(filePath => {
          try {
            if (filePath && existsSync(filePath)) {
              unlinkSync(filePath);
            }
          } catch (err) {
            // Ignore cleanup errors
          }
        });
      }
      
      console.log(`  ✅ Successfully created and uploaded multi-quality versions!`);
      console.log(`     HD: ${videoUrls.hd}`);
      console.log(`     SD: ${videoUrls.sd}`);
      console.log(`     Low: ${videoUrls.low}`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
      errorCount++;
      errors.push({
        fileName: video.fileName,
        url: video.originalUrl,
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Successfully processed: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));
  
  // Final cleanup
  cleanupTempFiles();

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ fileName, url, error }) => {
      console.log(`  - ${fileName}: ${error}`);
      console.log(`    URL: ${url}`);
    });
  }

  console.log('\n✅ Conversion completed!');
  console.log('\n📝 Note: The original videos are still in the CDN.');
  console.log('   You may want to delete them after verifying the quality versions work correctly.');
}

// Run conversion
convertCdnVideos()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Conversion failed:', error);
    process.exit(1);
  });

