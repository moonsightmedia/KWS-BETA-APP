-- Match resolveSectorArea: structured hierarchy first, legacy names only as
-- compatibility input. Do not rename physical sector records or their IDs.
CREATE OR REPLACE FUNCTION public.boulder_notification_sector_label(
  p_legacy text, p_area_name text, p_area_slug text, p_code text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE
  legacy_area text;
  legacy_slug text;
  legacy_code text;
  area_name text;
  area_slug text;
  subarea text;
  stored_code text := upper(btrim(p_code));
BEGIN
  SELECT name, slug, code INTO legacy_area, legacy_slug, legacy_code FROM (VALUES
    ('Atta-Höhle','Bug','bug','A'), ('Felsenmeer','Kurze Platte','kurze-platte','A'),
    ('Steuerbord','Bug','bug','B'), ('Bug','Bug','bug','C'), ('Buckbord','Bug','bug','D'),
    ('Zwergenwand','Couch-Ecke','couch-ecke','A'), ('Kahlwinkel','Couch-Ecke','couch-ecke','B'),
    ('Hönneportal','Top-Out','top-out','A'), ('Hintere Burgmauer','Top-Out','top-out','B'),
    ('Vollmond-klippe','Top-Out','top-out','C'), ('Vordere Burgmauer','Top-Out','top-out','D'),
    ('Phänomenturm','Lange Platte','lange-platte','A'), ('Übergang','Lange Platte','lange-platte','B'),
    ('Albsteg','Lange Platte','lange-platte','C'), ('Deckenhöhle','Lange Platte','lange-platte','D'),
    ('Avalonia','Grotte','grotte','A'), ('Durchbruch','Grotte','grotte','B'),
    ('Wandelwand','Grotte','grotte','C'), ('Bilstein','Grotte','grotte','D')
  ) mapping(legacy, name, slug, code) WHERE legacy = p_legacy;

  IF stored_code IS NULL OR stored_code !~ '^[A-Z][A-Z0-9]{0,2}$' THEN stored_code := NULL; END IF;
  area_slug := lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(p_area_slug), ''), NULLIF(btrim(p_area_name), ''))), '[[:space:]_]+', '-', 'g'));
  IF p_legacy = 'Felsenmeer' AND (area_slug IS NULL OR area_slug = 'bug')
    AND (stored_code IS NULL OR stored_code = 'A') THEN RETURN 'Kurze Platte'; END IF;

  SELECT name INTO area_name FROM (VALUES
    ('Bug','bug'), ('Couch-Ecke','couch-ecke'), ('Top-Out','top-out'),
    ('Lange Platte','lange-platte'), ('Kurze Platte','kurze-platte'), ('Grotte','grotte')
  ) canonical(name, slug) WHERE slug = area_slug OR lower(name) = lower(btrim(p_area_name)) LIMIT 1;
  area_name := COALESCE(NULLIF(btrim(p_area_name), ''), area_name, legacy_area);
  area_slug := COALESCE(area_slug, legacy_slug);
  subarea := COALESCE(stored_code, legacy_code);
  IF area_name IS NULL OR subarea IS NULL THEN RETURN p_legacy; END IF;
  IF area_slug = 'kurze-platte' AND subarea = 'A' THEN RETURN area_name; END IF;
  RETURN area_name || ' ' || subarea;
END;
$$;
REVOKE ALL ON FUNCTION public.boulder_notification_sector_label(text,text,text,text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.boulder_notification_sector_names(p_ids jsonb)
RETURNS text[] LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT COALESCE(array_agg(label ORDER BY label COLLATE "C"), '{}'::text[])
  FROM (
    SELECT DISTINCT public.boulder_notification_sector_label(s.name, a.name, a.slug, s.subarea_code) AS label
    FROM public.sectors s LEFT JOIN public.sector_areas a ON a.id = s.area_id
    WHERE s.id::text IN (SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_ids) = 'array' THEN p_ids ELSE '[]'::jsonb END))
  ) labels WHERE NULLIF(btrim(label), '') IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.boulder_notification_sector_names(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

-- Replace only the label lookup in the installed batching function. Its quiet
-- period, activity gates, locking, recipients, IDs and queue completion stay intact.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.flush_pending_boulder_notifications()'::regprocedure);
  old_lookup text := $old$  SELECT COALESCE(array_agg(s.name ORDER BY s.name COLLATE "C"), '{}'::text[]) INTO sector_names
  FROM public.sectors s WHERE s.id::text IN (SELECT jsonb_array_elements_text(sector_ids));$old$;
  new_lookup text := '  sector_names := public.boulder_notification_sector_names(sector_ids);';
BEGIN
  IF strpos(definition, new_lookup) > 0 THEN RETURN; END IF;
  IF strpos(definition, old_lookup) = 0 THEN RAISE EXCEPTION 'Batch function changed; inspect before replacing its label lookup'; END IF;
  EXECUTE replace(definition, old_lookup, new_lookup);
END;
$migration$;

-- The existing push trigger is INSERT-only. Refuse a historical correction if
-- that guarantee changed; never resend the inbox while fixing its display text.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.notifications'::regclass AND NOT t.tgisinternal
      AND p.proname = 'trigger_send_push_notification' AND (t.tgtype & 16) <> 0)
  THEN RAISE EXCEPTION 'Push trigger handles updates; historical correction would resend'; END IF;
END $$;

WITH selections AS (
  SELECT n.id, n.message, n.data,
    public.boulder_notification_sector_names(CASE
      WHEN jsonb_typeof(n.data->'sector_ids') = 'array' THEN n.data->'sector_ids'
      WHEN NULLIF(n.data->>'sector_id', '') IS NOT NULL THEN jsonb_build_array(n.data->>'sector_id')
      ELSE '[]'::jsonb END) AS names,
    CASE WHEN n.data->>'boulder_count' ~ '^[1-9][0-9]{0,8}$' THEN (n.data->>'boulder_count')::integer
      WHEN jsonb_typeof(n.data->'boulder_ids') = 'array'
      THEN GREATEST(jsonb_array_length(n.data->'boulder_ids'), 1) ELSE 1 END AS count,
    COALESCE(substring(n.message FROM ' · (.*)$'),
      CASE WHEN n.message LIKE 'Ein neuer Boulder wurde hinzugefügt: %'
        THEN substring(n.message FROM char_length('Ein neuer Boulder wurde hinzugefügt: ') + 1) END,
      b.name) AS boulder_name
  FROM public.notifications n LEFT JOIN public.boulders b
    ON b.id::text = COALESCE(n.data->>'boulder_id', n.data->>'latest_boulder_id')
  WHERE n.type = 'boulder_new' AND jsonb_typeof(n.data) = 'object'
), corrected AS (
  SELECT id, names, public.format_boulder_notification_message(count, boulder_name, names) AS message
  FROM selections WHERE cardinality(names) > 0
)
UPDATE public.notifications n SET message = c.message,
  data = jsonb_set(n.data, '{sector_names}', to_jsonb(c.names))
FROM corrected c WHERE n.id = c.id AND
  (n.message IS DISTINCT FROM c.message OR n.data->'sector_names' IS DISTINCT FROM to_jsonb(c.names));
