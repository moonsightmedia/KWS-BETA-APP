/** Export the approved Beta outline for native launch screens. No new artwork. */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
async function main() {
  const source = await fs.readFile(path.join(root, 'public/brand/beta-icon.svg'), 'utf8');
  const outline = source.match(/<path\b[^>]*\sd="([^"]+)"/)?.[1];
  if (!outline?.startsWith('M432 1C456.409')) throw new Error('Approved Beta outline missing');
  const write = async (name, value) => {
    const target = path.join(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value);
  };
  // 72dp symbol inside the 288dp Android splash canvas, well inside its safe circle.
  await write('android/app/src/main/res/drawable/beta_splash_symbol.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="288dp" android:height="288dp" android:viewportWidth="288" android:viewportHeight="288">
  <group android:translateX="108" android:translateY="108" android:scaleX="0.075" android:scaleY="0.075">
    <path android:fillColor="#36B531" android:fillType="evenOdd" android:pathData="${outline}" />
  </group>
</vector>
`);
  await write('android/app/src/main/res/values/beta_splash_colors.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="beta_splash_background">#FFFFFF</color></resources>\n');
  await write('android/app/src/main/res/drawable/beta_splash_background.xml', '<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/beta_splash_background" /><item android:drawable="@drawable/beta_splash_symbol" android:gravity="center" /></layer-list>\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288"><g transform="translate(108 108) scale(.075)" fill="#36B531" fill-rule="evenodd"><path d="${outline}" /></g></svg>`;
  const dir = 'ios/App/App/Assets.xcassets/BetaSplash.imageset';
  const images = [];
  for (const scale of [1, 2, 3]) {
    const filename = `beta-splash-${scale}x.png`;
    await write(`${dir}/${filename}`, await sharp(Buffer.from(svg)).resize(288 * scale).png().toBuffer());
    images.push({ idiom: 'universal', filename, scale: `${scale}x` });
  }
  await write(`${dir}/Contents.json`, JSON.stringify({ images, info: { version: 1, author: 'xcode' } }, null, 2) + '\n');
  console.log('Beta native splash resources exported from approved outline.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
