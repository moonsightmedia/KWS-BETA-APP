/**
 * Compression Script: Compress all existing thumbnails in CDN
 * 
 * This script:
 * 1. Finds all boulders with thumbnail URLs
 * 2. Downloads thumbnails from CDN
 * 3. Compresses them (max 800px, JPEG 85% quality)
 * 4. Uploads compressed versions back to CDN
 * 5. Updates the database with new URLs
 * 
 * Usage: node scripts/compress-thumbnails.js [--dry-run]
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

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

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
    
    // Calculate optimal dimensions (max 200px for thumbnails - 2x for Retina displays)
    // Thumbnails are displayed as 80-96px, so 200px is perfect for Retina (2x)
    const maxDimension = 200;
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
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 75, // Reduced from 85% - still good quality but much smaller files
        mozjpeg: true, // Better compression
        progressive: true, // Progressive JPEG for better perceived performance
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

/**
 * Upload thumbnail to All-Inkl
 */
async function uploadThumbnailToAllInkl(imageBuffer, originalUrl) {
  try {
    // Extract filename from URL
    const urlParts = originalUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1];
    const fileName = originalFileName.replace(/\.[^/.]+$/, '.jpg'); // Always use .jpg for compressed
    
    // Generate a unique session ID for this upload
    const uploadSessionId = randomUUID();
    
    // For small thumbnails, we use single chunk upload (chunk 0 of 1)
    const formData = new FormData();
    formData.append('chunk', imageBuffer, {
      filename: fileName,
      contentType: 'image/jpeg',
    });
    
    // Get headers from FormData (form-data package provides getHeaders())
    const headers = formData.getHeaders();
    headers['X-File-Name'] = fileName;
    headers['X-File-Size'] = imageBuffer.length.toString();
    headers['X-File-Type'] = 'image/jpeg';
    headers['X-Chunk-Number'] = '0';
    headers['X-Total-Chunks'] = '1';
    headers['X-Upload-Session-Id'] = uploadSessionId;
    
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
      headers: {
        'Content-Type': 'application/json',
      },
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

/**
 * Main compression function
 */
async function compressThumbnails() {
  console.log('🚀 Starting thumbnail compression...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Fetch all boulders with thumbnails
  console.log('📥 Fetching boulders with thumbnails...');
  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, thumbnail_url')
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
      const imageBuffer = await downloadThumbnail(boulder.thumbnail_url);
      console.log(`  ✅ Downloaded ${(imageBuffer.length / 1024).toFixed(1)} KB`);
      
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
      
      // Upload compressed thumbnail
      console.log(`  📤 Uploading compressed thumbnail...`);
      const newUrl = await uploadThumbnailToAllInkl(compressedBuffer, boulder.thumbnail_url);
      
      // Update database
      console.log(`  💾 Updating database...`);
      const { error: updateError } = await supabase
        .from('boulders')
        .update({ thumbnail_url: newUrl })
        .eq('id', boulder.id);
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      // Delete old thumbnail (optional, but recommended to save space)
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



