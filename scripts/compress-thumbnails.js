/**
 * Compression Script: Compress all existing thumbnails in CDN
 * 
 * This script:
 * 1. Finds all boulders with thumbnail URLs
 * 2. Downloads thumbnails from CDN
 * 3. Compresses them (max 400px, JPEG 75% quality)
 * 4. Uploads compressed versions back to CDN
 * 5. Updates the database with new URLs
 * 
 * Usage: node scripts/compress-thumbnails.js [--dry-run]
 *
 * Auth (required for non-dry-run uploads): one of these in .env.local
 * - UPLOAD_AUTH_TOKEN=<supabase access token from admin/setter session>
 * - UPLOAD_AUTH_EMAIL + UPLOAD_AUTH_PASSWORD (admin or setter account)
 * - SUPABASE_SERVICE_ROLE_KEY (script bootstraps a short-lived admin/setter token automatically)
 * 
 * Note: This script requires sharp, node-fetch and form-data packages
 * Install with: npm install sharp node-fetch form-data
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';
const UPLOAD_AUTH_TOKEN = process.env.UPLOAD_AUTH_TOKEN;
const UPLOAD_AUTH_EMAIL = process.env.UPLOAD_AUTH_EMAIL;
const UPLOAD_AUTH_PASSWORD = process.env.UPLOAD_AUTH_PASSWORD;

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

const authClient = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

let cachedUploadAuthToken = UPLOAD_AUTH_TOKEN || null;

async function findUploadAuthEmail() {
  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['admin', 'setter'])
    .order('role', { ascending: true });

  if (roleError) {
    throw new Error(`Failed to resolve upload user roles: ${roleError.message}`);
  }

  const orderedUserIds = (roleRows || [])
    .sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === 'admin' ? -1 : 1;
    })
    .map((row) => row.user_id);

  for (const userId of orderedUserIds) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (!userError && userData.user?.email) {
      return userData.user.email;
    }
  }

  throw new Error('No admin/setter user with email found for upload auth');
}

async function createUploadAuthTokenFromServiceRole() {
  if (!authClient) {
    throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY for upload auth bootstrap');
  }

  const email = await findUploadAuthEmail();
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate upload auth link: ${linkError?.message || 'No token hash'}`);
  }

  const { data: sessionData, error: verifyError } = await authClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError || !sessionData.session?.access_token) {
    throw new Error(`Failed to verify upload auth token: ${verifyError?.message || 'No session'}`);
  }

  console.log(`🔐 Upload auth bootstrapped for ${email}`);
  return sessionData.session.access_token;
}

async function resolveUploadAuthToken() {
  if (cachedUploadAuthToken) {
    return cachedUploadAuthToken;
  }

  if (UPLOAD_AUTH_EMAIL && UPLOAD_AUTH_PASSWORD && authClient) {
    const { data, error } = await authClient.auth.signInWithPassword({
      email: UPLOAD_AUTH_EMAIL,
      password: UPLOAD_AUTH_PASSWORD,
    });

    if (error || !data.session?.access_token) {
      throw new Error(`Upload auth sign-in failed: ${error?.message || 'No session token'}`);
    }

    cachedUploadAuthToken = data.session.access_token;
    return cachedUploadAuthToken;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    cachedUploadAuthToken = await createUploadAuthTokenFromServiceRole();
    return cachedUploadAuthToken;
  }

  throw new Error(
    'Missing upload auth. Set UPLOAD_AUTH_TOKEN, UPLOAD_AUTH_EMAIL + UPLOAD_AUTH_PASSWORD, or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
}

function withUploadAuth(headers = {}) {
  return {
    ...headers,
    Authorization: `Bearer ${cachedUploadAuthToken}`,
    'X-Upload-Auth': `Bearer ${cachedUploadAuthToken}`,
  };
}

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

const TARGET_MAX_DIMENSION = 420;

/**
 * Returns the larger side of the image in pixels (after EXIF orientation).
 */
async function getImageMaxDimension(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  let { width, height, orientation } = metadata;
  if (orientation === 6 || orientation === 8) {
    [width, height] = [height, width];
  }
  return Math.max(width || 0, height || 0);
}

/**
 * Download thumbnail from CDN
 */
async function downloadThumbnail(thumbnailUrl) {
  try {
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return buffer;
  } catch (error) {
    console.error(`  ❌ Download failed:`, error.message);
    throw error;
  }
}

/**
 * Compress thumbnail image and ensure portrait orientation
 * All thumbnails will be saved as portrait (height > width)
 * Landscape images will be rotated 90° clockwise
 */
async function compressThumbnail(imageBuffer) {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    let { width, height, format, orientation } = metadata;
    
    // Apply EXIF orientation if present (sharp auto-rotates, but we need to check dimensions)
    // If orientation is 6 or 8, the image is stored rotated, so we need to swap dimensions
    if (orientation === 6 || orientation === 8) {
      // Swap dimensions for rotated images
      [width, height] = [height, width];
    }
    
    // Determine if image is landscape (width > height) or portrait (height > width)
    const isLandscape = width > height;
    
    // ALWAYS save as portrait (height > width)
    let newWidth = width;
    let newHeight = height;
    let needsRotation = false;
    
    if (isLandscape) {
      // Landscape image: swap dimensions and rotate 90° clockwise
      newWidth = height;
      newHeight = width;
      needsRotation = true;
      console.log(`  🔄 Rotating landscape image to portrait: ${width}x${height} → ${newWidth}x${newHeight}`);
    }
    
    // Max 480px: dashboard cards (~138px CSS) at 3x Retina plus list thumbnails
    const maxDimension = 480;
    let finalWidth = newWidth;
    let finalHeight = newHeight;
    
    if (finalWidth > maxDimension || finalHeight > maxDimension) {
      if (finalWidth > finalHeight) {
        finalHeight = Math.round((finalHeight / finalWidth) * maxDimension);
        finalWidth = maxDimension;
      } else {
        finalWidth = Math.round((finalWidth / finalHeight) * maxDimension);
        finalHeight = maxDimension;
      }
    } else {
      const longestSide = Math.max(finalWidth, finalHeight);
      if (longestSide < maxDimension) {
        const scale = maxDimension / longestSide;
        finalWidth = Math.round(finalWidth * scale);
        finalHeight = Math.round(finalHeight * scale);
      }
    }
    
    // Start with sharp pipeline
    let pipeline = sharp(imageBuffer);
    
    // If landscape, rotate 90° counter-clockwise to make it portrait
    // Note: sharp's rotate() uses counter-clockwise, so 90 is counter-clockwise
    if (needsRotation) {
      // First apply EXIF orientation, then rotate to portrait
      pipeline = pipeline.rotate().rotate(90); // EXIF auto-rotate, then 90° counter-clockwise
    } else {
      // Already portrait: just apply EXIF orientation
      pipeline = pipeline.rotate();
    }
    
    // Resize and compress
    const compressedBuffer = await pipeline
      .resize(finalWidth, finalHeight, {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .jpeg({
        quality: 82,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();
    
    const originalSize = imageBuffer.length;
    const compressedSize = compressedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`  📦 Compression: ${(originalSize / 1024).toFixed(1)} KB → ${(compressedSize / 1024).toFixed(1)} KB (${savings}% smaller)`);
    console.log(`  📐 Size: ${width}x${height} → ${finalWidth}x${finalHeight} (portrait)`);
    
    // Always return compressed version (even if slightly larger, we want portrait orientation)
    return compressedBuffer;
  } catch (error) {
    console.error(`  ❌ Compression failed:`, error.message);
    throw error;
  }
}

const CDN_FINAL_PREFIX = '/upload-api/uploads/final/';
const SECTOR_SUBFOLDER_PATTERN = /\/upload-api\/uploads\/final\/[0-9a-f-]{36}\//i;

function shouldUploadToSectorFolder(originalUrl, sectorId) {
  if (!sectorId) return false;
  // Only keep sector subfolders when the thumbnail already lives there (e.g. Kahlwinkel).
  // Flat /final/IMG_xxxx.jpg paths must stay flat — sector uploads were returning 404 on CDN.
  return SECTOR_SUBFOLDER_PATTERN.test(originalUrl);
}

/**
 * Upload thumbnail to All-Inkl
 */
async function uploadThumbnailToAllInkl(imageBuffer, originalUrl, sectorId) {
  try {
    // Extract filename from URL
    const urlParts = originalUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1];
    const fileName = originalFileName.replace(/\.[^/.]+$/, '.jpg'); // Always use .jpg for compressed
    const uploadToSectorFolder = shouldUploadToSectorFolder(originalUrl, sectorId);
    
    // Generate a unique session ID for this upload
    const uploadSessionId = randomUUID();
    
    // For small thumbnails, we use single chunk upload (chunk 0 of 1)
    const formData = new FormData();
    formData.append('chunk', imageBuffer, {
      filename: fileName,
      contentType: 'image/jpeg',
    });
    
    // Get headers from FormData (form-data package provides getHeaders())
    const headers = withUploadAuth(formData.getHeaders());
    headers['X-File-Name'] = fileName;
    headers['X-File-Size'] = imageBuffer.length.toString();
    headers['X-File-Type'] = 'image/jpeg';
    headers['X-Chunk-Number'] = '0';
    headers['X-Total-Chunks'] = '1';
    headers['X-Upload-Session-Id'] = uploadSessionId;
    if (uploadToSectorFolder) {
      headers['X-Sector-Id'] = sectorId;
    }
    
    const response = await fetch(`${ALLINKL_API_URL}/upload.php`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    // The API returns 'status' and 'url' for completed uploads
    if (result.status !== 'completed' || !result.url) {
      throw new Error(`Upload failed: ${JSON.stringify(result)}`);
    }

    const verifyResponse = await fetch(result.url, { method: 'GET' });
    if (!verifyResponse.ok) {
      throw new Error(`Uploaded URL not reachable: ${verifyResponse.status} ${result.url}`);
    }
    
    return result.url;
  } catch (error) {
    console.error(`  ❌ Upload failed:`, error.message);
    throw error;
  }
}

/**
 * Delete old thumbnail from CDN
 */
async function deleteThumbnailFromCdn(thumbnailUrl) {
  try {
    // Only delete if it's an All-Inkl URL
    if (!thumbnailUrl.includes('cdn.kletterwelt-sauerland.de')) {
      console.log(`  ⚠️  Skipping deletion - not an All-Inkl URL`);
      return;
    }
    
    const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
      method: 'POST',
      headers: withUploadAuth({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ url: thumbnailUrl }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      console.warn(`  ⚠️  Delete failed (continuing anyway):`, error.error || 'Unknown error');
    } else {
      console.log(`  🗑️  Deleted old thumbnail`);
    }
  } catch (error) {
    console.warn(`  ⚠️  Delete error (continuing anyway):`, error.message);
  }
}

function toFlatThumbnailUrl(url) {
  if (!url || !url.includes(CDN_FINAL_PREFIX)) return url;
  const fileName = url.split('/').pop();
  return `https://cdn.kletterwelt-sauerland.de${CDN_FINAL_PREFIX}${fileName}`;
}

async function isThumbnailReachable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function resolveWorkingThumbnailUrl(url) {
  if (await isThumbnailReachable(url)) {
    return url;
  }

  const flatUrl = toFlatThumbnailUrl(url);
  if (flatUrl !== url && await isThumbnailReachable(flatUrl)) {
    console.log(`  ↩️  Using flat fallback URL: ${flatUrl}`);
    return flatUrl;
  }

  return url;
}

/**
 * Main compression function
 */
async function compressThumbnails() {
  console.log('🚀 Starting thumbnail compression...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    await resolveUploadAuthToken();
  }
  
  // Fetch all boulders with thumbnails
  console.log('📥 Fetching boulders with thumbnails...');
  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, thumbnail_url, sector_id')
    .not('thumbnail_url', 'is', null);
  
  if (error) {
    console.error('❌ Error fetching boulders:', error);
    process.exit(1);
  }
  
  if (!boulders || boulders.length === 0) {
    console.log('✅ No boulders with thumbnails found.');
    return;
  }
  
  console.log(`📊 Found ${boulders.length} boulder(s) with thumbnails\n`);
  
  // Filter out thumbnails that are already optimized (small size or already JPEG)
  // We'll process all to be safe, but skip if already small enough
  const thumbnailsToProcess = boulders.filter(b => {
    const url = b.thumbnail_url;
    // Skip data URLs (placeholders)
    if (url.startsWith('data:')) return false;
    // Skip if already in thumbnails/ directory (likely already processed)
    if (url.includes('/thumbnails/')) {
      // Still process to ensure optimal compression
      return true;
    }
    return true;
  });
  
  console.log(`📋 Processing ${thumbnailsToProcess.length} thumbnail(s)\n`);
  
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < thumbnailsToProcess.length; i++) {
    const boulder = thumbnailsToProcess[i];
    console.log(`\n[${i + 1}/${thumbnailsToProcess.length}] Processing: ${boulder.name} (${boulder.id})`);
    console.log(`  URL: ${boulder.thumbnail_url}`);
    
    try {
      // Skip data URLs
      if (boulder.thumbnail_url.startsWith('data:')) {
        console.log(`  ⏭️  Skipping data URL (placeholder)`);
        skippedCount++;
        continue;
      }
      
      // Download thumbnail
      console.log(`  📥 Downloading thumbnail...`);
      const sourceUrl = await resolveWorkingThumbnailUrl(boulder.thumbnail_url);
      const imageBuffer = await downloadThumbnail(sourceUrl);
      console.log(`  ✅ Downloaded ${(imageBuffer.length / 1024).toFixed(1)} KB`);

      const currentMaxDimension = await getImageMaxDimension(imageBuffer);
      if (currentMaxDimension >= TARGET_MAX_DIMENSION) {
        console.log(`  ⏭️  Skipping - already ${currentMaxDimension}px (>= ${TARGET_MAX_DIMENSION}px target)`);
        skippedCount++;
        continue;
      }
      
      // Compress thumbnail (and convert to portrait if needed)
      console.log(`  🗜️  Compressing thumbnail...`);
      const compressedBuffer = await compressThumbnail(imageBuffer);
      
      // Check if we need to upload (always upload if orientation changed or compression helped)
      // We always upload to ensure portrait orientation, even if size didn't change much
      const sizeDifference = imageBuffer.length - compressedBuffer.length;
      const sizeReduction = (sizeDifference / imageBuffer.length * 100).toFixed(1);
      
      if (compressedBuffer.length >= imageBuffer.length && Math.abs(parseFloat(sizeReduction)) < 1) {
        // Only skip if size is almost identical AND we're sure it's already portrait
        // For safety, we'll still process it to ensure portrait orientation
        console.log(`  ℹ️  Size similar, but processing to ensure portrait orientation`);
      }
      
      if (isDryRun) {
        console.log(`  🔍 DRY RUN: Would upload compressed thumbnail`);
        successCount++;
        continue;
      }
      
      // Upload compressed thumbnail (preserve flat vs sector folder layout)
      console.log(`  📤 Uploading compressed thumbnail...`);
      const newUrl = await uploadThumbnailToAllInkl(compressedBuffer, sourceUrl, boulder.sector_id);
      
      // Update database
      console.log(`  💾 Updating database...`);
      const { error: updateError } = await supabase
        .from('boulders')
        .update({ thumbnail_url: newUrl })
        .eq('id', boulder.id);
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      // Delete old thumbnail only when URL path actually changed
      if (boulder.thumbnail_url !== newUrl) {
        await deleteThumbnailFromCdn(boulder.thumbnail_url);
      }
      
      console.log(`  ✅ Successfully compressed and updated!`);
      console.log(`  New URL: ${newUrl}`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Compression failed:`, error.message);
      errors.push({
        boulder: boulder.name,
        id: boulder.id,
        error: error.message,
      });
      errorCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Compression Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => {
      console.log(`  - ${e.boulder} (${e.id}): ${e.error}`);
    });
  }
  
  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN - no changes were made');
    console.log('Run without --dry-run to actually compress thumbnails');
  }
  
  console.log('\n✨ Done!');
}

// Run the script
compressThumbnails().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



