/**
 * Cleanup Script: Löscht Videos aus dem All-Inkl CDN, die nicht mehr in der Datenbank referenziert sind
 * 
 * Usage:
 *   node scripts/cleanup-unused-videos.js [--dry-run] [--confirm]
 * 
 * Options:
 *   --dry-run    Zeigt nur an, welche Videos gelöscht würden, ohne sie tatsächlich zu löschen
 *   --confirm    Bestätigt automatisch ohne Nachfrage (nur mit --dry-run sicher)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Configuration
const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

/**
 * Get all video URLs from the database
 */
async function getDatabaseVideoUrls() {
  console.log('📊 Fetching video URLs from database...');
  
  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('beta_video_url')
    .not('beta_video_url', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch boulders: ${error.message}`);
  }

  // Filter only All-Inkl CDN URLs and normalize them
  const videoUrls = new Set();
  boulders?.forEach(boulder => {
    if (boulder.beta_video_url && boulder.beta_video_url.includes('cdn.kletterwelt-sauerland.de')) {
      // Normalize URL: remove query parameters, fragments, etc.
      const url = new URL(boulder.beta_video_url);
      const normalizedUrl = `${url.origin}${url.pathname}`;
      videoUrls.add(normalizedUrl);
    }
  });

  console.log(`✅ Found ${videoUrls.size} unique video URLs in database`);
  return videoUrls;
}

/**
 * Get all video URLs from the CDN directory
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
    const normalizedUrls = videoUrls.map(url => {
      try {
        const urlObj = new URL(url);
        return `${urlObj.origin}${urlObj.pathname}`;
      } catch {
        return url;
      }
    });

    console.log(`✅ Found ${normalizedUrls.length} videos in CDN`);
    return normalizedUrls;
  } catch (error) {
    throw new Error(`Failed to fetch CDN videos: ${error.message}`);
  }
}

/**
 * Delete a video from the CDN
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

    return true;
  } catch (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

/**
 * Main cleanup function
 */
async function cleanupUnusedVideos(dryRun = false, autoConfirm = false) {
  console.log('🧹 Starting cleanup of unused videos...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be deleted)' : 'LIVE (files will be deleted)'}\n`);

  try {
    // Get video URLs from database and CDN
    const dbVideoUrls = await getDatabaseVideoUrls();
    const cdnVideoUrls = await getCdnVideoUrls();

    // Find videos in CDN that are not in database
    const unusedVideos = cdnVideoUrls.filter(url => !dbVideoUrls.has(url));

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`  Videos in database: ${dbVideoUrls.size}`);
    console.log(`  Videos in CDN: ${cdnVideoUrls.length}`);
    console.log(`  Unused videos (to be deleted): ${unusedVideos.length}`);
    console.log('='.repeat(60) + '\n');

    if (unusedVideos.length === 0) {
      console.log('✅ No unused videos found. CDN is clean!');
      return;
    }

    // Show unused videos
    console.log('🗑️  Unused videos:');
    unusedVideos.forEach((url, index) => {
      const fileName = url.split('/').pop();
      console.log(`  ${index + 1}. ${fileName}`);
      console.log(`     ${url}`);
    });
    console.log('');

    // Confirm deletion
    if (dryRun) {
      console.log('ℹ️  DRY RUN: No videos were actually deleted.');
      console.log('   Run without --dry-run to actually delete these videos.');
      return;
    }

    if (!autoConfirm) {
      console.log('⚠️  WARNING: This will permanently delete the videos listed above!');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Delete unused videos
    console.log('🗑️  Deleting unused videos...\n');
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < unusedVideos.length; i++) {
      const videoUrl = unusedVideos[i];
      const fileName = videoUrl.split('/').pop();
      
      console.log(`[${i + 1}/${unusedVideos.length}] Deleting: ${fileName}`);
      
      try {
        await deleteVideoFromCdn(videoUrl);
        console.log(`  ✅ Deleted successfully`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        errorCount++;
        errors.push({
          url: videoUrl,
          fileName: fileName,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log(`  ✅ Successfully deleted: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`  - ${err.fileName}: ${err.error}`);
      });
    }

    console.log('\n✅ Cleanup completed!');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const autoConfirm = args.includes('--confirm');

// Run cleanup
cleanupUnusedVideos(dryRun, autoConfirm)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

