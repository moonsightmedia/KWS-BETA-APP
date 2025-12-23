/**
 * Check if a specific boulder's video URL is accessible
 * Usage: node scripts/check-specific-boulder-video.js "boulder name"
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

async function checkVideoUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      accessible: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message,
    };
  }
}

async function checkBoulder(boulderName) {
  console.log(`🔍 Searching for boulder: "${boulderName}"\n`);

  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .ilike('name', `%${boulderName}%`);

  if (error) {
    console.error('❌ Error fetching boulders:', error);
    process.exit(1);
  }

  if (!boulders || boulders.length === 0) {
    console.log(`❌ No boulder found matching "${boulderName}"`);
    return;
  }

  console.log(`📊 Found ${boulders.length} matching boulder(s):\n`);

  for (const boulder of boulders) {
    console.log(`📍 Boulder: ${boulder.name} (ID: ${boulder.id})`);
    console.log(`   Color: ${boulder.color || 'N/A'}`);
    console.log('');

    // Check legacy beta_video_url
    if (boulder.beta_video_url) {
      console.log(`   📹 Legacy Video URL: ${boulder.beta_video_url}`);
      const checkResult = await checkVideoUrl(boulder.beta_video_url);
      if (checkResult.accessible) {
        console.log(`   ✅ Video is accessible (Status: ${checkResult.status})`);
        if (checkResult.contentType) {
          console.log(`   📄 Content-Type: ${checkResult.contentType}`);
        }
        if (checkResult.contentLength) {
          const sizeMB = (parseInt(checkResult.contentLength) / 1024 / 1024).toFixed(2);
          console.log(`   📦 Size: ${sizeMB} MB`);
        }
      } else {
        console.log(`   ❌ Video is NOT accessible`);
        if (checkResult.status) {
          console.log(`   ⚠️  Status: ${checkResult.status} ${checkResult.statusText || ''}`);
        }
        if (checkResult.error) {
          console.log(`   ⚠️  Error: ${checkResult.error}`);
        }
      }
      console.log('');
    } else {
      console.log(`   ⚠️  No legacy beta_video_url`);
    }

    // Check beta_video_urls (multi-quality)
    if (boulder.beta_video_urls) {
      let qualityUrls;
      try {
        qualityUrls = typeof boulder.beta_video_urls === 'string' 
          ? JSON.parse(boulder.beta_video_urls) 
          : boulder.beta_video_urls;
      } catch (e) {
        console.log(`   ⚠️  Could not parse beta_video_urls: ${e.message}`);
        console.log('');
        continue;
      }

      console.log(`   📹 Multi-Quality Video URLs:`);
      
      const qualities = ['hd', 'sd', 'low'];
      for (const quality of qualities) {
        if (qualityUrls[quality]) {
          console.log(`      ${quality.toUpperCase()}: ${qualityUrls[quality]}`);
          const checkResult = await checkVideoUrl(qualityUrls[quality]);
          if (checkResult.accessible) {
            console.log(`         ✅ Accessible (Status: ${checkResult.status})`);
            if (checkResult.contentLength) {
              const sizeMB = (parseInt(checkResult.contentLength) / 1024 / 1024).toFixed(2);
              console.log(`         📦 Size: ${sizeMB} MB`);
            }
          } else {
            console.log(`         ❌ NOT accessible`);
            if (checkResult.status) {
              console.log(`         ⚠️  Status: ${checkResult.status}`);
            }
            if (checkResult.error) {
              console.log(`         ⚠️  Error: ${checkResult.error}`);
            }
          }
        } else {
          console.log(`      ${quality.toUpperCase()}: Not available`);
        }
      }
      console.log('');
    } else {
      console.log(`   ⚠️  No beta_video_urls (multi-quality)`);
    }

    if (!boulder.beta_video_url && !boulder.beta_video_urls) {
      console.log(`   ❌ No video URLs found for this boulder`);
      console.log('');
    }
  }
}

// Get boulder name from command line arguments
const boulderName = process.argv[2] || 'unvorstellbarer bär';

checkBoulder(boulderName).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});





