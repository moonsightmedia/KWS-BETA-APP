// Generates SQL only. Never connects to, changes or deploys a database.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
const base = await readFile('supabase/migrations/20260825070000_group_sectors_into_customer_areas.sql', 'utf8');
const extension = await readFile('supabase/migrations/20260914160000_extend_sector_subarea_codes.sql', 'utf8');
if (/^BEGIN;|^COMMIT;/m.test(base)) throw new Error('Unexpected transaction in base migration');
if ((extension.match(/^BEGIN;/gm) ?? []).length !== 1 || (extension.match(/^COMMIT;/gm) ?? []).length !== 1) throw new Error('Unexpected extension transaction');
const extensionBody = extension.replace(/^BEGIN;\r?\n/m, '').replace(/^COMMIT;\r?$/m, '');
const sql = `-- PREPARED, NOT EXECUTED. Scope: KWS project pkzzxtsyxwxoraytyjau only.
-- Apply only after authenticated project verification and a fresh read-only parity audit.
-- Abort on any error; do not resume fragments from a failed transaction.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
  IF to_regclass('public.sector_areas') IS NOT NULL
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sectors' AND column_name IN ('area_id', 'subarea_code')) THEN
    RAISE EXCEPTION 'Hierarchy schema already present or partially present. Stop and inspect; do not overwrite assignments.';
  END IF;
END $$;
-- Protect the before/after proof against concurrent edits while this short transaction runs.
LOCK TABLE public.sectors, public.boulders, public.sector_map_regions, public.hall_maps IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE kws_hierarchy_before ON COMMIT DROP AS SELECT
  (SELECT jsonb_agg(to_jsonb(s) - ARRAY['area_id','subarea_code','sort_order','is_active','updated_at','boulder_count'] ORDER BY s.id) FROM public.sectors s) AS sectors,
  (SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.boulders b) AS boulders,
  (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.sector_map_regions r) AS regions,
  (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM public.hall_maps m) AS maps;

${base}

${extensionBody}

DO $$
DECLARE saved record;
BEGIN
  SELECT * INTO STRICT saved FROM kws_hierarchy_before;
  IF saved.sectors IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(s) - ARRAY['area_id','subarea_code','sort_order','is_active','updated_at','boulder_count'] ORDER BY s.id) FROM public.sectors s)
    OR saved.boulders IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.boulders b)
    OR saved.regions IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.sector_map_regions r)
    OR saved.maps IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM public.hall_maps m) THEN
    RAISE EXCEPTION 'Preservation check failed: IDs, names, images, Boulder records or map geometry changed. Rolling back.';
  END IF;
  IF (SELECT count(*) FROM public.sectors) <> 19
    OR (SELECT count(DISTINCT (area_id, subarea_code)) FROM public.sectors) <> 18
    OR (SELECT count(*) FROM public.sector_areas) <> 5 THEN
    RAISE EXCEPTION 'Unexpected hierarchy counts. Rolling back.';
  END IF;
END $$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20260825070000', 'group_sectors_into_customer_areas'),
  ('20260914160000', 'extend_sector_subarea_codes');
NOTIFY pgrst, 'reload schema';
COMMIT;
-- Read back via REST after commit, and compare live-audit fingerprints.
SELECT a.name, s.subarea_code, count(*) AS physical_surfaces
FROM public.sectors s JOIN public.sector_areas a ON a.id = s.area_id
GROUP BY a.sort_order, a.name, s.subarea_code ORDER BY a.sort_order, s.subarea_code;
`;
const output = process.argv[2] ?? 'test-results/sector-map-parity-20260914';
const outputWithinReports = relative(resolve('test-results'), resolve(output));
if (!outputWithinReports || outputWithinReports.startsWith('..') || isAbsolute(outputWithinReports)) throw new Error('Report directory must be inside test-results');
await mkdir(output, { recursive: true });
await writeFile(`${output}/apply-hierarchy.sql`, sql);
const dryRun = sql.slice(0, sql.indexOf("NOTIFY pgrst, 'reload schema';")) + `ROLLBACK;
SELECT jsonb_build_object('dry_run_rolled_back', to_regclass('public.sector_areas') IS NULL,
  'hierarchy_migration_rows', (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20260825070000','20260914160000'))) AS dry_run_result;
`;
await writeFile(`${output}/dry-run-hierarchy.sql`, dryRun);
console.log('Prepared apply-hierarchy.sql. NOT executed; authentication and fresh preflight still required.');
