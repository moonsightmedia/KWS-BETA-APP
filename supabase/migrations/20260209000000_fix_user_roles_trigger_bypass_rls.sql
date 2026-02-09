-- Fix triggers to properly bypass RLS during user registration
-- Both triggers must use SET search_path to ensure RLS is bypassed
-- This is critical because the triggers run during user registration before any roles exist

-- Fix assign_default_user_role trigger
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert default 'user' role for new user
  -- SECURITY DEFINER with SET search_path ensures RLS is bypassed
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Fix handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert minimal profile on new auth user
  -- SECURITY DEFINER with SET search_path ensures RLS is bypassed
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Grant execute permissions (though triggers run automatically)
GRANT EXECUTE ON FUNCTION public.assign_default_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_default_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
