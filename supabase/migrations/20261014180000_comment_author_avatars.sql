-- Return only a visible comment author's public photo, never private profile fields.
-- Keep get_community_display_names and profile RLS unchanged.
CREATE OR REPLACE FUNCTION public.get_comment_author_avatars(p_boulder_id uuid, p_user_ids uuid[])
RETURNS TABLE(id uuid, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p.id, CASE WHEN EXISTS(SELECT 1 FROM public.hidden_content WHERE kind='profile' AND target_id=p.id)
    OR EXISTS(SELECT 1 FROM public.community_bans WHERE user_id=p.id) THEN NULL ELSE p.avatar_url END
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id=ANY(p_user_ids[1:100]) AND EXISTS (
    SELECT 1 FROM public.boulder_comments c WHERE c.boulder_id=p_boulder_id AND c.user_id=p.id
      AND (public.has_role(auth.uid(),'admin') OR (
        public.kws_content_visible('boulder',c.boulder_id)
        AND public.kws_content_visible('comment',c.id,c.user_id)
        AND (c.moderation_status='approved' OR c.user_id=auth.uid())
      ))
  );
$$;
REVOKE ALL ON FUNCTION public.get_comment_author_avatars(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_comment_author_avatars(uuid,uuid[]) TO authenticated;
NOTIFY pgrst,'reload schema';
