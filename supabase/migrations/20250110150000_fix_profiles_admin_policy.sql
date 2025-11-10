-- Fix profiles admin policy to ensure admins can view all profiles
-- IMPORTANT: We MUST use has_role() function here, not a direct query on user_roles,
-- because a direct query would trigger the user_roles policy, which could cause issues
-- The has_role() function is SECURITY DEFINER, so it bypasses RLS and can safely check user_roles

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "profiles select self or admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a single comprehensive policy that allows:
-- 1. Users to see their own profile
-- 2. Admins to see all profiles
-- We use has_role() which is SECURITY DEFINER and bypasses RLS
CREATE POLICY "profiles select self or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Also create a separate policy specifically for admins (redundant but ensures it works)
-- This policy allows admins to see ALL profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

