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
const rows = [];
// Schematic floor labels, in the same clockwise portrait orientation as the app.
const areaLabels = { bug: [145, 410], 'couch-ecke': [220, 651], 'top-out': [355, 402], 'lange-platte': [290, 272], grotte: [130, 130], 'kurze-platte': [57, 455] };
for (const [index, group] of groups.entries()) {
  const number = String(index + 1).padStart(2, '0');
  const [gx, gy] = areaLabels[group.area.slug];
  mapTags.push(`<g class="area-label">${svgText(gx, gy - 20, number, 14, 'class="area-number"')}${svgText(gx, gy, group.area.name, group.area.name.length > 10 ? 14 : 17)}</g>`);
  const cards = [];
  for (const subarea of group.subareas) {
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
    for (const anchor of anchors) mapTags.push(`<g class="sector-tag"><rect x="${anchor.x - 11}" y="${anchor.y - 12}" width="22" height="25" rx="3"/>${svgText(anchor.x, anchor.y + 6, subarea.code, 16)}</g>`);
    cards.push(`<a class="sector-qr" href="${esc(url)}" aria-label="${esc(subarea.name)} in der App öffnen"><span class="qr" data-sector="${esc(subarea.name)}" data-modules="${qr.modules.size}">${qrSVG}</span><span class="qr-label">${esc(subarea.name)}</span></a>`);
    manifest.push({ area: group.area.name, number, code: subarea.code, name: subarea.name, url, sectorIds: subarea.sectorIds,
      polygonIds: regions.map(r => r.id), mapAnchors: anchors, moduleCount: qr.modules.size, quietZoneModules: 4, sizeMm: 28 });
  }
  rows.push(`<section class="sector-row"><div class="area-heading"><span class="number">${number}</span><h2>${esc(group.area.name)}</h2></div><div class="qr-list">${cards.join('')}</div></section>`);
}
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 ${mapWidth + 24} ${mapHeight + 24}" role="img" aria-label="Hallenkarte mit allen Sektorpositionen"><defs><filter id="wall-shadow" x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="3.5" stdDeviation="3" flood-color="#192436" flood-opacity=".15"/></filter><linearGradient id="wall-face" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#f2f5f2"/></linearGradient></defs><g fill="#b8c4ba" transform="translate(0 3.5)">${paths}</g><g fill="url(#wall-face)" stroke="#bbc6bd" stroke-width=".65" stroke-linejoin="round" filter="url(#wall-shadow)">${paths}</g><g font-family="Poppins" fill="#192436" text-anchor="middle" font-weight="600">${mapTags.join('')}</g></svg>`;
await writeFile(join(output, 'hall-map.svg'), mapSvg);
await writeFile(join(output, 'qr-manifest.json'), JSON.stringify({ capturedAt: data.capturedAt, mapId: data.map.id, orientation: 'clockwise-portrait', entries: manifest }, null, 2) + '\n');
const font = async file => (await readFile(join(root, 'public/fonts', file))).toString('base64');
const logo = (await readFile(join(root, 'public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png'))).toString('base64');
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><title>KWS · Sektoren · A3</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
@font-face{font-family:Poppins;src:url(data:font/woff2;base64,${await font('poppins-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:Poppins;src:url(data:font/woff2;base64,${await font('poppins-latin-600-normal.woff2')});font-weight:600}
@font-face{font-family:Teko;src:url(data:font/woff2;base64,${await font('teko-latin-600-normal.woff2')});font-weight:600}
*{box-sizing:border-box}html,body{margin:0}body{font-family:Poppins,sans-serif;color:#192436;background:#dde5de}a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid #192436;outline-offset:3px}button{font:inherit;border:0;border-radius:8px;padding:10px 18px;color:#192436;background:#36b531;cursor:pointer}.tools{max-width:1588px;margin:16px auto;display:flex;gap:20px;align-items:center;padding:0 16px;font-size:14px}.poster{width:420mm;height:297mm;background:#f9faf9;padding:10mm 12mm 8mm;position:relative;overflow:hidden;margin:auto;print-color-adjust:exact;-webkit-print-color-adjust:exact}header{height:38mm;display:flex;justify-content:space-between;align-items:flex-start}.title-kicker{font-size:10pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase}.title-kicker b{color:#237d20}h1{font-family:Teko,sans-serif;font-weight:600;font-size:64pt;line-height:1;margin:2mm 0 0;letter-spacing:-.02em}.brand{display:flex;gap:3mm;align-items:center;margin-top:1mm}.brand img{width:20mm;height:20mm;object-fit:contain}.brand strong{font-size:14pt;display:block}.brand span{font-size:9pt;letter-spacing:.12em;text-transform:uppercase}.content{height:219mm;display:grid;grid-template-columns:142mm 1fr;gap:10mm}.map-panel{position:relative;background:#dce7dd;border-radius:3mm;padding:3mm 3mm 9mm}.map-panel svg{display:block;width:100%;height:100%}.map-meta{position:absolute;bottom:3mm;left:4mm;font-size:8pt;color:#4e5c52}.sector-tag rect{fill:white;stroke:#d0d9d2;stroke-width:.65}.area-number{fill:#237d20;font-weight:600}.directory{display:flex;flex-direction:column;justify-content:space-between}.directory-intro{height:9mm;display:flex;justify-content:space-between;align-items:flex-start;font-size:10pt}.directory-intro strong{font-weight:600}.directory-intro span{font-size:9pt;color:#546158}.sector-row{height:34mm;display:grid;grid-template-columns:47mm 1fr;gap:2mm;align-items:center;border-top:.2mm solid #dde7df}.area-heading{display:flex;gap:2mm;align-items:center}.number{background:#36b531;font-size:10pt;font-weight:600;width:8mm;height:8mm;display:flex;align-items:center;justify-content:center;border-radius:1mm;flex:none}h2{font-size:12pt;line-height:1.2;margin:0;font-weight:600}.qr-list{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm}.sector-qr{display:flex;flex-direction:column;align-items:center;gap:.7mm;min-width:0}.qr{display:block;background:white;width:28mm;height:28mm}.qr svg{width:100%;height:100%;display:block;shape-rendering:crispEdges}.qr-label{font-size:6.7pt;white-space:nowrap;font-weight:600}footer{height:19mm;margin-top:3mm;display:flex;align-items:center;justify-content:space-between;gap:6mm}.cta{display:flex;align-items:center;gap:3mm}.scan-icon{width:10mm;height:10mm;stroke:#192436;stroke-width:1.75;fill:none;background:#36b531;border-radius:2mm;padding:1.6mm}.cta strong{display:block;font-size:13pt}.cta span{font-size:9pt;color:#546158}.footer-right{text-align:right;font-size:9pt}.footer-right small{display:block;color:#546158;font-size:7pt;margin-top:1mm}body.bleed .poster{width:426mm;height:303mm;padding:13mm 15mm 11mm}
@page{size:420mm 297mm;margin:0}@media print{body{background:#f9faf9}.tools{display:none}.poster{margin:0}}
.qr-label{font-size:9pt}
</style><div class="tools"><strong>A3 · Querformat · 19 Sektoren</strong><button onclick="window.print()">Drucken / PDF</button><span>In Originalgröße (100 %) drucken.</span></div><main class="poster"><header><div><div class="title-kicker">Kletterwelt Sauerland <b>· Beta App</b></div><h1>Dein Sektor. Deine Beta.</h1></div><div class="brand"><img alt="Kletterwelt Sauerland" src="data:image/png;base64,${logo}"><div><strong>Kletterwelt</strong><span>Sauerland</span></div></div></header><div class="content"><section class="map-panel" aria-label="Orientierung">${mapSvg}<div class="map-meta">Positionen wie in der App · schematische Draufsicht</div></section><div class="directory"><div class="directory-intro"><strong>Finde deinen Bereich. Scanne deinen Sektor.</strong><span>Direkt zu den aktuellen Bouldern</span></div>${rows.join('')}</div></div><footer><div class="cta"><svg class="scan-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M5 12h14"/></svg><div><strong>Kamera auf. QR scannen. Losklettern.</strong><span>Aktuelle Boulder &amp; Beta-Videos · ohne Anmeldung ansehen</span></div></div><div class="footer-right">beta.kletterwelt-sauerland.de<small>Karte &amp; Sektoren: ${new Date(data.capturedAt).toLocaleDateString('de-DE', {timeZone:'Europe/Berlin'})}</small></div></footer></main></html>`;
await writeFile(join(output, 'kws-sektoren-a3.html'), html);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1588, height: 1123 }, deviceScaleFactor: 1 });
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
  await page.pdf({ path: join(output, 'kws-sektoren-a3.pdf'), width: '420mm', height: '297mm', printBackground: true, preferCSSPageSize: true });
  await page.locator('.poster').screenshot({ path: join(output, 'kws-sektoren-a3-preview.png'), animations: 'disabled' });
  await page.evaluate(() => document.body.classList.add('bleed'));
  await page.addStyleTag({ content: '@page{size:426mm 303mm;margin:0}' });
  await page.pdf({ path: join(output, 'kws-sektoren-a3-beschnitt.pdf'), width: '426mm', height: '303mm', printBackground: true, preferCSSPageSize: true });
  console.log(`Created A3 landscape + 3mm bleed PDF, editable HTML, SVG map and ${manifest.length} verified QR URLs.`);
} finally { await browser.close(); }
