/**
 * Native Android launcher assets for approved Beta variant 03.
 * Reuses the exact outline in public/brand/beta-icon.svg; no AI regeneration.
 * Run: node scripts/generate-android-icons.cjs
 * Android 108dp layers, approved 54dp symbol, central 72dp launcher viewport.
 * https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const green = '#36B531';
const transform = 'translate(26.9548 27.20862) scale(0.0564)';

async function main() {
  const source = await fs.readFile(path.join(root, 'public/brand/beta-icon.svg'), 'utf8');
  const outline = source.match(/<path\b[^>]*\sd="([^"]+)"/)?.[1];
  if (!outline || !outline.startsWith('M432 1C456.409')) throw Error('Approved Beta outline missing');
  const write = async (name, value) => {
    const target = path.join(res, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value);
  };
  const vector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <group android:translateX="26.9548" android:translateY="27.20862" android:scaleX="0.0564" android:scaleY="0.0564">
        <path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="${outline}" />
    </group>
</vector>
`;
  await write('drawable/beta_launcher_foreground.xml', vector);
  await write('values/beta_icon_colors.xml', `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="beta_launcher_background">${green}</color></resources>\n`);
  for (const api of [26, 33]) {
    const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/beta_launcher_background" />
    <foreground android:drawable="@drawable/beta_launcher_foreground" />
${api >= 33 ? '    <monochrome android:drawable="@drawable/beta_launcher_foreground" />\n' : ''}</adaptive-icon>
`;
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      await write(`mipmap-anydpi-v${api}/${name}.xml`, adaptive);
    }
  }
  for (const [density, size] of Object.entries(densities)) {
    for (const round of [false, true]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="18 18 72 72">${round ? '<defs><clipPath id="circle"><circle cx="54" cy="54" r="36"/></clipPath></defs><g clip-path="url(#circle)">' : ''}<rect width="108" height="108" fill="${green}"/><g transform="${transform}" fill="#FFFFFF" fill-rule="evenodd"><path d="${outline}"/></g>${round ? '</g>' : ''}</svg>`;
      await write(`mipmap-${density}/ic_launcher${round ? '_round' : ''}.png`, await sharp(Buffer.from(svg)).png().toBuffer());
    }
  }
  // Remove unused KWS/Android-template layers so every remaining launcher asset
  // belongs to Beta and no stale density/round fallback can restore the old mark.
  const obsolete = ['drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml', 'values/ic_launcher_background.xml'];
  for (const density of Object.keys(densities)) {
    for (const name of ['ic_launcher_adaptive_back.png', 'ic_launcher_adaptive_fore.png', 'ic_launcher_foreground.png']) obsolete.push(`mipmap-${density}/${name}`);
  }
  for (const file of obsolete) await fs.rm(path.join(res, file), { force: true });
  console.log('Beta launcher assets generated: 10 legacy PNGs, 4 adaptive XMLs, 1 vector, 1 color.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
