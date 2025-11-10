-- Fix boulders UPDATE policy to ensure setters and admins can update boulders
-- The policy must use has_role() which is SECURITY DEFINER and bypasses RLS

-- Drop existing policy if it exists (in case it was created manually)
DROP POLICY IF EXISTS "Setters can update boulders" ON public.boulders;

-- Create UPDATE policy: Setters and admins can update boulders
CREATE POLICY "Setters can update boulders" ON public.boulders
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

