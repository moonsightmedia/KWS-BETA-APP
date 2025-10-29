-- Assign default 'user' role on new auth user

CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_default_role'
  ) THEN
    CREATE TRIGGER on_auth_user_default_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();
  END IF;
END $$;

-- Backfill default role for existing users missing 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r
  ON r.user_id = u.id AND r.role = 'user'::public.app_role
WHERE r.user_id IS NULL;


