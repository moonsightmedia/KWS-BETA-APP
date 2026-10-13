/** A3 sector wayfinding poster. Reads only public production data; never logs keys. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'docs/print/sectors');
const require = createRequire(process.env.KWS_POSTER_PACKAGE_ROOT
  ? join(resolve(process.env.KWS_POSTER_PACKAGE_ROOT), 'package.json') : join(root, 'package.json'));
const QRCode = require('qrcode');
const ts = require('typescript');
const { chromium } = require('playwright');
const source = await readFile(join(root, 'src/lib/sectorAreas.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { groupSectorsByArea } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const web = 'https://beta.kletterwelt-sauerland.de';
const api = 'https://beta-api.kletterwelt-sauerland.de';
await mkdir(output, { recursive: true });

if (process.argv.includes('--capture')) {
  const html = await (await fetch(web, { signal: AbortSignal.timeout(15000) })).text();
  const main = html.match(/src="([^\"]*\/assets\/index-[^\"]+\.js)"/)?.[1];
  assert(main, 'Production bundle missing');
  const bundle = await (await fetch(new URL(main, web), { signal: AbortSignal.timeout(15000) })).text();
  const key = (bundle.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []).find(value => {
    try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role === 'anon'; } catch { return false; }
  });
  assert(key, 'Public read configuration unavailable');
  const read = async path => {
    const response = await fetch(`${api}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000),
    });
    assert(response.ok, `Public GET ${path.split('?')[0]} HTTP ${response.status}`);
    return response.json();
  };
  const [maps, sectors, areas, regions] = await Promise.all([
    read('hall_maps?select=id,name,width,height,is_active&is_active=eq.true'),
    read('sectors?select=id,name,area_id,subarea_code,sort_order&order=id.asc'),
    read('sector_areas?select=id,name,slug,sort_order&order=sort_order.asc'),
    read('sector_map_regions?select=id,hall_map_id,sector_id,points_json,label_x,label_y,z_index&order=z_index.asc'),
  ]);
  assert.equal(maps.length, 1, 'Exactly one active map required');
  const data = { capturedAt: new Date().toISOString(), web, api, readOnly: true, map: maps[0], sectors, areas,
    regions: regions.filter(region => region.hall_map_id === maps[0].id) };
  await writeFile(join(output, 'sectors-source.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(`Captured ${sectors.length} public sectors and ${data.regions.length} polygons; no credentials saved.`);
  if (process.argv.includes('--capture-only')) process.exit(0);
}

const data = JSON.parse(await readFile(join(output, 'sectors-source.json'), 'utf8'));
assert.equal(data.web, web);
const sectors = data.sectors.map(sector => ({ ...sector, area: data.areas.find(area => area.id === sector.area_id) }));
const groups = groupSectorsByArea(sectors).filter(group => group.subareas.length);
assert.equal(groups.length, 6, 'Review layout before publishing a changed area catalog');
assert.equal(groups.flatMap(group => group.subareas).length, 19, 'Review layout for changed sector count');
assert.equal(groups.find(group => group.area.slug === 'bug').subareas.filter(sector => sector.code === 'A').length, 1);
assert.equal(groups.find(group => group.area.slug === 'kurze-platte').subareas[0].name, 'Kurze Platte');
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const svgText = (x, y, text, size = 16, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(text)}</text>`;
const point = p => ({ x: (100 - Number(p.y)) * data.map.height / 100, y: Number(p.x) * data.map.width / 100 });
const mapWidth = Number(data.map.height), mapHeight = Number(data.map.width);
const paths = data.regions.map(region => {
  assert(region.points_json.length >= 3);
  return `<polygon points="${region.points_json.map(p => { assert(Number(p.x) >= 0 && Number(p.x) <= 100 && Number(p.y) >= 0 && Number(p.y) <= 100); const q = point(p); return `${q.x},${q.y}`; }).join(' ')}"/>`;
}).join('');
const manifest = [];
const mapTags = [];
const leftCards = [], rightCards = [];
// Schematic floor labels, in the same clockwise portrait orientation as the app.
const areaLabels = { bug: [95, 405], 'couch-ecke': [220, 632], 'top-out': [355, 402], 'lange-platte': [332, 260], grotte: [130, 130], 'kurze-platte': [68, 462] };
for (const [index, group] of groups.entries()) {
  const areaNumber = String(index + 1).padStart(2, '0');
  const [gx, gy] = areaLabels[group.area.slug];
  const labelLines = group.area.name.includes('Platte') ? group.area.name.split(' ') : [group.area.name];
  mapTags.push(`<g class="area-label">${labelLines.map((line, i) => svgText(gx, gy + i * 20, line, group.area.slug === 'kurze-platte' ? 14 : 18)).join('')}</g>`);
  const cards = [];
  for (const subarea of group.subareas) {
    const number = String(manifest.length + 1).padStart(2, '0');
    const url = `${web}/guest?sector=${encodeURIComponent(subarea.name)}`;
    assert.equal(new URL(url).searchParams.get('sector'), subarea.name);
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const qrSVG = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#192436', light: '#ffffff' } });
    const regions = data.regions.filter(region => subarea.sectorIds.includes(region.sector_id));
    assert(regions.length, `No polygon for ${subarea.name}`);
    const anchors = regions.map(region => {
      assert(region.label_x !== null && region.label_y !== null, `Missing anchor: ${subarea.name}`);
      return point({ x: region.label_x, y: region.label_y });
    });
    for (const anchor of anchors) mapTags.push(`<g class="sector-tag"><rect x="${anchor.x - 21}" y="${anchor.y - 12}" width="42" height="25" rx="3"/>${svgText(anchor.x - 11, anchor.y + 4, number, 9, 'class="link-number"')}${svgText(anchor.x + 8, anchor.y + 6, subarea.code, 16)}</g>`);
    cards.push(`<a class="sector-qr" href="${esc(url)}" aria-label="${esc(subarea.name)} in der App öffnen"><span class="qr" data-sector="${esc(subarea.name)}" data-modules="${qr.modules.size}">${qrSVG}</span><span class="qr-label"><span class="link-number">${number}</span> ${esc(subarea.name)}</span></a>`);
    manifest.push({ area: group.area.name, areaNumber, number, code: subarea.code, name: subarea.name, url, sectorIds: subarea.sectorIds,
      polygonIds: regions.map(r => r.id), mapAnchors: anchors, moduleCount: qr.modules.size, quietZoneModules: 4, sizeMm: 24 });
  }
  (['grotte', 'bug', 'kurze-platte'].includes(group.area.slug) ? leftCards : rightCards).push(...cards.map((card, i) => ({ card, y: manifest.find(item => item.name === group.subareas[i].name).mapAnchors[0].y })));
}
leftCards.sort((a, b) => a.y - b.y); rightCards.sort((a, b) => a.y - b.y);
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 ${mapWidth + 24} ${mapHeight + 24}" role="img" aria-label="Hallenkarte mit allen Sektorpositionen"><defs><filter id="wall-shadow" x="-50%" y="-40%" width="200%" height="210%"><feDropShadow dx="1" dy="7" stdDeviation="5" flood-color="#192436" flood-opacity=".2"/></filter><linearGradient id="wall-face" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#ffffff"/><stop offset=".7" stop-color="#fafbf9"/><stop offset="1" stop-color="#e9eeea"/></linearGradient></defs><g fill="#aebbb0" transform="translate(0 5)">${paths}</g><g fill="url(#wall-face)" stroke="#c0cdc1" stroke-width=".8" stroke-linejoin="round" filter="url(#wall-shadow)">${paths}</g><g fill="none" stroke="#ffffff" stroke-width="1.3" opacity=".6" transform="translate(0 -.7)">${paths}</g><g font-family="Poppins" fill="#192436" text-anchor="middle" font-weight="600">${mapTags.join('')}</g></svg>`;
await writeFile(join(output, 'hall-map.svg'), mapSvg);
await writeFile(join(output, 'qr-manifest.json'), JSON.stringify({ capturedAt: data.capturedAt, mapId: data.map.id, orientation: 'clockwise-portrait', entries: manifest }, null, 2) + '\n');
const font = async file => (await readFile(join(root, 'public/fonts', file))).toString('base64');
const logo = (await readFile(join(root, 'public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png'))).toString('base64');
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><title>KWS · Sektoren · A3</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
@font-face{font-family:Poppins;src:url(data:font/woff2;base64,${await font('poppins-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:Poppins;src:url(data:font/woff2;base64,${await font('poppins-latin-600-normal.woff2')});font-weight:600}
@font-face{font-family:Teko;src:url(data:font/woff2;base64,${await font('teko-latin-600-normal.woff2')});font-weight:600}
${await readFile(join(root, 'scripts/sector-poster.css'), 'utf8')}
</style><div class="tools"><strong>A3 · Hochformat · Sektorenatlas</strong><button onclick="window.print()">Drucken / PDF</button><span>In Originalgröße (100 %) drucken.</span></div><main class="poster"><header><div class="brand"><img alt="Kletterwelt Sauerland" src="data:image/png;base64,${logo}"><div><strong>Kletterwelt</strong><span>Sauerland</span></div></div><h1><span>DEINE HALLE.</span><span>DEINE BETA.</span></h1></header><div class="content"><aside class="code-column" aria-label="Sektoren links">${leftCards.map(item => item.card).join('')}</aside><section class="map-panel" aria-label="Orientierung">${mapSvg}<div class="map-meta">Schematische Hallenkarte · Positionen wie in der App</div></section><aside class="code-column" aria-label="Sektoren rechts">${rightCards.map(item => item.card).join('')}</aside></div><footer><div class="cta"><strong>Deinen Sektor scannen. Beta ansehen.</strong><span>Aktuelle Boulder &amp; Videos · ohne Anmeldung</span></div><div class="footer-right">beta.kletterwelt-sauerland.de<small>Stand ${new Date(data.capturedAt).toLocaleDateString('de-DE', {timeZone:'Europe/Berlin'})}</small></div></footer></main></html>`;
await writeFile(join(output, 'kws-sektoren-a3.html'), html);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1123, height: 1588 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(output, 'kws-sektoren-a3.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.sector-qr').count(), 19);
  const clipping = await page.locator('.poster').evaluate(poster => {
    const p = poster.getBoundingClientRect();
    return [...poster.querySelectorAll('h1,h2,.qr,.qr-label,.cta,.footer-right')].filter(el => {
      const b = el.getBoundingClientRect(); return b.left < p.left || b.right > p.right || b.top < p.top || b.bottom > p.bottom || el.scrollWidth > el.clientWidth + 1;
    }).map(el => el.textContent);
  });
  assert.deepEqual(clipping, [], 'Poster content clipped');
  const layout = await page.locator('.qr').evaluateAll(elements => elements.map(element => {
    const b = element.getBoundingClientRect();
    const p = element.closest('.poster').getBoundingClientRect();
    return { name: element.dataset.sector, xMm: (b.x - p.x) * 25.4 / 96, yMm: (b.y - p.y) * 25.4 / 96 };
  }));
  await mkdir(join(root, 'tmp/pdfs'), { recursive: true });
  await writeFile(join(root, 'tmp/pdfs/sector-poster-layout.json'), JSON.stringify(layout, null, 2));
  await page.pdf({ path: join(output, 'kws-sektoren-a3.pdf'), width: '297mm', height: '420mm', printBackground: true, preferCSSPageSize: true });
  await page.locator('.poster').screenshot({ path: join(output, 'kws-sektoren-a3-preview.png'), animations: 'disabled' });
  await page.evaluate(() => document.body.classList.add('bleed'));
  await page.addStyleTag({ content: '@page{size:303mm 426mm;margin:0}' });
  await page.pdf({ path: join(output, 'kws-sektoren-a3-beschnitt.pdf'), width: '303mm', height: '426mm', printBackground: true, preferCSSPageSize: true });
  console.log(`Created A3 portrait + 3mm bleed PDF, editable HTML, SVG map and ${manifest.length} verified QR URLs.`);
} finally { await browser.close(); }
