/**
 * Script to check boulders with videos that don't have all 3 quality versions (HD, SD, Low)
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

async function checkVideosMissingQualities() {
  console.log('🔍 Checking boulders with videos missing quality versions...\n');

  const { data: boulders, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls, created_at')
    .not('beta_video_url', 'is', null)
    .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch boulders: ${error.message}`);
  }

  const videosMissingQualities = [];
  const videosWithNoQualities = [];
  const videosWithPartialQualities = [];

  (boulders || []).forEach(boulder => {
    // Parse beta_video_urls
    let qualityUrls = {};
    if (boulder.beta_video_urls) {
      qualityUrls = typeof boulder.beta_video_urls === 'string' 
        ? JSON.parse(boulder.beta_video_urls) 
        : boulder.beta_video_urls;
    }

    const hasHD = !!(qualityUrls.hd || boulder.beta_video_url);
    const hasSD = !!qualityUrls.sd;
    const hasLow = !!qualityUrls.low;

    const missingQualities = [];
    if (!hasHD) missingQualities.push('HD');
    if (!hasSD) missingQualities.push('SD');
    if (!hasLow) missingQualities.push('Low');

    // If no qualities at all (only legacy beta_video_url)
    if (!hasHD && !hasSD && !hasLow && boulder.beta_video_url) {
      videosWithNoQualities.push({
        id: boulder.id,
        name: boulder.name,
        videoUrl: boulder.beta_video_url,
        createdAt: boulder.created_at,
        hasHD: false,
        hasSD: false,
        hasLow: false,
      });
    }
    // If has some but not all qualities
    else if (missingQualities.length > 0) {
      videosWithPartialQualities.push({
        id: boulder.id,
        name: boulder.name,
        videoUrl: boulder.beta_video_url,
        qualityUrls: qualityUrls,
        createdAt: boulder.created_at,
        hasHD,
        hasSD,
        hasLow,
        missingQualities,
      });
    }
  });

  // Combine both lists
  videosMissingQualities.push(...videosWithNoQualities, ...videosWithPartialQualities);

  console.log('='.repeat(80));
  console.log('📊 Boulder mit fehlenden Video-Qualitätsversionen:');
  console.log('='.repeat(80));
  console.log(`Gesamtanzahl: ${videosMissingQualities.length}\n`);
  console.log(`  - Ohne Qualitätsversionen (nur Original): ${videosWithNoQualities.length}`);
  console.log(`  - Mit teilweisen Qualitätsversionen: ${videosWithPartialQualities.length}\n`);

  if (videosWithNoQualities.length > 0) {
    console.log('─'.repeat(80));
    console.log('📹 Boulder OHNE Qualitätsversionen (nur Original-Video):');
    console.log('─'.repeat(80));
    videosWithNoQualities.forEach((b, i) => {
      console.log(`\n${i + 1}. ${b.name || 'Unbenannt'} (ID: ${b.id})`);
      console.log(`   Erstellt: ${b.createdAt ? new Date(b.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}`);
      console.log(`   Video: ${b.videoUrl}`);
      console.log(`   Fehlend: HD, SD, Low`);
    });
  }

  if (videosWithPartialQualities.length > 0) {
    console.log('\n─'.repeat(80));
    console.log('📹 Boulder MIT TEILWEISEN Qualitätsversionen:');
    console.log('─'.repeat(80));
    videosWithPartialQualities.forEach((b, i) => {
      console.log(`\n${i + 1}. ${b.name || 'Unbenannt'} (ID: ${b.id})`);
      console.log(`   Erstellt: ${b.createdAt ? new Date(b.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}`);
      console.log(`   Original: ${b.videoUrl || 'N/A'}`);
      console.log(`   HD: ${b.hasHD ? '✅' : '❌'} ${b.qualityUrls.hd || 'N/A'}`);
      console.log(`   SD: ${b.hasSD ? '✅' : '❌'} ${b.qualityUrls.sd || 'N/A'}`);
      console.log(`   Low: ${b.hasLow ? '✅' : '❌'} ${b.qualityUrls.low || 'N/A'}`);
      console.log(`   Fehlend: ${b.missingQualities.join(', ')}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  if (videosMissingQualities.length > 0) {
    console.log('💡 Diese Videos können mit dem Multi-Quality-Script verarbeitet werden:');
    console.log('   node scripts/create-multi-quality-videos.js');
  } else {
    console.log('✅ Alle Videos haben alle 3 Qualitätsversionen (HD, SD, Low)!');
  }
  console.log('='.repeat(80));

  // Summary statistics
  const stats = {
    total: boulders?.length || 0,
    withAllQualities: (boulders?.length || 0) - videosMissingQualities.length,
    missingQualities: videosMissingQualities.length,
    noQualities: videosWithNoQualities.length,
    partialQualities: videosWithPartialQualities.length,
  };

  console.log('\n📈 Zusammenfassung:');
  console.log(`   Gesamt Boulder mit Videos: ${stats.total}`);
  console.log(`   ✅ Mit allen 3 Versionen: ${stats.withAllQualities}`);
  console.log(`   ❌ Fehlende Versionen: ${stats.missingQualities}`);
  console.log(`      - Ohne Qualitäten: ${stats.noQualities}`);
  console.log(`      - Teilweise Qualitäten: ${stats.partialQualities}`);
}

checkVideosMissingQualities()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
