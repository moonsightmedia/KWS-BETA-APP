-- Fix user_roles admin policy to ensure admins can view all roles
-- IMPORTANT: We MUST use has_role() function here, not a direct query on user_roles,
-- because a direct query would cause infinite recursion (policy checking user_roles needs to check user_roles)
-- The has_role() function is SECURITY DEFINER, so it bypasses RLS and can safely check user_roles

-- Drop existing policy
DROP POLICY IF EXISTS "user_roles select self or admin" ON public.user_roles;

-- Create a policy that allows:
-- 1. Users to see their own roles
-- 2. Admins to see all roles
-- We use has_role() which is SECURITY DEFINER and bypasses RLS to avoid infinite recursion
CREATE POLICY "user_roles select self or admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

