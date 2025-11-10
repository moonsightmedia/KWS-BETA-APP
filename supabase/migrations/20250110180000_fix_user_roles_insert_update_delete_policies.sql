-- Fix user_roles INSERT, UPDATE, and DELETE policies to ensure admins can manage roles
-- The policies must use has_role() which is SECURITY DEFINER and bypasses RLS

-- Drop existing policies
DROP POLICY IF EXISTS "user_roles admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles admin update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles admin delete" ON public.user_roles;

-- Create INSERT policy: Admins can insert any role
CREATE POLICY "user_roles admin insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create UPDATE policy: Admins can update any role
CREATE POLICY "user_roles admin update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create DELETE policy: Admins can delete any role
CREATE POLICY "user_roles admin delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

