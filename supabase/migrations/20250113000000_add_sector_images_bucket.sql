-- Create storage bucket for sector images
-- Idempotent: creates only if not exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'sector-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('sector-images', 'sector-images', true);
  END IF;
END $$;

-- Policies to allow setters and admins to manage objects in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sector-images read'
  ) THEN
    CREATE POLICY "sector-images read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'sector-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sector-images insert'
  ) THEN
    CREATE POLICY "sector-images insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'sector-images' 
        AND (
          public.has_role(auth.uid(), 'setter') 
          OR public.has_role(auth.uid(), 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sector-images update'
  ) THEN
    CREATE POLICY "sector-images update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'sector-images' 
        AND (
          public.has_role(auth.uid(), 'setter') 
          OR public.has_role(auth.uid(), 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sector-images delete'
  ) THEN
    CREATE POLICY "sector-images delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'sector-images' 
        AND (
          public.has_role(auth.uid(), 'setter') 
          OR public.has_role(auth.uid(), 'admin')
        )
      );
  END IF;
END $$;

