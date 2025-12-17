/**
 * Direct database verification of video qualities
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyDirect() {
  console.log('🔍 Direct database verification...\n');

  const { data, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`📊 Total videos: ${data.length}\n`);

  let onlyHD = 0;
  let hasSD = 0;
  let hasLow = 0;
  let complete = 0;
  let noBetaVideoUrls = 0;

  data.forEach(b => {
    if (!b.beta_video_urls) {
      noBetaVideoUrls++;
      return;
    }

    const urls = typeof b.beta_video_urls === 'string' 
      ? JSON.parse(b.beta_video_urls) 
      : b.beta_video_urls;

    const hd = urls.hd ? '✅' : '❌';
    const sd = urls.sd ? '✅' : '❌';
    const low = urls.low ? '✅' : '❌';

    if (urls.hd && urls.sd && urls.low) {
      complete++;
    } else if (urls.hd && !urls.sd && !urls.low) {
      onlyHD++;
      if (onlyHD <= 5) {
        console.log(`Only HD: ${b.name}`);
        console.log(`  HD: ${hd}  SD: ${sd}  Low: ${low}`);
        console.log(`  URLs:`, urls);
      }
    } else {
      if (urls.sd) hasSD++;
      if (urls.low) hasLow++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 Detailed Breakdown:');
  console.log('='.repeat(60));
  console.log(`✅ Complete (HD+SD+Low): ${complete}`);
  console.log(`⚠️  Only HD (missing SD+Low): ${onlyHD}`);
  console.log(`📊 Has SD: ${hasSD}`);
  console.log(`📊 Has Low: ${hasLow}`);
  console.log(`❌ No beta_video_urls: ${noBetaVideoUrls}`);
  console.log('='.repeat(60));

  if (onlyHD > 0) {
    console.log(`\n⚠️  Found ${onlyHD} videos with only HD quality!`);
  } else {
    console.log(`\n✅ All videos have all three qualities!`);
  }
}

verifyDirect()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });

