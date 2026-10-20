// Validate the built artifact at the actual routes that perform full reloads.
// No credentials, API requests or browser state are needed for this check.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

export async function verifyNativeWebAssets(directory) {
  const root = resolve(directory);
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const urls = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)]
    .map(match => match[1]).filter(url => !/^(?:https?:|data:)/.test(url));
  assert(urls.some(url => /\/assets\/.*\.js$/.test(url)), 'Built app entry is missing');
  for (const route of ['/', '/app/login', '/app/register', '/auth', '/boulders/demo', '/setter/edit']) {
    for (const source of urls) {
      const url = new URL(source, `https://localhost${route}`);
      const file = resolve(root, '.' + decodeURIComponent(url.pathname));
      assert(!relative(root, file).startsWith('..'), `Asset escapes build directory: ${source}`);
      const result = await stat(file).catch(() => null);
      assert(result?.isFile(), `Missing native asset after reload at ${route}: ${url.pathname}`);
    }
  }
  console.log(`Native reload assets verified: ${urls.length} references across 6 routes`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await verifyNativeWebAssets(process.argv[2] || 'dist');
}
