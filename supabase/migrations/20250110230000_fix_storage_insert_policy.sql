-- Fix storage INSERT policy to ensure setters and admins can upload videos
-- The policy must use has_role() which is SECURITY DEFINER and bypasses RLS

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "beta-videos insert" ON storage.objects;

-- Create INSERT policy: Setters and admins can insert videos
CREATE POLICY "beta-videos insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'beta-videos' 
    AND (
      public.has_role(auth.uid(), 'setter') 
      OR public.has_role(auth.uid(), 'admin')
    )
  );

