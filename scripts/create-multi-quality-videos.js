/**
 * Migration Script: Create multiple quality versions for existing videos
 * 
 * This script:
 * 1. Finds all boulders with beta_video_url but no beta_video_urls
 * 2. Downloads videos from CDN
 * 3. Creates HD, SD, and Low quality versions using FFmpeg
 * 4. Uploads all 3 qualities to CDN
 * 5. Updates the database with beta_video_urls
 * 
 * Usage: node scripts/create-multi-quality-videos.js
 * 
 * Requirements:
 * - FFmpeg must be installed and available in PATH
 * - node-fetch and form-data packages
 * Install with: npm install node-fetch form-data
 * 
 * Note: This script processes videos sequentially to avoid memory issues
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Temporary directory for processing
const TEMP_DIR = join(__dirname, '../temp-video-processing');
if (!existsSync(TEMP_DIR)) {
  const { mkdirSync } = await import('fs');
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Check if FFmpeg is available
 */
async function checkFFmpeg() {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    console.error('❌ FFmpeg is not installed or not in PATH');
    console.error('Please install FFmpeg: https://ffmpeg.org/download.html');
    return false;
  }
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
      { name: 'low', path: lowPath, width: 854, bitrate: '1000000', crf: 25 },
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
      await execAsync(`ffmpeg ${escapedArgs.join(' ')}`);
      
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
    // Single chunk upload - still need session ID for PHP script
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
    headers['X-Upload-Session-Id'] = singleSessionId; // Required by PHP script
    
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
 * Get base filename without extension
 */
function getBaseFileName(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

/**
 * Main migration function
 */
async function createMultiQualityVideos() {
  console.log('🚀 Starting multi-quality video creation...\n');

  // Check FFmpeg
  if (!(await checkFFmpeg())) {
    process.exit(1);
  }

  // Get all boulders with videos that only have HD quality (need SD and Low)
  console.log('📊 Fetching boulders with videos...');
  const { data: allBoulders, error: fetchError } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');
  
  if (fetchError) {
    console.error('❌ Error fetching boulders:', fetchError);
    process.exit(1);
  }
  
  // Filter: Only process videos that don't have SD and Low qualities yet
  const boulders = (allBoulders || []).filter(boulder => {
    if (!boulder.beta_video_urls) return true; // No beta_video_urls at all
    const urls = typeof boulder.beta_video_urls === 'string' 
      ? JSON.parse(boulder.beta_video_urls) 
      : boulder.beta_video_urls;
    // Process if SD or Low is missing
    return !urls.sd || !urls.low;
  });

  if (!boulders || boulders.length === 0) {
    console.log('✅ No boulders found that need multi-quality conversion');
    return;
  }

  console.log(`📊 Found ${boulders.length} boulder(s) to process\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < boulders.length; i++) {
    const boulder = boulders[i];
    console.log(`\n[${i + 1}/${boulders.length}] Processing: ${boulder.name} (${boulder.id})`);
    console.log(`  URL: ${boulder.beta_video_url}`);

    try {
      // Get filename
      const fileName = getFileNameFromUrl(boulder.beta_video_url);
      const baseFileName = getBaseFileName(fileName);
      
      // Check if quality files already exist from previous run
      const hdPath = join(TEMP_DIR, `${baseFileName}_hd.mp4`);
      const sdPath = join(TEMP_DIR, `${baseFileName}_sd.mp4`);
      const lowPath = join(TEMP_DIR, `${baseFileName}_low.mp4`);
      
      let qualityFiles;
      if (existsSync(hdPath) && existsSync(sdPath) && existsSync(lowPath)) {
        console.log(`  ⚡ Using existing quality files (skipping conversion)`);
        const fs = await import('fs');
        const stats = fs.promises.stat;
        qualityFiles = {
          hd: { path: hdPath, size: (await stats(hdPath)).size },
          sd: { path: sdPath, size: (await stats(sdPath)).size },
          low: { path: lowPath, size: (await stats(lowPath)).size },
        };
        console.log(`    ✅ HD: ${(qualityFiles.hd.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    ✅ SD: ${(qualityFiles.sd.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    ✅ Low: ${(qualityFiles.low.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        // Download video and create quality versions
        console.log(`  📥 Downloading and converting...`);
        const videoBuffer = await downloadVideoFromCdn(boulder.beta_video_url);
        qualityFiles = await createMultiQualityVersions(videoBuffer, baseFileName);
      }
      
      // Upload all qualities
      const videoUrls = {};
      
      console.log(`  📤 Uploading quality versions...`);
      
      // Upload HD
      const hdBuffer = readFileSync(qualityFiles.hd.path);
      const hdFileName = `${baseFileName}_hd.mp4`;
      videoUrls.hd = await uploadVideoToAllInkl(hdBuffer, hdFileName);
      console.log(`    ✅ HD: ${videoUrls.hd}`);
      unlinkSync(qualityFiles.hd.path);
      
      // Upload SD
      const sdBuffer = readFileSync(qualityFiles.sd.path);
      const sdFileName = `${baseFileName}_sd.mp4`;
      videoUrls.sd = await uploadVideoToAllInkl(sdBuffer, sdFileName);
      console.log(`    ✅ SD: ${videoUrls.sd}`);
      unlinkSync(qualityFiles.sd.path);
      
      // Upload Low
      const lowBuffer = readFileSync(qualityFiles.low.path);
      const lowFileName = `${baseFileName}_low.mp4`;
      videoUrls.low = await uploadVideoToAllInkl(lowBuffer, lowFileName);
      console.log(`    ✅ Low: ${videoUrls.low}`);
      unlinkSync(qualityFiles.low.path);
      
      // Update database
      console.log(`  💾 Updating database...`);
      const { error: updateError } = await supabase
        .from('boulders')
        .update({ 
          beta_video_urls: videoUrls,
          beta_video_url: videoUrls.hd // Keep HD as primary for backward compatibility
        })
        .eq('id', boulder.id);
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      console.log(`  ✅ Successfully created multi-quality versions!`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
      errorCount++;
      errors.push({
        boulder: boulder.name,
        id: boulder.id,
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Successfully processed: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ boulder, id, error }) => {
      console.log(`  - ${boulder} (${id}): ${error}`);
    });
  }
}

// Run migration
createMultiQualityVideos()
  .then(() => {
    console.log('\n✅ Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

