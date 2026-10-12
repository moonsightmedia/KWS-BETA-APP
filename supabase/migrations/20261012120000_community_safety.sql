-- Safety controls are enforced independently of the client, including old builds.
BEGIN;
CREATE TABLE public.community_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_blocks (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, blocked_id), CHECK (owner_id <> blocked_id)
);
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('comment','boulder','profile')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('harassment','sexual','violence','rights','other')),
  detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_at timestamptz,
  UNIQUE(reporter_id,kind,target_id), CHECK ((status='resolved')=(resolved_at IS NOT NULL))
);
CREATE TABLE public.hidden_content (
  kind text NOT NULL CHECK (kind IN ('comment','boulder','profile')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind,target_id)
);
ALTER TABLE public.boulder_comments ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved'
  CHECK (moderation_status IN ('pending','approved','rejected'));
ALTER TABLE public.boulder_comments ALTER COLUMN moderation_status SET DEFAULT 'pending';
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_bans, public.community_blocks, public.content_reports, public.hidden_content FROM anon,authenticated;
GRANT SELECT ON public.community_bans,public.community_blocks,public.content_reports,public.hidden_content TO authenticated;
CREATE POLICY bans_read ON public.community_bans FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::text));
CREATE POLICY blocks_read ON public.community_blocks FOR SELECT TO authenticated USING (owner_id=(SELECT auth.uid()));
CREATE POLICY reports_read ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::text));
CREATE POLICY hidden_read ON public.hidden_content FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'::text));

CREATE FUNCTION public.kws_community_allowed(actor uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT actor IS NOT NULL AND EXISTS(SELECT 1 FROM auth.users WHERE id=actor)
    AND NOT EXISTS(SELECT 1 FROM public.community_bans WHERE user_id=actor);
$$;
CREATE FUNCTION public.kws_content_visible(kind text,target uuid,author uuid DEFAULT NULL) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT NOT EXISTS(SELECT 1 FROM public.hidden_content h WHERE h.kind=$1 AND h.target_id=$2)
    AND NOT EXISTS(SELECT 1 FROM public.community_bans WHERE user_id=$3)
    AND NOT EXISTS(SELECT 1 FROM public.community_blocks WHERE owner_id=auth.uid() AND blocked_id=$3);
$$;
CREATE POLICY comments_visibility ON public.boulder_comments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin'::text) OR
    (public.kws_content_visible('boulder',boulder_id) AND public.kws_content_visible('comment',id,user_id) AND (moderation_status='approved' OR user_id=(SELECT auth.uid()))));
CREATE POLICY boulder_visibility ON public.boulders AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (public.has_role((SELECT auth.uid()),'admin'::text) OR public.kws_content_visible('boulder',id));
CREATE POLICY comments_insert_allowed ON public.boulder_comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.kws_community_allowed((SELECT auth.uid())) AND moderation_status='pending');
CREATE POLICY comments_update_allowed ON public.boulder_comments AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.kws_community_allowed((SELECT auth.uid())))
  WITH CHECK (public.kws_community_allowed((SELECT auth.uid())));
CREATE FUNCTION public.kws_comment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  -- Server moderation functions use a separate local flag after checking admin.
  IF current_setting('kws.moderating',true) IS DISTINCT FROM 'yes' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,1));
    IF TG_OP='INSERT' AND (SELECT count(*) FROM public.boulder_comments WHERE user_id=NEW.user_id AND created_at>now()-interval '10 minutes')>=10 THEN
      RAISE EXCEPTION 'Zu viele Kommentare. Bitte versuche es später erneut.';
    END IF;
    IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR NEW.boulder_id<>OLD.boulder_id OR NEW.id<>OLD.id) THEN
      RAISE EXCEPTION 'Die Zuordnung eines Kommentars darf nicht geändert werden.';
    END IF;
    IF TG_OP='INSERT' OR NEW.comment IS DISTINCT FROM OLD.comment THEN NEW.moderation_status := 'pending';
    ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
      RAISE EXCEPTION 'Nur die Moderation darf Kommentare freigeben.' USING ERRCODE='42501';
    END IF;
    NEW.comment := btrim(NEW.comment);
    IF char_length(NEW.comment) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Kommentare müssen 1 bis 1000 Zeichen enthalten.'; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER kws_comment_guard BEFORE INSERT OR UPDATE ON public.boulder_comments FOR EACH ROW EXECUTE FUNCTION public.kws_comment_guard();

CREATE FUNCTION public.kws_block_user(target uuid,blocked boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor) OR actor=target OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target) THEN
    RAISE EXCEPTION 'Ungültige Nutzersperre.' USING ERRCODE='42501'; END IF;
  IF blocked THEN INSERT INTO public.community_blocks(owner_id,blocked_id) VALUES(actor,target) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.community_blocks WHERE owner_id=actor AND blocked_id=target; END IF;
  RETURN jsonb_build_object('blocked',blocked);
END; $$;
CREATE FUNCTION public.kws_report_content(content_kind text,target uuid,report_reason text,report_detail text DEFAULT '') RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); subject uuid; result uuid;
BEGIN
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor) THEN RAISE EXCEPTION 'Bitte melde dich an.' USING ERRCODE='42501'; END IF;
  IF content_kind='comment' THEN
    SELECT user_id INTO subject FROM public.boulder_comments WHERE id=target AND
      (moderation_status='approved' OR user_id=actor) AND public.kws_content_visible('comment',id,user_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Kommentar nicht verfügbar.'; END IF;
  ELSIF content_kind='boulder' THEN
    IF NOT EXISTS(SELECT 1 FROM public.boulders WHERE id=target AND public.kws_content_visible('boulder',id)) THEN RAISE EXCEPTION 'Boulder nicht verfügbar.'; END IF;
  ELSIF content_kind='profile' THEN
    SELECT id INTO subject FROM public.profiles WHERE id=target;
    IF NOT FOUND THEN RAISE EXCEPTION 'Profil nicht verfügbar.'; END IF;
  ELSE RAISE EXCEPTION 'Ungültiger Inhalt.'; END IF;
  -- Serialize per actor so parallel calls cannot bypass the hourly bound.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
  SELECT id INTO result FROM public.content_reports WHERE reporter_id=actor AND kind=content_kind AND target_id=target;
  IF result IS NOT NULL THEN RETURN jsonb_build_object('id',result,'received',true); END IF;
  IF (SELECT count(*) FROM public.content_reports WHERE reporter_id=actor AND created_at>now()-interval '1 hour')>=20 THEN
    RAISE EXCEPTION 'Zu viele Meldungen. Bitte kontaktiere Marketing bei dringenden Fällen.'; END IF;
  INSERT INTO public.content_reports(reporter_id,subject_user_id,kind,target_id,reason,detail)
    VALUES(actor,subject,content_kind,target,report_reason,btrim(coalesce(report_detail,''))) RETURNING id INTO result;
  RETURN jsonb_build_object('id',result,'received',true);
END; $$;
CREATE FUNCTION public.kws_moderate_content(content_kind text,target uuid,action text,note text DEFAULT '') RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::text) OR NOT public.kws_community_allowed(auth.uid()) THEN
    RAISE EXCEPTION 'Nur die Administration darf moderieren.' USING ERRCODE='42501'; END IF;
  IF content_kind='comment' AND NOT EXISTS(SELECT 1 FROM public.boulder_comments WHERE id=target)
    OR content_kind='boulder' AND NOT EXISTS(SELECT 1 FROM public.boulders WHERE id=target)
    OR content_kind='profile' AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target) THEN
    RAISE EXCEPTION 'Inhalt nicht mehr verfügbar.'; END IF;
  IF action IN ('approve','reject') AND content_kind='comment' THEN
    PERFORM set_config('kws.moderating','yes',true);
    UPDATE public.boulder_comments SET moderation_status=CASE WHEN action='approve' THEN 'approved' ELSE 'rejected' END WHERE id=target;
    IF NOT FOUND THEN RAISE EXCEPTION 'Kommentar nicht verfügbar.'; END IF;
    -- Restore the flag: a later client mutation in this transaction must not bypass the guard.
    PERFORM set_config('kws.moderating','no',true);
  ELSIF action='hide' AND content_kind IN ('comment','boulder','profile') THEN
    INSERT INTO public.hidden_content(kind,target_id) VALUES(content_kind,target) ON CONFLICT DO NOTHING;
  ELSIF action='restore' AND content_kind IN ('comment','boulder','profile') THEN
    DELETE FROM public.hidden_content WHERE kind=content_kind AND target_id=target;
  ELSIF action='ban' AND content_kind='profile' THEN
    IF target=auth.uid() OR public.has_role(target,'admin'::text) THEN RAISE EXCEPTION 'Administratoren können hier nicht gesperrt werden.'; END IF;
    INSERT INTO public.community_bans(user_id,reason) VALUES(target,btrim(note)) ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason;
  ELSIF action='unban' AND content_kind='profile' THEN DELETE FROM public.community_bans WHERE user_id=target;
  ELSIF action='resolve' AND content_kind='report' THEN
    UPDATE public.content_reports SET status='resolved',resolved_at=now() WHERE id=target;
    IF NOT FOUND THEN RAISE EXCEPTION 'Meldung nicht verfügbar.'; END IF;
  ELSE RAISE EXCEPTION 'Ungültige Moderationsaktion.'; END IF;
  RETURN jsonb_build_object('confirmed',true);
END; $$;
-- Reviewers need the reported content, not just an opaque UUID. This RPC is
-- deliberately admin-only and never includes email addresses or private notes.
CREATE FUNCTION public.kws_open_content_reports() RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::text) OR NOT public.kws_community_allowed(auth.uid()) THEN
   RAISE EXCEPTION 'Nur die Administration darf Meldungen prüfen.' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at),'[]'::jsonb) FROM
   (SELECT reports.id,reports.kind,reports.target_id,reports.subject_user_id,reports.reason,reports.detail,reports.created_at,reports.status,
     CASE reports.kind WHEN 'comment' THEN comments.comment WHEN 'boulder' THEN b.name WHEN 'profile' THEN p.full_name END AS content_text,
     CASE WHEN reports.kind='comment' THEN comments.boulder_id WHEN reports.kind='boulder' THEN reports.target_id END AS boulder_id
    FROM public.content_reports reports
    LEFT JOIN public.boulder_comments comments ON reports.kind='comment' AND comments.id=reports.target_id
    LEFT JOIN public.boulders b ON reports.kind='boulder' AND b.id=reports.target_id
    LEFT JOIN public.profiles p ON reports.kind='profile' AND p.id=reports.target_id
    WHERE reports.status='open') r);
END; $$;
-- Keep moderation identities from outliving the underlying content/account.
CREATE FUNCTION public.kws_remove_hidden_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 DELETE FROM public.hidden_content WHERE kind=TG_ARGV[0] AND target_id=OLD.id;
 RETURN OLD;
END; $$;
CREATE TRIGGER kws_remove_hidden_profile AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.kws_remove_hidden_content('profile');
CREATE TRIGGER kws_remove_hidden_comment AFTER DELETE ON public.boulder_comments FOR EACH ROW EXECUTE FUNCTION public.kws_remove_hidden_content('comment');
CREATE TRIGGER kws_remove_hidden_boulder AFTER DELETE ON public.boulders FOR EACH ROW EXECUTE FUNCTION public.kws_remove_hidden_content('boulder');
-- Protect upload/publication paths even when old clients retain a valid JWT.
DO $$ DECLARE object text; BEGIN
  FOREACH object IN ARRAY ARRAY['boulders','boulder_ratings','boulder_grade_feedback','boulder_attribute_votes','profiles'] LOOP
    EXECUTE format('CREATE POLICY community_write_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.kws_community_allowed((SELECT auth.uid())))',object);
    EXECUTE format('CREATE POLICY community_write_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.kws_community_allowed((SELECT auth.uid()))) WITH CHECK(public.kws_community_allowed((SELECT auth.uid())))',object);
  END LOOP;
END; $$;
CREATE POLICY community_storage_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.kws_community_allowed((SELECT auth.uid())));
CREATE POLICY community_storage_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.kws_community_allowed((SELECT auth.uid()))) WITH CHECK(public.kws_community_allowed((SELECT auth.uid())));
CREATE OR REPLACE FUNCTION public.get_community_display_names(p_user_ids uuid[])
RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p.id, CASE WHEN EXISTS(SELECT 1 FROM public.hidden_content WHERE kind='profile' AND target_id=p.id)
    OR EXISTS(SELECT 1 FROM public.community_bans WHERE user_id=p.id) THEN 'Moderiertes Profil'
    ELSE coalesce(nullif(btrim(p.full_name),''),nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),'')) END
  FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.id=ANY(p_user_ids[1:100]);
$$;
REVOKE ALL ON FUNCTION public.kws_community_allowed(uuid),public.kws_content_visible(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kws_community_allowed(uuid),public.kws_content_visible(text,uuid,uuid) TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.kws_block_user(uuid,boolean),public.kws_report_content(text,uuid,text,text),public.kws_moderate_content(text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kws_block_user(uuid,boolean),public.kws_report_content(text,uuid,text,text),public.kws_moderate_content(text,uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.kws_open_content_reports() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kws_open_content_reports() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
