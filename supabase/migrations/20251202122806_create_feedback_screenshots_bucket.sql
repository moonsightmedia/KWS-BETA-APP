-- Create storage bucket for feedback screenshots
-- Idempotent: creates only if not exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'feedback-screenshots'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true);
  END IF;
END $$;

-- Policies to allow anyone (including anonymous users) to upload screenshots
-- This is needed for the feedback system to work for all users

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'feedback-screenshots read'
  ) THEN
    CREATE POLICY "feedback-screenshots read" ON storage.objects
      FOR SELECT TO authenticated, anon
      USING (bucket_id = 'feedback-screenshots');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'feedback-screenshots insert'
  ) THEN
    CREATE POLICY "feedback-screenshots insert" ON storage.objects
      FOR INSERT TO authenticated, anon
      WITH CHECK (bucket_id = 'feedback-screenshots');
  END IF;
END $$;

-- Only admins can delete screenshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'feedback-screenshots delete'
  ) THEN
    CREATE POLICY "feedback-screenshots delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'feedback-screenshots' 
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

