/**
 * Check which video URLs are in the database
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
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUrls() {
  console.log('🔍 Checking video URLs in database...\n');

  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url')
    .not('beta_video_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching boulders:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${boulders?.length || 0} boulder(s) with videos\n`);

  const supabaseUrls = boulders?.filter(b => b.beta_video_url?.includes('supabase.co')) || [];
  const allinklUrls = boulders?.filter(b => b.beta_video_url?.includes('cdn.kletterwelt-sauerland.de')) || [];
  const otherUrls = boulders?.filter(b => 
    b.beta_video_url && 
    !b.beta_video_url.includes('supabase.co') && 
    !b.beta_video_url.includes('cdn.kletterwelt-sauerland.de')
  ) || [];

  console.log(`📊 Summary:`);
  console.log(`  ✅ All-Inkl URLs: ${allinklUrls.length}`);
  console.log(`  ❌ Supabase URLs: ${supabaseUrls.length}`);
  console.log(`  ❓ Other URLs: ${otherUrls.length}\n`);

  if (supabaseUrls.length > 0) {
    console.log('❌ Boulder with Supabase URLs:');
    supabaseUrls.forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
      console.log(`    URL: ${b.beta_video_url}`);
    });
    console.log('');
  }

  if (allinklUrls.length > 0) {
    console.log('✅ Boulder with All-Inkl URLs:');
    allinklUrls.slice(0, 5).forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
      console.log(`    URL: ${b.beta_video_url}`);
    });
    if (allinklUrls.length > 5) {
      console.log(`  ... and ${allinklUrls.length - 5} more`);
    }
    console.log('');
  }

  if (otherUrls.length > 0) {
    console.log('❓ Boulder with other URLs:');
    otherUrls.forEach(b => {
      console.log(`  - ${b.name} (${b.id})`);
      console.log(`    URL: ${b.beta_video_url}`);
    });
    console.log('');
  }
}

checkUrls();

