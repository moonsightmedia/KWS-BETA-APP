-- Helper function to check user roles used in RLS policies
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_text text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role::text = role_text::text
  );
$$;


