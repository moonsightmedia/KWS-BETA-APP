-- Create sector_schedule table to plan upcoming sector work
CREATE TABLE IF NOT EXISTS public.sector_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sector_schedule ENABLE ROW LEVEL SECURITY;

-- Read for everyone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sector_schedule' AND policyname='Anyone can view schedule'
  ) THEN
    CREATE POLICY "Anyone can view schedule"
      ON public.sector_schedule FOR SELECT
      USING (true);
  END IF;
END $$;

-- Insert/update/delete for setters and admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sector_schedule' AND policyname='Setters and admins can insert schedule'
  ) THEN
    CREATE POLICY "Setters and admins can insert schedule"
      ON public.sector_schedule FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sector_schedule' AND policyname='Setters and admins can delete schedule'
  ) THEN
    CREATE POLICY "Setters and admins can delete schedule"
      ON public.sector_schedule FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

