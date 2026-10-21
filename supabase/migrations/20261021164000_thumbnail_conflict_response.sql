-- A changed photo is a business conflict. PT409 returns HTTP409 directly;
-- SQLSTATE40001 maps to a server error; this stack timed out on that path.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_boulder_thumbnail(
  p_boulder_id uuid, p_expected_url text, p_thumbnail_url text,
  p_original_url text, p_original_sha256 text, p_selection jsonb,
  p_color text, p_color_2 text, p_volume_only boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b public.boulders; previous public.boulder_thumbnail_sources;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'setter'::text) OR public.has_role(auth.uid(), 'admin'::text)) THEN
    RAISE EXCEPTION 'Setter-Freigabe erforderlich' USING ERRCODE = '42501';
  END IF;
  IF p_thumbnail_url IS NULL OR p_original_url IS NULL
     OR length(p_thumbnail_url) > 2000 OR length(p_original_url) > 2000
     OR p_thumbnail_url !~ '^https://(video|review-video|beta-api|review-api|beta)\.kletterwelt-sauerland\.de/(videos/|storage/v1/object/public/beta-videos/|migrated-cdn/)[^?#[:space:]]+$'
     OR p_original_url !~ '^https://(video|review-video|beta-api|review-api|beta)\.kletterwelt-sauerland\.de/(videos/|storage/v1/object/public/beta-videos/|migrated-cdn/)[^?#[:space:]]+$'
     OR p_original_sha256 IS NULL OR p_original_sha256 !~ '^[a-f0-9]{64}$'
     OR (p_selection IS NOT NULL AND (jsonb_typeof(p_selection) <> 'object' OR octet_length(p_selection::text) > 500000))
     OR (p_volume_only IS TRUE AND p_selection IS NOT NULL) THEN
    RAISE EXCEPTION 'Ungültiges Vorschaubild' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO b FROM public.boulders WHERE id = p_boulder_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Boulder nicht mehr verfügbar'; END IF;
  IF b.color IS DISTINCT FROM p_color OR b.color_2 IS DISTINCT FROM p_color_2 OR b.volume_only IS DISTINCT FROM p_volume_only THEN
    RAISE EXCEPTION 'Farbe oder Volumentyp wurde inzwischen geändert. Bitte Boulder neu öffnen.' USING ERRCODE = 'PT409';
  END IF;
  SELECT * INTO previous FROM public.boulder_thumbnail_sources WHERE boulder_id = p_boulder_id;
  -- Recover a successful transaction whose response never reached the device.
  IF b.thumbnail_url = p_thumbnail_url AND previous.thumbnail_url = p_thumbnail_url
     AND previous.original_url = p_original_url AND previous.original_sha256 = p_original_sha256
     AND previous.selection IS NOT DISTINCT FROM p_selection THEN RETURN true; END IF;
  IF b.thumbnail_url IS DISTINCT FROM p_expected_url THEN
    RAISE EXCEPTION 'Das Vorschaubild wurde inzwischen geändert. Bitte Boulder neu öffnen.' USING ERRCODE = 'PT409';
  END IF;
  UPDATE public.boulders SET thumbnail_url = p_thumbnail_url WHERE id = p_boulder_id;
  INSERT INTO public.boulder_thumbnail_sources(boulder_id, thumbnail_url, original_url, original_sha256, selection, color, color_2)
    VALUES(p_boulder_id, p_thumbnail_url, p_original_url, p_original_sha256, p_selection, p_color, p_color_2)
    ON CONFLICT (boulder_id) DO UPDATE SET thumbnail_url = excluded.thumbnail_url,
      original_url = excluded.original_url, original_sha256 = excluded.original_sha256,
      selection = excluded.selection, color = excluded.color, color_2 = excluded.color_2, updated_at = now();
  RETURN true;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;

