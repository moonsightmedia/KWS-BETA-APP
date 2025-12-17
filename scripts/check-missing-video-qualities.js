/**
 * Script to check how many videos are missing SD/Low qualities
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

async function checkMissingQualities() {
  console.log('🔍 Checking video qualities...\n');

  // Get all boulders with videos
  const { data: allBoulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');

  if (error) {
    console.error('❌ Error fetching boulders:', error);
    process.exit(1);
  }

  if (!allBoulders || allBoulders.length === 0) {
    console.log('✅ No videos found');
    return;
  }

  console.log(`📊 Total videos found: ${allBoulders.length}\n`);

  // Categorize videos
  const complete = [];
  const missingSD = [];
  const missingLow = [];
  const missingBoth = [];
  const noBetaVideoUrls = [];

  allBoulders.forEach(boulder => {
    if (!boulder.beta_video_urls) {
      noBetaVideoUrls.push(boulder);
      return;
    }

    const urls = typeof boulder.beta_video_urls === 'string' 
      ? JSON.parse(boulder.beta_video_urls) 
      : boulder.beta_video_urls;

    const hasHD = !!urls.hd;
    const hasSD = !!urls.sd;
    const hasLow = !!urls.low;

    // Debug: Log first few to see structure
    if (allBoulders.indexOf(boulder) < 3) {
      console.log(`\nDebug ${boulder.name}:`, {
        hasHD,
        hasSD,
        hasLow,
        urls: JSON.stringify(urls)
      });
    }

    if (hasHD && hasSD && hasLow) {
      complete.push(boulder);
    } else if (hasHD && !hasSD && hasLow) {
      missingSD.push(boulder);
    } else if (hasHD && hasSD && !hasLow) {
      missingLow.push(boulder);
    } else if (hasHD && !hasSD && !hasLow) {
      missingBoth.push(boulder);
    } else {
      noBetaVideoUrls.push(boulder);
    }
  });

  // Print summary
  console.log('='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Complete (HD + SD + Low): ${complete.length}`);
  console.log(`⚠️  Missing SD only: ${missingSD.length}`);
  console.log(`⚠️  Missing Low only: ${missingLow.length}`);
  console.log(`❌ Missing SD + Low: ${missingBoth.length}`);
  console.log(`❌ No beta_video_urls: ${noBetaVideoUrls.length}`);
  console.log('='.repeat(60));
  console.log(`\n📈 Total needing processing: ${missingSD.length + missingLow.length + missingBoth.length + noBetaVideoUrls.length}`);

  // Show some examples of each category
  if (complete.length > 0) {
    console.log(`\n✅ Example complete video:`);
    const example = complete[0];
    const urls = typeof example.beta_video_urls === 'string' 
      ? JSON.parse(example.beta_video_urls) 
      : example.beta_video_urls;
    console.log(`  ${example.name}:`, urls);
  }

  if (missingBoth.length > 0) {
    console.log(`\n❌ Example missing SD + Low:`);
    const example = missingBoth[0];
    const urls = typeof example.beta_video_urls === 'string' 
      ? JSON.parse(example.beta_video_urls) 
      : example.beta_video_urls;
    console.log(`  ${example.name}:`, urls);
  }

  // Show details if needed
  if (missingBoth.length > 0) {
    console.log('\n❌ Videos missing SD + Low:');
    missingBoth.slice(0, 10).forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
    });
    if (missingBoth.length > 10) {
      console.log(`  ... and ${missingBoth.length - 10} more`);
    }
  }

  if (missingSD.length > 0) {
    console.log('\n⚠️  Videos missing SD only:');
    missingSD.slice(0, 5).forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
    });
    if (missingSD.length > 5) {
      console.log(`  ... and ${missingSD.length - 5} more`);
    }
  }

  if (missingLow.length > 0) {
    console.log('\n⚠️  Videos missing Low only:');
    missingLow.slice(0, 5).forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
    });
    if (missingLow.length > 5) {
      console.log(`  ... and ${missingLow.length - 5} more`);
    }
  }

  if (noBetaVideoUrls.length > 0) {
    console.log('\n❌ Videos without beta_video_urls:');
    noBetaVideoUrls.slice(0, 5).forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
    });
    if (noBetaVideoUrls.length > 5) {
      console.log(`  ... and ${noBetaVideoUrls.length - 5} more`);
    }
  }
}

checkMissingQualities()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

