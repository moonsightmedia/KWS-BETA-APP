/**
 * Script to fix video URLs in the database
 * Removes /videos/ from All-Inkl URLs since videos are stored directly in uploads/
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use service role key for admin operations
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixVideoUrls() {
  console.log('🔧 Fixing video URLs in database...\n');

  try {
    // Fetch all boulders with All-Inkl video URLs that contain /videos/
    const { data: boulders, error: fetchError } = await supabase
      .from('boulders')
      .select('id, name, beta_video_url')
      .not('beta_video_url', 'is', null)
      .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%')
      .like('beta_video_url', '%/videos/%');

    if (fetchError) {
      throw new Error(`Failed to fetch boulders: ${fetchError.message}`);
    }

    if (!boulders || boulders.length === 0) {
      console.log('✅ No boulders with incorrect URLs found. All URLs are correct!');
      return;
    }

    console.log(`📋 Found ${boulders.length} boulder(s) with incorrect URLs\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < boulders.length; i++) {
      const boulder = boulders[i];
      const oldUrl = boulder.beta_video_url;
      
      // Remove /videos/ from the URL
      // https://cdn.kletterwelt-sauerland.de/uploads/videos/filename.ext
      // -> https://cdn.kletterwelt-sauerland.de/uploads/filename.ext
      const newUrl = oldUrl.replace('/uploads/videos/', '/uploads/');

      console.log(`[${i + 1}/${boulders.length}] ${boulder.name} (${boulder.id})`);
      console.log(`  Old: ${oldUrl}`);
      console.log(`  New: ${newUrl}`);

      try {
        const { error: updateError } = await supabase
          .from('boulders')
          .update({ beta_video_url: newUrl })
          .eq('id', boulder.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        // Verify the update
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
    console.log('📊 Fix Summary:');
    console.log(`  ✅ Successfully fixed: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.boulder} (${err.id}): ${err.error}`);
      });
    }

    console.log('\n✅ URL fix complete!');

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
    process.exit(1);
  }
}

fixVideoUrls();

