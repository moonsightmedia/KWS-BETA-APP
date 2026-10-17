import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

test('app metadata uses local Beta branding and valid icon dimensions', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /lovable|gptengineer|Beta Dashboard/i);
  assert.match(html, /<title>Beta App · Kletterwelt Sauerland<\/title>/);
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  const preview = html.match(/property="og:image" content="([^"]+)"/)[1];
  assert.equal(new URL(preview).origin, 'https://beta.kletterwelt-sauerland.de');
  const png = readFileSync('public' + new URL(preview).pathname);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.short_name, 'Beta App');
  for (const icon of manifest.icons) {
    const data = readFileSync('public' + icon.src);
    assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`, icon.sizes);
    assert.equal(icon.purpose, 'any');
  }
  assert.deepEqual([...readFileSync('public/favicon.ico').subarray(0, 4)], [0, 0, 1, 0]);
});
