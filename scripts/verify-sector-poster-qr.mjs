/** Compare every module in the actual PDF raster with the encoded QR matrix. */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(join(resolve(process.env.KWS_POSTER_PACKAGE_ROOT || root), 'package.json'));
const QRCode = require('qrcode');
const sharp = require('sharp');
const entries = JSON.parse(await readFile(join(root, 'docs/print/sectors/qr-manifest.json'), 'utf8')).entries;
const layout = JSON.parse(await readFile(join(root, 'tmp/pdfs/sector-poster-layout.json'), 'utf8'));
const { data, info } = await sharp(join(root, 'tmp/pdfs/sector-poster-300.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const pxPerMm = 300 / 25.4;
let checked = 0;
for (const entry of entries) {
  const rect = layout.find(item => item.name === entry.name);
  assert(rect);
  const qr = QRCode.create(entry.url, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size + 8;
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const x = Math.round((rect.xMm + (col + .5) * entry.sizeMm / size) * pxPerMm);
    const y = Math.round((rect.yMm + (row + .5) * entry.sizeMm / size) * pxPerMm);
    const offset = (y * info.width + x) * info.channels;
    const dark = data[offset] < 128;
    const expected = row >= 4 && col >= 4 && row < size - 4 && col < size - 4 && Boolean(qr.modules.get(row - 4, col - 4));
    assert.equal(dark, expected, `${entry.name}: damaged module ${row},${col}`);
    checked++;
  }
}
assert.equal(new Set(entries.map(entry => entry.url)).size, 19);
console.log(`PASS: ${entries.length} QR codes, ${checked} printed modules including four-module quiet zones, unique production URLs.`);
