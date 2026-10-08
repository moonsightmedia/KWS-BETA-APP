-- Intentional security changes AFTER an exactly verified source restore.
-- Peer display names are separated from email, birth date and private profiles.
DROP POLICY IF EXISTS "Authenticated can read all profiles for leaderboard" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_community_display_names(p_user_ids uuid[])
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id,
    COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''))
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY(p_user_ids[1:100]);
$$;
REVOKE ALL ON FUNCTION public.get_community_display_names(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_community_display_names(uuid[]) TO authenticated;

ALTER POLICY "sector-images insert" ON storage.objects
  WITH CHECK (bucket_id = 'sector-images' AND
    (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')));
ALTER POLICY "sector-images update" ON storage.objects
  USING (bucket_id = 'sector-images' AND
    (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'sector-images' AND
    (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')));
ALTER POLICY "sector-images delete" ON storage.objects
  USING (bucket_id = 'sector-images' AND
    (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')));

NOTIFY pgrst, 'reload schema';
