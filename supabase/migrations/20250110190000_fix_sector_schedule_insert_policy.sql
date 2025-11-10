-- Fix sector_schedule INSERT and DELETE policies to ensure setters and admins can manage schedule
-- The policies must use has_role() which is SECURITY DEFINER and bypasses RLS

-- Drop existing policies
DROP POLICY IF EXISTS "Setters and admins can insert schedule" ON public.sector_schedule;
DROP POLICY IF EXISTS "Setters and admins can delete schedule" ON public.sector_schedule;

-- Create INSERT policy: Setters and admins can insert schedule entries
CREATE POLICY "Setters and admins can insert schedule" ON public.sector_schedule
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Create DELETE policy: Setters and admins can delete schedule entries
CREATE POLICY "Setters and admins can delete schedule" ON public.sector_schedule
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'setter') 
    OR public.has_role(auth.uid(), 'admin')
  );

