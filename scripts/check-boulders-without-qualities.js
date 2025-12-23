/**
 * Script to check boulders without quality versions
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function checkBouldersWithoutQualities() {
  console.log('🔍 Checking boulders without quality versions...\n');

  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls, created_at')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch boulders: ${error.message}`);
  }

  const bouldersWithoutQualities = [];

  (boulders || []).forEach(boulder => {
    const hasQualities = boulder.beta_video_urls && (() => {
      const q = typeof boulder.beta_video_urls === 'string' 
        ? JSON.parse(boulder.beta_video_urls) 
        : boulder.beta_video_urls;
      return !!(q.hd || q.sd || q.low);
    })();

    if (!hasQualities) {
      bouldersWithoutQualities.push({
        id: boulder.id,
        name: boulder.name,
        videoUrl: boulder.beta_video_url,
        createdAt: boulder.created_at,
      });
    }
  });

  console.log('='.repeat(60));
  console.log('📊 Boulder ohne Qualitätsversionen:');
  console.log('='.repeat(60));
  console.log(`Anzahl: ${bouldersWithoutQualities.length}\n`);

  bouldersWithoutQualities.forEach((b, i) => {
    console.log(`${i + 1}. ${b.name || 'Unbenannt'} (ID: ${b.id})`);
    console.log(`   Erstellt: ${b.createdAt ? new Date(b.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}`);
    console.log(`   Video: ${b.videoUrl}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('💡 Diese Videos haben nur das Original, keine HD/SD/Low Versionen.');
  console.log('   Sie können mit dem Multi-Quality-Script verarbeitet werden:');
  console.log('   node scripts/create-multi-quality-videos.js');
  console.log('='.repeat(60));
}

checkBouldersWithoutQualities()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });




