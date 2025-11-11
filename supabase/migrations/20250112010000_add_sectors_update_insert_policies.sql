-- Add UPDATE and INSERT policies for sectors table
-- Setters and admins can update and insert sectors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Setters and admins can update sectors" ON public.sectors;
DROP POLICY IF EXISTS "Setters and admins can insert sectors" ON public.sectors;
DROP POLICY IF EXISTS "Setters and admins can delete sectors" ON public.sectors;

-- Create UPDATE policy: Setters and admins can update sectors
CREATE POLICY "Setters and admins can update sectors" ON public.sectors
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Create INSERT policy: Setters and admins can insert sectors
CREATE POLICY "Setters and admins can insert sectors" ON public.sectors
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Create DELETE policy: Setters and admins can delete sectors
CREATE POLICY "Setters and admins can delete sectors" ON public.sectors
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

