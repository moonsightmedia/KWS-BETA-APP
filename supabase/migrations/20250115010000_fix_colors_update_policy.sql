-- Fix colors UPDATE policy to ensure admins can update colors
-- The policy must use has_role() which is SECURITY DEFINER and bypasses RLS

-- Drop existing policy if it exists (in case it was created manually)
DROP POLICY IF EXISTS "Only admin may modify colors" ON public.colors;

-- Create separate policies for INSERT, UPDATE, and DELETE
-- This is more explicit and easier to debug than a single "FOR ALL" policy

-- INSERT policy: Admins can insert colors
CREATE POLICY "Admins can insert colors" ON public.colors
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- UPDATE policy: Admins can update colors
CREATE POLICY "Admins can update colors" ON public.colors
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- DELETE policy: Admins can delete colors
CREATE POLICY "Admins can delete colors" ON public.colors
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

