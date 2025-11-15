/**
 * Migration Script: Transfer all videos from Supabase to All-Inkl
 * 
 * This script:
 * 1. Finds all boulders with Supabase video URLs
 * 2. Downloads videos from Supabase
 * 3. Uploads them to All-Inkl
 * 4. Updates the database with new All-Inkl URLs
 * 
 * Usage: node scripts/migrate-videos-to-allinkl.js
 * 
 * Note: This script requires node-fetch and form-data packages
 * Install with: npm install node-fetch form-data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Try service role key first (for admin operations), fallback to publishable key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ALLINKL_API_URL = process.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
  console.error('\n⚠️  Note: Using publishable key may fail due to RLS policies. Service role key is recommended for migrations.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Download video from Supabase Storage
 */
async function downloadVideoFromSupabase(videoUrl) {
  try {
    console.log(`  📥 Downloading from Supabase: ${videoUrl}`);
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`  ✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    return buffer;
  } catch (error) {
    console.error(`  ❌ Download failed:`, error.message);
    throw error;
  }
}

/**
 * Upload video to All-Inkl using chunked upload
 */
async function uploadVideoToAllInkl(videoBuffer, fileName) {
  try {
    console.log(`  📤 Uploading to All-Inkl: ${fileName}`);
    
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
        
        // Get headers from FormData (form-data package provides getHeaders())
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
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || `Upload failed: ${response.status} ${response.statusText}` };
          }
          throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const progress = ((i + 1) / totalChunks) * 100;
        process.stdout.write(`\r  📤 Upload progress: ${progress.toFixed(1)}%`);
        
        // If this is the last chunk, return the URL
        if (i === totalChunks - 1) {
          const result = await response.json();
          console.log(`\n  ✅ Upload complete!`);
          return result.url;
        }
      }
      
      throw new Error('Upload completed but no URL returned');
    } else {
      // Single file upload for small files
      const formData = new FormData();
      formData.append('file', videoBuffer, {
        filename: fileName,
        contentType: 'video/mp4',
      });
      
      // Get headers from FormData and add custom headers
      const headers = formData.getHeaders();
      headers['X-File-Name'] = fileName;
      headers['X-File-Size'] = videoBuffer.length.toString();
      headers['X-File-Type'] = 'video/mp4';
      
      const response = await fetch(`${ALLINKL_API_URL}/upload.php`, {
        method: 'POST',
        body: formData,
        headers: headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Upload failed: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const resultText = await response.text();
      let result;
      try {
        result = JSON.parse(resultText);
      } catch {
        throw new Error(`Failed to parse response: ${resultText}`);
      }
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed: No URL returned');
      }
      
      console.log(`  ✅ Upload complete!`);
      return result.url;
    }
  } catch (error) {
    console.error(`  ❌ Upload failed:`, error.message);
    throw error;
  }
}

/**
 * Extract filename from Supabase URL
 */
function getFileNameFromUrl(url) {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  return pathParts[pathParts.length - 1] || 'video.mp4';
}

/**
 * Main migration function
 */
async function migrateVideos() {
  console.log('🚀 Starting video migration from Supabase to All-Inkl...\n');
  
  try {
    // 1. Get all boulders with Supabase video URLs
    console.log('📋 Fetching boulders with Supabase video URLs...');
    const { data: boulders, error: fetchError } = await supabase
      .from('boulders')
      .select('id, name, beta_video_url')
      .not('beta_video_url', 'is', null)
      .like('beta_video_url', '%supabase.co%');
    
    if (fetchError) {
      throw new Error(`Failed to fetch boulders: ${fetchError.message}`);
    }
    
    if (!boulders || boulders.length === 0) {
      console.log('✅ No boulders with Supabase video URLs found. Migration complete!');
      return;
    }
    
    console.log(`✅ Found ${boulders.length} boulder(s) with Supabase videos\n`);
    
    // 2. Process each boulder
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < boulders.length; i++) {
      const boulder = boulders[i];
      console.log(`\n[${i + 1}/${boulders.length}] Processing: ${boulder.name} (${boulder.id})`);
      console.log(`  URL: ${boulder.beta_video_url}`);
      
      try {
        // Download video from Supabase
        const videoBuffer = await downloadVideoFromSupabase(boulder.beta_video_url);
        
        // Get filename
        const fileName = getFileNameFromUrl(boulder.beta_video_url);
        
        // Upload to All-Inkl
        const newUrl = await uploadVideoToAllInkl(videoBuffer, fileName);
        
        // Update database
        console.log(`  💾 Updating database...`);
        const { error: updateError } = await supabase
          .from('boulders')
          .update({ beta_video_url: newUrl })
          .eq('id', boulder.id);
        
        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }
        
        // Verify the update by fetching the boulder again
        const { data: verifyData, error: verifyError } = await supabase
          .from('boulders')
          .select('beta_video_url')
          .eq('id', boulder.id)
          .maybeSingle();
        
        if (verifyError) {
          throw new Error(`Database verification failed: ${verifyError.message}`);
        }
        
        if (!verifyData || verifyData.beta_video_url !== newUrl) {
          throw new Error(`Database update verification failed. Expected: ${newUrl}, Got: ${verifyData?.beta_video_url || 'null'}`);
        }
        
        console.log(`  ✅ Successfully migrated!`);
        console.log(`  New URL: ${newUrl}`);
        console.log(`  Verified in DB: ${verifyData.beta_video_url}`);
        successCount++;
        
      } catch (error) {
        console.error(`  ❌ Migration failed:`, error.message);
        errorCount++;
        errors.push({
          boulder: boulder.name,
          id: boulder.id,
          error: error.message,
        });
      }
    }
    
    // 3. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.boulder} (${err.id}): ${err.error}`);
      });
    }
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateVideos().catch(console.error);

