-- Fix boulders INSERT policy to ensure setters and admins can insert new boulders
-- The policy must use has_role() which is SECURITY DEFINER and bypasses RLS

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Setters can insert boulders" ON public.boulders;

-- Create INSERT policy: Setters and admins can insert boulders
CREATE POLICY "Setters can insert boulders" ON public.boulders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

