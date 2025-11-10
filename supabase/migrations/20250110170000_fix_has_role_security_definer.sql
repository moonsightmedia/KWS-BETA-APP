-- Ensure has_role function properly bypasses RLS
-- The function must be SECURITY DEFINER and explicitly set search_path to avoid RLS issues
-- This is critical to prevent infinite recursion when policies call has_role()

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if user has the role (handles both text and enum by casting)
  -- SECURITY DEFINER means this runs with the privileges of the function owner (postgres)
  -- which bypasses RLS, preventing infinite recursion
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role::text
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon;

