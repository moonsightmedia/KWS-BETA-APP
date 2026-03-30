ALTER TABLE public.boulder_ticks
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_project BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.boulder_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result public.boulder_tick_status NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 1),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boulder_tracking_sessions_boulder_user
  ON public.boulder_tracking_sessions(boulder_id, user_id, session_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_boulder_tracking_sessions_user
  ON public.boulder_tracking_sessions(user_id, created_at DESC);

ALTER TABLE public.boulder_tracking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tracking sessions" ON public.boulder_tracking_sessions;
CREATE POLICY "Users can view own tracking sessions"
  ON public.boulder_tracking_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tracking sessions" ON public.boulder_tracking_sessions;
CREATE POLICY "Users can insert own tracking sessions"
  ON public.boulder_tracking_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tracking sessions" ON public.boulder_tracking_sessions;
CREATE POLICY "Users can update own tracking sessions"
  ON public.boulder_tracking_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tracking sessions" ON public.boulder_tracking_sessions;
CREATE POLICY "Users can delete own tracking sessions"
  ON public.boulder_tracking_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trigger_boulder_tracking_sessions_updated_at ON public.boulder_tracking_sessions;
CREATE TRIGGER trigger_boulder_tracking_sessions_updated_at
  BEFORE UPDATE ON public.boulder_tracking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_and_edited();
