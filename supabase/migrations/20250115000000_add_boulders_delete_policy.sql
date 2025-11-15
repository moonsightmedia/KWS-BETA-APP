-- Add DELETE policy for boulders table
-- Setters and admins should be able to delete boulders

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Setters can delete boulders" ON public.boulders;

-- Create DELETE policy: Setters and admins can delete boulders
CREATE POLICY "Setters can delete boulders" ON public.boulders
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

