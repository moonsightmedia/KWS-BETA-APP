-- Before-user-created hook; existing accounts and sign-in remain unchanged.
CREATE OR REPLACE FUNCTION public.kws_account_signup_eligibility(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  raw_date text := event #>> '{user,user_metadata,birth_date}';
  birth date;
  today date := (now() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
  IF raw_date IS NULL OR raw_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Bitte gib dein vollständiges Geburtsdatum an.'));
  END IF;
  BEGIN
    birth := raw_date::date;
  EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Bitte gib ein gültiges Geburtsdatum an.'));
  END;
  IF birth < DATE '1900-01-01' OR birth > today THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Bitte gib ein gültiges Geburtsdatum an.'));
  END IF;
  IF birth > (today - INTERVAL '16 years')::date THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Ein eigenes Konto kannst du derzeit ab 16 Jahren erstellen.'));
  END IF;
  RETURN '{}'::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.kws_account_signup_eligibility(jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.kws_account_signup_eligibility(jsonb) TO supabase_auth_admin;

COMMENT ON FUNCTION public.kws_account_signup_eligibility(jsonb) IS
  'New account policy: self-declared valid birth date, minimum age 16; not identity or parental verification.';
