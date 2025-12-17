/**
 * Script to update boulders database with quality versions
 * 
 * This script:
 * 1. Finds boulders with video URLs pointing to deleted original files (.mov)
 * 2. Finds the corresponding quality versions (_hd, _sd, _low) in CDN
 * 3. Updates the database with the new quality URLs
 * 
 * Usage: node scripts/update-boulders-with-quality-versions.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

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
 * Find quality versions for a base filename
 */
function findQualityVersions(baseFileName, cdnVideos) {
  const hdUrl = cdnVideos.find(url => {
    const fileName = getFileNameFromUrl(url);
    return fileName.toLowerCase() === `${baseFileName}_hd.mp4`.toLowerCase();
  });
  
  const sdUrl = cdnVideos.find(url => {
    const fileName = getFileNameFromUrl(url);
    return fileName.toLowerCase() === `${baseFileName}_sd.mp4`.toLowerCase();
  });
  
  const lowUrl = cdnVideos.find(url => {
    const fileName = getFileNameFromUrl(url);
    return fileName.toLowerCase() === `${baseFileName}_low.mp4`.toLowerCase();
  });
  
  return { hd: hdUrl, sd: sdUrl, low: lowUrl };
}

/**
 * Main update function
 */
async function updateBouldersWithQualityVersions() {
  console.log('🔄 Starting boulder database update with quality versions...\n');

  // Get all videos from CDN
  const cdnVideos = await getCdnVideoUrls();
  
  // Get all boulders with video URLs
  console.log('📊 Fetching boulders from database...');
  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');

  if (error) {
    throw new Error(`Failed to fetch boulders: ${error.message}`);
  }

  console.log(`✅ Found ${boulders.length} boulders with video URLs\n`);

  // Find boulders that need updating
  const bouldersToUpdate = [];
  
  for (const boulder of boulders) {
    const videoUrl = boulder.beta_video_url;
    if (!videoUrl) continue;
    
    const fileName = getFileNameFromUrl(videoUrl);
    
    // Check if this is an original file (without quality suffix) that might have been deleted
    // Or if it's a .mov file (which we deleted)
    if (hasQualitySuffix(fileName)) {
      // Already has quality suffix, skip
      continue;
    }
    
    // Check if it's a .mov file or if the file doesn't exist in CDN
    const isMovFile = /\.mov$/i.test(fileName);
    const existsInCdn = cdnVideos.some(url => {
      const cdnFileName = getFileNameFromUrl(url);
      return cdnFileName === fileName;
    });
    
    if (isMovFile || !existsInCdn) {
      // This is a .mov file or doesn't exist - try to find quality versions
      const baseFileName = getBaseFileName(fileName);
      const qualityVersions = findQualityVersions(baseFileName, cdnVideos);
      
      if (qualityVersions.hd || qualityVersions.sd || qualityVersions.low) {
        bouldersToUpdate.push({
          boulder,
          baseFileName,
          qualityVersions,
          originalUrl: videoUrl
        });
      }
    }
  }

  if (bouldersToUpdate.length === 0) {
    console.log('✅ No boulders found that need updating');
    return;
  }

  console.log(`📊 Found ${bouldersToUpdate.length} boulder(s) to update:\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < bouldersToUpdate.length; i++) {
    const { boulder, baseFileName, qualityVersions, originalUrl } = bouldersToUpdate[i];
    
    console.log(`[${i + 1}/${bouldersToUpdate.length}] Updating: ${boulder.name} (${boulder.id})`);
    console.log(`  Original: ${originalUrl}`);
    console.log(`  HD: ${qualityVersions.hd || 'NOT FOUND'}`);
    console.log(`  SD: ${qualityVersions.sd || 'NOT FOUND'}`);
    console.log(`  Low: ${qualityVersions.low || 'NOT FOUND'}`);

    try {
      // Build update data
      const videoUrls = {};
      if (qualityVersions.hd) videoUrls.hd = qualityVersions.hd;
      if (qualityVersions.sd) videoUrls.sd = qualityVersions.sd;
      if (qualityVersions.low) videoUrls.low = qualityVersions.low;
      
      // Use HD as primary beta_video_url for backward compatibility
      const primaryUrl = qualityVersions.hd || qualityVersions.sd || qualityVersions.low || originalUrl;
      
      const updateData = {
        beta_video_url: primaryUrl,
        beta_video_urls: videoUrls
      };

      const { error: updateError } = await supabase
        .from('boulders')
        .update(updateData)
        .eq('id', boulder.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`  ✅ Successfully updated!`);
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
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Successfully updated: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ boulder, id, error }) => {
      console.log(`  - ${boulder} (${id}): ${error}`);
    });
  }

  console.log('\n✅ Update completed!');
}

// Run update
updateBouldersWithQualityVersions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

