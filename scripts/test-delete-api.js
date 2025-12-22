/**
 * Test script for delete.php API
 * 
 * This script tests if the delete API correctly deletes videos
 * 
 * Usage: node scripts/test-delete-api.js [video-url]
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

/**
 * Normalize URL
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname
      .replace(/^\/upload-api/, '')
      .replace(/\/final\//, '/')
      .replace(/\/final$/, '')
      .replace(/\/+/g, '/');
    
    if (!pathname.startsWith('/uploads/')) {
      const filename = pathname.split('/').pop();
      pathname = `/uploads/${filename}`;
    }
    
    return `${urlObj.origin}${pathname}`;
  } catch {
    return url;
  }
}

/**
 * Get a test video URL from CDN
 */
async function getTestVideoUrl() {
  try {
    const response = await fetch(`${ALLINKL_API_URL}/list-videos.php`);
    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.status}`);
    }
    const videos = await response.json();
    if (!Array.isArray(videos) || videos.length === 0) {
      throw new Error('No videos found in CDN');
    }
    return videos[0]; // Get first video
  } catch (error) {
    throw new Error(`Failed to get test video: ${error.message}`);
  }
}

/**
 * Check if video exists in CDN
 */
async function videoExistsInCdn(videoUrl) {
  try {
    const response = await fetch(`${ALLINKL_API_URL}/list-videos.php`);
    if (!response.ok) {
      return false;
    }
    const videos = await response.json();
    const normalizedUrl = normalizeUrl(videoUrl);
    return videos.some(url => normalizeUrl(url) === normalizedUrl);
  } catch {
    return false;
  }
}

/**
 * Delete video via API
 */
async function deleteVideo(videoUrl) {
  try {
    const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    const result = await response.json();
    return {
      success: response.ok,
      status: response.status,
      result: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test delete API
 */
async function testDeleteApi() {
  console.log('🧪 Testing delete.php API...\n');

  // Get test video URL
  let testVideoUrl;
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    testVideoUrl = args[0];
    console.log(`Using provided video URL: ${testVideoUrl}`);
  } else {
    console.log('Getting test video from CDN...');
    testVideoUrl = await getTestVideoUrl();
    console.log(`Found test video: ${testVideoUrl}`);
  }

  const normalizedUrl = normalizeUrl(testVideoUrl);
  console.log(`Normalized URL: ${normalizedUrl}\n`);

  // Check if video exists before deletion
  console.log('1. Checking if video exists in CDN...');
  const existsBefore = await videoExistsInCdn(testVideoUrl);
  console.log(`   Video exists: ${existsBefore ? '✅ YES' : '❌ NO'}\n`);

  if (!existsBefore) {
    console.log('⚠️  Video does not exist in CDN. Cannot test deletion.');
    return;
  }

  // Delete video
  console.log('2. Attempting to delete video...');
  const deleteResult = await deleteVideo(testVideoUrl);
  console.log(`   Status: ${deleteResult.status || 'N/A'}`);
  console.log(`   Success: ${deleteResult.success ? '✅ YES' : '❌ NO'}`);
  console.log(`   Response:`, JSON.stringify(deleteResult.result || deleteResult.error, null, 2));
  console.log('');

  // Wait a moment for deletion to complete
  console.log('3. Waiting 2 seconds for deletion to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('');

  // Check if video still exists
  console.log('4. Checking if video still exists in CDN...');
  const existsAfter = await videoExistsInCdn(testVideoUrl);
  console.log(`   Video exists: ${existsAfter ? '❌ YES (NOT DELETED!)' : '✅ NO (DELETED!)'}\n`);

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Test Summary:');
  console.log('='.repeat(60));
  console.log(`Video URL: ${testVideoUrl}`);
  console.log(`Normalized: ${normalizedUrl}`);
  console.log(`Existed before: ${existsBefore ? 'YES' : 'NO'}`);
  console.log(`Delete API response: ${deleteResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Exists after: ${existsAfter ? 'YES' : 'NO'}`);
  
  if (deleteResult.success && !existsAfter) {
    console.log('\n✅ TEST PASSED: Video was successfully deleted!');
  } else if (deleteResult.success && existsAfter) {
    console.log('\n❌ TEST FAILED: Delete API returned success but video still exists!');
  } else if (!deleteResult.success) {
    console.log('\n❌ TEST FAILED: Delete API returned error!');
  }
  console.log('='.repeat(60));
}

// Run test
testDeleteApi()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });



