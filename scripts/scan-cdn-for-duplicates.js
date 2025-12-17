/**
 * Script to scan CDN for duplicate videos and other issues
 * 
 * This script:
 * 1. Lists all videos from the CDN
 * 2. Checks for duplicate filenames
 * 3. Checks for videos with similar names (different quality versions)
 * 4. Reports any issues found
 * 
 * Usage: node scripts/scan-cdn-for-duplicates.js
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
    const normalizedUrls = videoUrls.map(url => normalizeUrl(url));

    console.log(`✅ Found ${normalizedUrls.length} videos in CDN`);
    return normalizedUrls;
  } catch (error) {
    console.warn(`⚠️  Could not fetch from CDN: ${error.message}`);
    return [];
  }
}

/**
 * Get all video URLs from database
 */
async function getDatabaseVideoUrls() {
  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');

  if (error) {
    throw new Error(`Failed to fetch boulders: ${error.message}`);
  }

  const urls = new Set();
  
  (boulders || []).forEach(boulder => {
    // Add primary video URL
    if (boulder.beta_video_url && boulder.beta_video_url.includes('cdn.kletterwelt-sauerland.de')) {
      urls.add(normalizeUrl(boulder.beta_video_url));
    }
    
    // Add quality URLs
    if (boulder.beta_video_urls) {
      const qualityUrls = typeof boulder.beta_video_urls === 'string' 
        ? JSON.parse(boulder.beta_video_urls) 
        : boulder.beta_video_urls;
      
      if (qualityUrls.hd && qualityUrls.hd.includes('cdn.kletterwelt-sauerland.de')) {
        urls.add(normalizeUrl(qualityUrls.hd));
      }
      if (qualityUrls.sd && qualityUrls.sd.includes('cdn.kletterwelt-sauerland.de')) {
        urls.add(normalizeUrl(qualityUrls.sd));
      }
      if (qualityUrls.low && qualityUrls.low.includes('cdn.kletterwelt-sauerland.de')) {
        urls.add(normalizeUrl(qualityUrls.low));
      }
    }
  });

  return Array.from(urls);
}

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
 * Scan for duplicates and issues
 */
async function scanCdn() {
  console.log('🔍 Scanning CDN for duplicates and issues...\n');

  // Get all video URLs from database
  console.log('📊 Fetching video URLs from database...');
  const dbUrls = await getDatabaseVideoUrls();
  console.log(`✅ Found ${dbUrls.length} video URLs in database\n`);

  // Get all video URLs from CDN
  const cdnUrls = await getCdnVideoUrls();
  console.log(`✅ Found ${cdnUrls.length} videos in CDN\n`);

  // Group by base filename
  const videoGroups = new Map();
  const filenameMap = new Map();
  const duplicates = [];
  const missingQualities = [];

  dbUrls.forEach(url => {
    const fileName = getFileNameFromUrl(url);
    const baseName = getBaseFileName(fileName);
    
    // Track exact filename duplicates
    if (filenameMap.has(fileName)) {
      duplicates.push({
        fileName,
        url1: filenameMap.get(fileName),
        url2: url,
      });
    } else {
      filenameMap.set(fileName, url);
    }
    
    // Group by base name
    if (!videoGroups.has(baseName)) {
      videoGroups.set(baseName, {
        baseName,
        hd: null,
        sd: null,
        low: null,
        original: null,
        urls: [],
      });
    }
    
    const group = videoGroups.get(baseName);
    group.urls.push(url);
    
    if (fileName.includes('_hd.mp4')) {
      group.hd = url;
    } else if (fileName.includes('_sd.mp4')) {
      group.sd = url;
    } else if (fileName.includes('_low.mp4')) {
      group.low = url;
    } else {
      group.original = url;
    }
  });

  // Check for missing qualities
  videoGroups.forEach((group, baseName) => {
    const hasHD = !!group.hd;
    const hasSD = !!group.sd;
    const hasLow = !!group.low;
    const hasOriginal = !!group.original;
    
    // Check if video has multi-quality setup but missing some qualities
    if (hasHD || hasSD || hasLow) {
      if (!hasHD) missingQualities.push({ baseName, missing: 'HD', urls: group.urls });
      if (!hasSD) missingQualities.push({ baseName, missing: 'SD', urls: group.urls });
      if (!hasLow) missingQualities.push({ baseName, missing: 'Low', urls: group.urls });
    }
    
    // Check for videos with only original (no quality versions)
    if (hasOriginal && !hasHD && !hasSD && !hasLow) {
      missingQualities.push({ baseName, missing: 'All qualities', urls: group.urls });
    }
  });

  // Compare CDN vs Database (if CDN list is available)
  let videosInCdnNotInDb = [];
  let videosInDbNotInCdn = [];
  
  if (cdnUrls.length > 0) {
    const dbUrlSet = new Set(dbUrls);
    const cdnUrlSet = new Set(cdnUrls);
    
    videosInCdnNotInDb = cdnUrls.filter(url => !dbUrlSet.has(url));
    videosInDbNotInCdn = dbUrls.filter(url => !cdnUrlSet.has(url));
  } else {
    console.log('⚠️  CDN list not available, skipping CDN comparison');
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('📊 Scan Results:');
  console.log('='.repeat(60));
  console.log(`Total video URLs in database: ${dbUrls.length}`);
  if (cdnUrls.length > 0) {
    console.log(`Total videos in CDN: ${cdnUrls.length}`);
    console.log(`Videos in CDN but not in DB: ${videosInCdnNotInDb.length}`);
    console.log(`Videos in DB but not in CDN: ${videosInDbNotInCdn.length}`);
  }
  console.log(`Unique base filenames: ${videoGroups.size}`);
  console.log(`Duplicate filenames: ${duplicates.length}`);
  console.log(`Videos with missing qualities: ${missingQualities.length}`);
  console.log('='.repeat(60));

  // Show duplicates
  if (duplicates.length > 0) {
    console.log('\n❌ Duplicate Filenames Found:');
    duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. ${dup.fileName}`);
      console.log(`   URL 1: ${dup.url1}`);
      console.log(`   URL 2: ${dup.url2}`);
    });
  } else {
    console.log('\n✅ No duplicate filenames found');
  }

  // Show missing qualities
  if (missingQualities.length > 0) {
    console.log('\n⚠️  Videos with Missing Qualities:');
    const grouped = {};
    missingQualities.forEach(item => {
      if (!grouped[item.missing]) {
        grouped[item.missing] = [];
      }
      grouped[item.missing].push(item);
    });
    
    Object.entries(grouped).forEach(([missing, items]) => {
      console.log(`\n  Missing ${missing}: ${items.length} videos`);
      items.slice(0, 10).forEach(item => {
        console.log(`    - ${item.baseName}`);
      });
      if (items.length > 10) {
        console.log(`    ... and ${items.length - 10} more`);
      }
    });
  } else {
    console.log('\n✅ All videos have complete quality sets');
  }

  // Show videos with multiple URLs (potential duplicates)
  console.log('\n📋 Videos with Multiple URLs:');
  let multiUrlCount = 0;
  videoGroups.forEach((group, baseName) => {
    if (group.urls.length > 3) {
      multiUrlCount++;
      if (multiUrlCount <= 10) {
        console.log(`\n  ${baseName}:`);
        group.urls.forEach(url => {
          console.log(`    - ${getFileNameFromUrl(url)}`);
        });
      }
    }
  });
  
  if (multiUrlCount === 0) {
    console.log('  ✅ No videos with excessive URLs found');
  } else if (multiUrlCount > 10) {
    console.log(`\n  ... and ${multiUrlCount - 10} more videos with multiple URLs`);
  }

  // Show videos in CDN but not in database
  if (cdnUrls.length > 0) {
    if (videosInCdnNotInDb.length > 0) {
      console.log('\n⚠️  Videos in CDN but NOT in Database (orphaned files):');
      videosInCdnNotInDb.slice(0, 20).forEach((url, index) => {
        console.log(`  ${index + 1}. ${getFileNameFromUrl(url)}`);
        console.log(`     ${url}`);
      });
      if (videosInCdnNotInDb.length > 20) {
        console.log(`  ... and ${videosInCdnNotInDb.length - 20} more`);
      }
    } else {
      console.log('\n✅ All CDN videos are referenced in database');
    }

    // Show videos in database but not in CDN
    if (videosInDbNotInCdn.length > 0) {
      console.log('\n⚠️  Videos in Database but NOT in CDN (broken links):');
      console.log(`  Note: This might be due to different path structures or CDN API limitations`);
      videosInDbNotInCdn.slice(0, 10).forEach((url, index) => {
        console.log(`  ${index + 1}. ${getFileNameFromUrl(url)}`);
      });
      if (videosInDbNotInCdn.length > 10) {
        console.log(`  ... and ${videosInDbNotInCdn.length - 10} more`);
      }
    } else {
      console.log('\n✅ All database videos exist in CDN');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Scan completed!');
  console.log('='.repeat(60));
}

// Run scan
scanCdn()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scan failed:', error);
    process.exit(1);
  });

