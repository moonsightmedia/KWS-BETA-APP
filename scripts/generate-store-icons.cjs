/** Export the approved Beta launcher mark for Apple and Google store surfaces. */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');

async function main() {
  const source = await fs.readFile(path.join(root, 'public/brand/beta-icon.svg'), 'utf8');
  const outline = source.match(/<path\b[^>]*\sd="([^"]+)"/)?.[1];
  if (!outline?.startsWith('M432 1C456.409')) throw Error('Approved Beta outline missing');
  // Match the existing Android 72dp launcher viewport, without a baked-in mask.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="18 18 72 72"><rect width="108" height="108" fill="#36B531"/><g transform="translate(26.9548 27.20862) scale(0.0564)" fill="#FFFFFF" fill-rule="evenodd"><path d="${outline}"/></g></svg>`;
  for (const [size, relative] of [
    [1024, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'],
    [512, 'public/brand/store-icon-512.png'],
  ]) {
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await sharp(Buffer.from(svg)).resize(size, size).removeAlpha().png().toFile(target);
    const check = await sharp(target).metadata();
    if (check.width !== size || check.height !== size || check.hasAlpha) throw Error(`Invalid icon: ${relative}`);
    console.log(`${relative}: ${size}x${size}, opaque RGB`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
