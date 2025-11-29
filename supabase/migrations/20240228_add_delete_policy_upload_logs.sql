-- Add DELETE policy for upload_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'upload_logs' 
    AND policyname = 'Authenticated users can delete upload logs'
  ) THEN
    CREATE POLICY "Authenticated users can delete upload logs" 
    ON public.upload_logs FOR DELETE 
    TO authenticated 
    USING (true);
  END IF;
END
$$;


