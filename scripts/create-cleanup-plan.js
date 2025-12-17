/**
 * Script to create a cleanup plan for orphaned videos in CDN
 * 
 * This script:
 * 1. Lists all videos from the CDN
 * 2. Lists all video URLs from the database
 * 3. Identifies orphaned videos (in CDN but not in DB)
 * 4. Creates a cleanup plan with statistics
 * 5. Optionally deletes orphaned videos (with confirmation)
 * 
 * Usage: 
 *   node scripts/create-cleanup-plan.js [--dry-run] [--confirm]
 * 
 * Options:
 *   --dry-run    Shows what would be deleted without actually deleting
 *   --confirm    Auto-confirms deletion (use with caution)
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const autoConfirm = args.includes('--confirm');

/**
 * Normalize URL by removing path differences
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove /upload-api prefix and /final subdirectory
    let pathname = urlObj.pathname
      .replace(/^\/upload-api/, '')
      .replace(/\/final\//, '/')
      .replace(/\/final$/, '');
    
    // Remove double slashes
    pathname = pathname.replace(/\/+/g, '/');
    
    // Ensure path starts with /uploads/
    if (!pathname.startsWith('/uploads/')) {
      // Extract filename
      const filename = pathname.split('/').pop();
      pathname = `/uploads/${filename}`;
    }
    
    return `${urlObj.origin}${pathname}`;
  } catch {
    return url;
  }
}

/**
 * Get all video URLs from database
 */
async function getDatabaseVideoUrls() {
  console.log('📊 Fetching video URLs from database...');
  
  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');

  if (error) {
    throw new Error(`Failed to fetch boulders: ${error.message}`);
  }

  const urls = new Set();
  const urlToBoulder = new Map();
  
  (boulders || []).forEach(boulder => {
    // Add primary video URL
    if (boulder.beta_video_url && boulder.beta_video_url.includes('cdn.kletterwelt-sauerland.de')) {
      const normalized = normalizeUrl(boulder.beta_video_url);
      urls.add(normalized);
      urlToBoulder.set(normalized, { id: boulder.id, name: boulder.name });
    }
    
    // Add quality URLs
    if (boulder.beta_video_urls) {
      const qualityUrls = typeof boulder.beta_video_urls === 'string' 
        ? JSON.parse(boulder.beta_video_urls) 
        : boulder.beta_video_urls;
      
      if (qualityUrls.hd && qualityUrls.hd.includes('cdn.kletterwelt-sauerland.de')) {
        const normalized = normalizeUrl(qualityUrls.hd);
        urls.add(normalized);
        urlToBoulder.set(normalized, { id: boulder.id, name: boulder.name });
      }
      if (qualityUrls.sd && qualityUrls.sd.includes('cdn.kletterwelt-sauerland.de')) {
        const normalized = normalizeUrl(qualityUrls.sd);
        urls.add(normalized);
        urlToBoulder.set(normalized, { id: boulder.id, name: boulder.name });
      }
      if (qualityUrls.low && qualityUrls.low.includes('cdn.kletterwelt-sauerland.de')) {
        const normalized = normalizeUrl(qualityUrls.low);
        urls.add(normalized);
        urlToBoulder.set(normalized, { id: boulder.id, name: boulder.name });
      }
    }
  });

  console.log(`✅ Found ${urls.size} unique video URLs in database`);
  return { urls, urlToBoulder };
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

    // Normalize URLs
    const normalizedUrls = videoUrls.map(url => normalizeUrl(url));

    console.log(`✅ Found ${normalizedUrls.length} videos in CDN`);
    return normalizedUrls;
  } catch (error) {
    throw new Error(`Failed to fetch CDN videos: ${error.message}`);
  }
}

/**
 * Extract filename from URL
 */
function getFileNameFromUrl(url) {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * Get base filename without quality suffix
 */
function getBaseFileName(fileName) {
  return fileName
    .replace(/_hd\.mp4$/, '')
    .replace(/_sd\.mp4$/, '')
    .replace(/_low\.mp4$/, '')
    .replace(/\.mp4$/, '')
    .replace(/\.mov$/, '');
}

/**
 * Delete a video from the CDN
 */
async function deleteVideoFromCdn(videoUrl) {
  try {
    const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete failed: ${response.status} ${errorText}`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

/**
 * Create cleanup plan
 */
async function createCleanupPlan() {
  console.log('🔍 Creating cleanup plan for orphaned videos...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be deleted)' : 'LIVE (files will be deleted)'}\n`);

  // Get videos from CDN and database
  const cdnUrls = await getCdnVideoUrls();
  const { urls: dbUrls, urlToBoulder } = await getDatabaseVideoUrls();

  // Find orphaned videos (remove duplicates first)
  const dbUrlSet = new Set(dbUrls);
  const uniqueCdnUrls = [...new Set(cdnUrls)]; // Remove duplicates from CDN list
  const orphanedVideos = uniqueCdnUrls.filter(url => !dbUrlSet.has(url));

  // Group orphaned videos by base filename
  const orphanedGroups = new Map();
  orphanedVideos.forEach(url => {
    const fileName = getFileNameFromUrl(url);
    const baseName = getBaseFileName(fileName);
    
    if (!orphanedGroups.has(baseName)) {
      orphanedGroups.set(baseName, []);
    }
    orphanedGroups.get(baseName).push({ url, fileName });
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Cleanup Plan Summary:');
  console.log('='.repeat(60));
  console.log(`Total videos in CDN: ${cdnUrls.length}`);
  console.log(`Total videos in database: ${dbUrls.size}`);
  console.log(`Orphaned videos (to be deleted): ${orphanedVideos.length}`);
  console.log(`Orphaned video groups: ${orphanedGroups.size}`);
  console.log('='.repeat(60));

  if (orphanedVideos.length === 0) {
    console.log('\n✅ No orphaned videos found. CDN is clean!');
    return;
  }

  // Show orphaned videos grouped by base name
  console.log('\n🗑️  Orphaned Videos (grouped by base filename):');
  let totalSize = 0;
  const groupsToShow = Array.from(orphanedGroups.entries()).slice(0, 20);
  
  groupsToShow.forEach(([baseName, videos]) => {
    console.log(`\n  ${baseName}:`);
    videos.forEach(({ url, fileName }) => {
      console.log(`    - ${fileName}`);
      console.log(`      ${url}`);
    });
  });

  if (orphanedGroups.size > 20) {
    console.log(`\n  ... and ${orphanedGroups.size - 20} more groups`);
  }

  // Show statistics
  console.log('\n📈 Statistics:');
  console.log(`  Orphaned videos: ${orphanedVideos.length}`);
  console.log(`  Orphaned groups: ${orphanedGroups.size}`);
  console.log(`  Average videos per group: ${(orphanedVideos.length / orphanedGroups.size).toFixed(1)}`);

  // Confirm deletion
  if (dryRun) {
    console.log('\nℹ️  DRY RUN: No videos were actually deleted.');
    console.log('   Run without --dry-run to actually delete these videos.');
    return;
  }

  if (!autoConfirm) {
    console.log('\n⚠️  WARNING: This will permanently delete the videos listed above!');
    console.log('   Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Delete orphaned videos
  console.log('\n🗑️  Deleting orphaned videos...\n');
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < orphanedVideos.length; i++) {
    const videoUrl = orphanedVideos[i];
    const fileName = getFileNameFromUrl(videoUrl);
    
    try {
      await deleteVideoFromCdn(videoUrl);
      successCount++;
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Progress: ${i + 1}/${orphanedVideos.length} deleted...`);
      }
    } catch (error) {
      errorCount++;
      errors.push({ url: videoUrl, error: error.message });
      console.error(`  ❌ Failed to delete ${fileName}: ${error.message}`);
    }
  }

  // Print final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Cleanup completed!');
  console.log('='.repeat(60));
  console.log(`Successfully deleted: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.slice(0, 10).forEach(({ url, error }) => {
      console.log(`  - ${getFileNameFromUrl(url)}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }
  
  console.log('='.repeat(60));
}

// Run cleanup plan
createCleanupPlan()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup plan failed:', error);
    process.exit(1);
  });

