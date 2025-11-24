/**
 * Compression Script: Compress all existing sector images in CDN
 * 
 * This script:
 * 1. Finds all sectors with image URLs
 * 2. Downloads images from CDN
 * 3. Compresses them (max 1920x1080px, JPEG 85% quality)
 * 4. Uploads compressed versions back to CDN
 * 5. Updates the database with new URLs
 * 
 * Usage: node scripts/compress-sector-images.js [--dry-run]
 * 
 * Note: This script requires sharp, node-fetch and form-data packages
 * Install with: npm install sharp node-fetch form-data
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
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
 * Download sector image from CDN
 */
async function downloadSectorImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
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
 * Compress sector image (max 1920x1080px, maintain aspect ratio)
 */
async function compressSectorImage(imageBuffer) {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    let { width, height, format, orientation } = metadata;
    
    // Apply EXIF orientation if present
    if (orientation === 6 || orientation === 8) {
      [width, height] = [height, width];
    }
    
    // Calculate optimal dimensions (max 1920x1080px, maintain aspect ratio)
    const maxWidth = 1920;
    const maxHeight = 1080;
    let finalWidth = width;
    let finalHeight = height;
    
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      if (width > height) {
        // Landscape
        finalWidth = Math.min(width, maxWidth);
        finalHeight = Math.round(finalWidth / aspectRatio);
        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = Math.round(finalHeight * aspectRatio);
        }
      } else {
        // Portrait
        finalHeight = Math.min(height, maxHeight);
        finalWidth = Math.round(finalHeight * aspectRatio);
        if (finalWidth > maxWidth) {
          finalWidth = maxWidth;
          finalHeight = Math.round(finalWidth / aspectRatio);
        }
      }
    }
    
    // Start with sharp pipeline
    let pipeline = sharp(imageBuffer);
    
    // Apply EXIF orientation
    pipeline = pipeline.rotate();
    
    // Resize and compress
    const compressedBuffer = await pipeline
      .resize(finalWidth, finalHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        mozjpeg: true, // Better compression
      })
      .toBuffer();
    
    const originalSize = imageBuffer.length;
    const compressedSize = compressedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`  📦 Compression: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${savings}% smaller)`);
    console.log(`  📐 Size: ${width}x${height} → ${finalWidth}x${finalHeight}`);
    
    return compressedBuffer;
  } catch (error) {
    console.error(`  ❌ Compression failed:`, error.message);
    throw error;
  }
}

/**
 * Upload sector image to All-Inkl
 */
async function uploadSectorImageToAllInkl(imageBuffer, sectorId, originalUrl) {
  try {
    // Extract filename from URL or generate new one
    const urlParts = originalUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1];
    const fileName = originalFileName.replace(/\.[^/.]+$/, '.jpg') || `${sectorId}.jpg`;
    
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: fileName,
      contentType: 'image/jpeg',
    });
    
    const headers = {
      'X-File-Name': fileName,
      'X-File-Size': imageBuffer.length.toString(),
      'X-File-Type': 'image/jpeg',
      'X-Sector-Id': sectorId,
      ...formData.getHeaders(),
    };
    
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
    
    if (!result.success || !result.url) {
      throw new Error(`Upload failed: ${JSON.stringify(result)}`);
    }
    
    return result.url;
  } catch (error) {
    console.error(`  ❌ Upload failed:`, error.message);
    throw error;
  }
}

/**
 * Delete old sector image from CDN
 */
async function deleteSectorImageFromCdn(imageUrl) {
  try {
    // Only delete if it's an All-Inkl URL
    if (!imageUrl.includes('cdn.kletterwelt-sauerland.de')) {
      console.log(`  ⚠️  Skipping deletion - not an All-Inkl URL`);
      return;
    }
    
    const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      console.warn(`  ⚠️  Delete failed (continuing anyway):`, error.error || 'Unknown error');
    } else {
      console.log(`  🗑️  Deleted old image`);
    }
  } catch (error) {
    console.warn(`  ⚠️  Delete error (continuing anyway):`, error.message);
  }
}

/**
 * Main compression function
 */
async function compressSectorImages() {
  console.log('🚀 Starting sector image compression...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Fetch all sectors with images
  console.log('📥 Fetching sectors with images...');
  const { data: sectors, error } = await supabase
    .from('sectors')
    .select('id, name, image_url')
    .not('image_url', 'is', null);
  
  if (error) {
    console.error('❌ Error fetching sectors:', error);
    process.exit(1);
  }
  
  if (!sectors || sectors.length === 0) {
    console.log('✅ No sectors with images found.');
    return;
  }
  
  console.log(`📊 Found ${sectors.length} sector(s) with images\n`);
  
  // Filter out images that are already optimized
  const imagesToProcess = sectors.filter(s => {
    const url = s.image_url;
    // Skip data URLs (placeholders)
    if (url.startsWith('data:')) return false;
    return true;
  });
  
  console.log(`📋 Processing ${imagesToProcess.length} image(s)\n`);
  
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < imagesToProcess.length; i++) {
    const sector = imagesToProcess[i];
    console.log(`\n[${i + 1}/${imagesToProcess.length}] Processing: ${sector.name} (${sector.id})`);
    console.log(`  URL: ${sector.image_url}`);
    
    try {
      // Skip data URLs
      if (sector.image_url.startsWith('data:')) {
        console.log(`  ⏭️  Skipping data URL (placeholder)`);
        skippedCount++;
        continue;
      }
      
      // Download image
      console.log(`  📥 Downloading image...`);
      const imageBuffer = await downloadSectorImage(sector.image_url);
      console.log(`  ✅ Downloaded ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Compress image
      console.log(`  🗜️  Compressing image...`);
      const compressedBuffer = await compressSectorImage(imageBuffer);
      
      // Check if compression helped
      const sizeDifference = imageBuffer.length - compressedBuffer.length;
      const sizeReduction = (sizeDifference / imageBuffer.length * 100).toFixed(1);
      
      if (compressedBuffer.length >= imageBuffer.length && Math.abs(parseFloat(sizeReduction)) < 1) {
        console.log(`  ℹ️  Size similar, skipping upload`);
        skippedCount++;
        continue;
      }
      
      if (isDryRun) {
        console.log(`  🔍 DRY RUN: Would upload compressed image`);
        successCount++;
        continue;
      }
      
      // Upload compressed image
      console.log(`  📤 Uploading compressed image...`);
      const newUrl = await uploadSectorImageToAllInkl(compressedBuffer, sector.id, sector.image_url);
      
      // Update database
      console.log(`  💾 Updating database...`);
      const { error: updateError } = await supabase
        .from('sectors')
        .update({ image_url: newUrl })
        .eq('id', sector.id);
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      // Delete old image (optional, but recommended to save space)
      if (sector.image_url !== newUrl) {
        await deleteSectorImageFromCdn(sector.image_url);
      }
      
      console.log(`  ✅ Successfully compressed and updated!`);
      console.log(`  New URL: ${newUrl}`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Compression failed:`, error.message);
      errors.push({
        sector: sector.name,
        id: sector.id,
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
      console.log(`  - ${e.sector} (${e.id}): ${e.error}`);
    });
  }
  
  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN - no changes were made');
    console.log('Run without --dry-run to actually compress images');
  }
  
  console.log('\n✨ Done!');
}

// Run the script
compressSectorImages().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

