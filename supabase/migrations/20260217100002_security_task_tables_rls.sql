-- Security: Enable RLS on task_comments and task_checklist_items (Supabase linter finding).
-- These tables may exist only in the hosted DB. Run only if tables exist.
-- With RLS enabled and no permissive policies, anon/authenticated get no rows (deny by default).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_comments'
  ) THEN
    ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
    -- No policy added: default deny for anon/authenticated until app-specific policies are defined
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_checklist_items'
  ) THEN
    ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
    -- No policy added: default deny for anon/authenticated until app-specific policies are defined
  END IF;
END $$;
