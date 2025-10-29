-- Create storage bucket for beta videos
-- Idempotent: creates only if not exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'beta-videos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('beta-videos', 'beta-videos', true);
  END IF;
END $$;

-- Policies to allow authenticated users to manage objects in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'beta-videos read'
  ) THEN
    CREATE POLICY "beta-videos read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'beta-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'beta-videos insert'
  ) THEN
    CREATE POLICY "beta-videos insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'beta-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'beta-videos update'
  ) THEN
    CREATE POLICY "beta-videos update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'beta-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'beta-videos delete'
  ) THEN
    CREATE POLICY "beta-videos delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'beta-videos');
  END IF;
END $$;

