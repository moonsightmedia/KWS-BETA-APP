/**
 * Script to delete original video files that have quality versions
 * 
 * This script:
 * 1. Lists all videos from the CDN
 * 2. Finds original videos (without _hd, _sd, _low suffixes)
 * 3. Checks if quality versions exist for each original
 * 4. Deletes the original if all 3 quality versions exist
 * 
 * Usage: node scripts/delete-original-videos-with-quality-versions.js [--dry-run]
 * 
 * Requirements:
 * - node-fetch package
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';

// Check for dry-run mode
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

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
    .replace(/_hd\.mp4$/i, '')
    .replace(/_sd\.mp4$/i, '')
    .replace(/_low\.mp4$/i, '')
    .replace(/\.mp4$/i, '')
    .replace(/\.mov$/i, '')
    .replace(/\.MOV$/i, '')
    .replace(/\.MP4$/i, '');
}

/**
 * Check if video has quality suffix
 */
function hasQualitySuffix(fileName) {
  return /_hd\.mp4$/i.test(fileName) || 
         /_sd\.mp4$/i.test(fileName) || 
         /_low\.mp4$/i.test(fileName);
}

/**
 * Delete video from CDN
 */
async function deleteVideoFromCdn(videoUrl) {
  try {
    const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(error.error || `Delete failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

/**
 * Main deletion function
 */
async function deleteOriginalVideos() {
  console.log('🗑️  Starting deletion of original videos with quality versions...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be deleted)' : 'LIVE (files will be deleted)'}\n`);

  // Get all videos from CDN
  const allVideos = await getCdnVideoUrls();
  
  // Group videos by base filename
  const videoGroups = new Map();
  const qualityVersions = new Map();

  allVideos.forEach(videoUrl => {
    const fileName = getFileNameFromUrl(videoUrl);
    const baseFileName = getBaseFileName(fileName);
    
    if (!hasQualitySuffix(fileName)) {
      // This is an original video
      if (!videoGroups.has(baseFileName)) {
        videoGroups.set(baseFileName, {
          baseFileName,
          originalUrl: videoUrl,
          fileName,
        });
      }
    } else {
      // This is a quality version
      if (!qualityVersions.has(baseFileName)) {
        qualityVersions.set(baseFileName, {
          hd: null,
          sd: null,
          low: null,
        });
      }
      
      const versions = qualityVersions.get(baseFileName);
      if (/_hd\.mp4$/i.test(fileName)) {
        versions.hd = videoUrl;
      } else if (/_sd\.mp4$/i.test(fileName)) {
        versions.sd = videoUrl;
      } else if (/_low\.mp4$/i.test(fileName)) {
        versions.low = videoUrl;
      }
    }
  });

  // Find originals that have all 3 quality versions
  const originalsToDelete = [];
  
  videoGroups.forEach((original, baseFileName) => {
    const versions = qualityVersions.get(baseFileName);
    if (versions && versions.hd && versions.sd && versions.low) {
      originalsToDelete.push({
        ...original,
        versions,
      });
    }
  });

  if (originalsToDelete.length === 0) {
    console.log('✅ No original videos found that have all quality versions');
    console.log('   (All originals are either already deleted or missing quality versions)');
    return;
  }

  console.log(`📊 Found ${originalsToDelete.length} original video(s) with all quality versions:\n`);

  // Show what will be deleted
  originalsToDelete.forEach((original, index) => {
    console.log(`[${index + 1}/${originalsToDelete.length}] ${original.fileName}`);
    console.log(`  Original: ${original.originalUrl}`);
    console.log(`  HD: ${original.versions.hd}`);
    console.log(`  SD: ${original.versions.sd}`);
    console.log(`  Low: ${original.versions.low}`);
    console.log('');
  });

  if (dryRun) {
    console.log('='.repeat(60));
    console.log('📊 DRY RUN Summary:');
    console.log(`  Would delete: ${originalsToDelete.length} original video(s)`);
    console.log('='.repeat(60));
    console.log('\n💡 Run without --dry-run to actually delete the files.');
    return;
  }

  // Confirm deletion
  console.log('⚠️  WARNING: This will delete the original video files!');
  console.log('   Make sure the quality versions work correctly before proceeding.\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Delete originals
  for (let i = 0; i < originalsToDelete.length; i++) {
    const original = originalsToDelete[i];
    console.log(`\n[${i + 1}/${originalsToDelete.length}] Deleting: ${original.fileName}`);
    console.log(`  URL: ${original.originalUrl}`);

    try {
      const result = await deleteVideoFromCdn(original.originalUrl);
      console.log(`  ✅ Deleted successfully`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
      errorCount++;
      errors.push({
        fileName: original.fileName,
        url: original.originalUrl,
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Successfully deleted: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ fileName, url, error }) => {
      console.log(`  - ${fileName}: ${error}`);
      console.log(`    URL: ${url}`);
    });
  }

  console.log('\n✅ Deletion completed!');
}

// Run deletion
deleteOriginalVideos()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deletion failed:', error);
    process.exit(1);
  });

