// Read-only production audit. Credentials are loaded privately and never emitted.
import { loadEnv } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import ts from 'typescript';
const env = loadEnv('production', process.cwd(), 'VITE_');
const base = env.VITE_SUPABASE_URL;
if (new URL(base).hostname !== 'pkzzxtsyxwxoraytyjau.supabase.co') throw new Error('Unexpected project; stopped');
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!key) throw new Error('Public read configuration missing');
const read = path => fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
const required = async path => { const response = await read(path); if (!response.ok) throw new Error(`Read failed: ${path.split('?')[0]} ${response.status}`); return response.json(); };
const moduleFrom = async path => {
  const source = await readFile(path, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
};
const { groupAdminSubareas, groupSectorsByArea } = await moduleFrom('src/lib/sectorAreas.ts');
const sectors = await required('sectors?select=*&order=id.asc');
const areaResponse = await read('sector_areas?select=*&order=sort_order.asc');
const areas = areaResponse.ok ? await areaResponse.json() : [];
const regions = await required('sector_map_regions?select=*&order=id.asc');
const maps = await required('hall_maps?select=*&order=id.asc');
const references = [];
let cursor = '';
for (;;) {
  const page = await required(`boulders?select=id,sector_id,sector_id_2,status&order=id.asc&limit=1000${cursor ? `&id=gt.${cursor}` : ''}`);
  if (!page.length) break;
  const next = page.at(-1).id;
  if (cursor && next <= cursor) throw new Error('Invalid pagination');
  references.push(...page); cursor = next;
}
const decorated = sectors.map(sector => {
  const activeIds = references.filter(b => (!b.status || b.status === 'haengt') && (b.sector_id === sector.id || b.sector_id_2 === sector.id)).map(b => b.id);
  return { ...sector, ...(sector.area_id ? { area: areas.find(area => area.id === sector.area_id) ?? null } : {}), active_boulder_ids: activeIds, boulder_count: activeIds.length };
});
const logical = groupAdminSubareas(decorated);
const mapNames = groupSectorsByArea(decorated).flatMap(area => area.subareas.map(subarea => subarea.name));
if (JSON.stringify(logical.map(group => group.name)) !== JSON.stringify(mapNames)) throw new Error('Admin and map names differ');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report = {
  capturedAt: new Date().toISOString(), project: 'pkzzxtsyxwxoraytyjau', readOnly: true,
  areaSchemaStatus: areaResponse.status, physicalSectors: sectors.length, logicalSubareas: logical.length,
  hierarchyColumnsPresent: sectors.every(sector => Object.hasOwn(sector, 'area_id')),
  logical: logical.map(group => ({ name: group.name, physicalNames: group.sectors.map(sector => sector.name), count: group.boulderCount })),
  adminMatchesMap: true, polygons: regions.length, maps: maps.map(map => ({ id: map.id, name: map.name, is_active: map.is_active, image_url: map.image_url })),
  missingPolygonSectorIds: sectors.filter(sector => !regions.some(region => region.sector_id === sector.id)).map(sector => sector.id),
  boulderRows: references.length, activeBoulders: references.filter(b => !b.status || b.status === 'haengt').length,
  invalidPrimaryReferences: references.filter(b => !sectors.some(sector => sector.id === b.sector_id)).length,
  fingerprints: { idsAndNames: digest(sectors.map(({ id, name }) => ({ id, name }))), boulderRelations: digest(references), regions: digest(regions), maps: digest(maps) },
};
const output = process.argv[2] ?? 'test-results/sector-map-parity-20260914';
const outputWithinReports = relative(resolve('test-results'), resolve(output));
if (!outputWithinReports || outputWithinReports.startsWith('..') || isAbsolute(outputWithinReports)) throw new Error('Report directory must be inside test-results');
await mkdir(output, { recursive: true });
await writeFile(`${output}/live-audit.json`, JSON.stringify(report, null, 2));
await writeFile(`${output}/live-sectors.json`, JSON.stringify(decorated, null, 2));
console.log(JSON.stringify(report, null, 2));
