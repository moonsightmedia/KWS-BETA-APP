DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boulder_grade_feedback_type') THEN
    CREATE TYPE public.boulder_grade_feedback_type AS ENUM ('too_easy', 'just_right', 'too_hard');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boulder_tick_status') THEN
    CREATE TYPE public.boulder_tick_status AS ENUM ('attempted', 'top', 'flash');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.boulder_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.boulder_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boulder_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.boulder_grade_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback public.boulder_grade_feedback_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boulder_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.boulder_attribute_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.boulder_attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boulder_id, user_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS public.boulder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.boulder_ticks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.boulder_tick_status NOT NULL,
  attempt_count INTEGER CHECK (attempt_count IS NULL OR attempt_count >= 1),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boulder_id, user_id),
  CONSTRAINT boulder_ticks_attempt_logic CHECK (
    (status = 'flash' AND (attempt_count IS NULL OR attempt_count = 1)) OR
    (status = 'top' AND (attempt_count IS NULL OR attempt_count >= 1)) OR
    (status = 'attempted')
  )
);

CREATE INDEX IF NOT EXISTS idx_boulder_ratings_boulder_id ON public.boulder_ratings(boulder_id);
CREATE INDEX IF NOT EXISTS idx_boulder_grade_feedback_boulder_id ON public.boulder_grade_feedback(boulder_id);
CREATE INDEX IF NOT EXISTS idx_boulder_attribute_votes_boulder_id ON public.boulder_attribute_votes(boulder_id);
CREATE INDEX IF NOT EXISTS idx_boulder_comments_boulder_id ON public.boulder_comments(boulder_id);
CREATE INDEX IF NOT EXISTS idx_boulder_comments_created_at ON public.boulder_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boulder_ticks_boulder_id ON public.boulder_ticks(boulder_id);
CREATE INDEX IF NOT EXISTS idx_boulder_ticks_user_id ON public.boulder_ticks(user_id);

INSERT INTO public.boulder_attributes (key, label, sort_order)
VALUES
  ('powerful', 'Kraftvoll', 10),
  ('technical', 'Technisch', 20),
  ('mobile', 'Beweglich', 30),
  ('coordination', 'Koordination', 40),
  ('slab', 'Platte', 50),
  ('dynamic', 'Dynamisch', 60),
  ('endurance', 'Ausdauernd', 70)
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

ALTER TABLE public.boulder_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulder_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulder_grade_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulder_attribute_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulder_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulder_ticks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view boulder attributes" ON public.boulder_attributes;
CREATE POLICY "Authenticated users can view boulder attributes"
  ON public.boulder_attributes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage boulder attributes" ON public.boulder_attributes;
CREATE POLICY "Admins can manage boulder attributes"
  ON public.boulder_attributes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view boulder ratings" ON public.boulder_ratings;
CREATE POLICY "Authenticated users can view boulder ratings"
  ON public.boulder_ratings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own boulder ratings" ON public.boulder_ratings;
CREATE POLICY "Users can insert own boulder ratings"
  ON public.boulder_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own boulder ratings" ON public.boulder_ratings;
CREATE POLICY "Users can update own boulder ratings"
  ON public.boulder_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own boulder ratings" ON public.boulder_ratings;
CREATE POLICY "Users can delete own boulder ratings"
  ON public.boulder_ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view grade feedback" ON public.boulder_grade_feedback;
CREATE POLICY "Authenticated users can view grade feedback"
  ON public.boulder_grade_feedback
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own grade feedback" ON public.boulder_grade_feedback;
CREATE POLICY "Users can insert own grade feedback"
  ON public.boulder_grade_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own grade feedback" ON public.boulder_grade_feedback;
CREATE POLICY "Users can update own grade feedback"
  ON public.boulder_grade_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own grade feedback" ON public.boulder_grade_feedback;
CREATE POLICY "Users can delete own grade feedback"
  ON public.boulder_grade_feedback
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view attribute votes" ON public.boulder_attribute_votes;
CREATE POLICY "Authenticated users can view attribute votes"
  ON public.boulder_attribute_votes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own attribute votes" ON public.boulder_attribute_votes;
CREATE POLICY "Users can insert own attribute votes"
  ON public.boulder_attribute_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own attribute votes" ON public.boulder_attribute_votes;
CREATE POLICY "Users can delete own attribute votes"
  ON public.boulder_attribute_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.boulder_comments;
CREATE POLICY "Authenticated users can view comments"
  ON public.boulder_comments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.boulder_comments;
CREATE POLICY "Users can insert own comments"
  ON public.boulder_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.boulder_comments;
CREATE POLICY "Users can update own comments"
  ON public.boulder_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments or admin" ON public.boulder_comments;
CREATE POLICY "Users can delete own comments or admin"
  ON public.boulder_comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can view own ticks" ON public.boulder_ticks;
CREATE POLICY "Users can view own ticks"
  ON public.boulder_ticks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ticks" ON public.boulder_ticks;
CREATE POLICY "Users can insert own ticks"
  ON public.boulder_ticks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ticks" ON public.boulder_ticks;
CREATE POLICY "Users can update own ticks"
  ON public.boulder_ticks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ticks" ON public.boulder_ticks;
CREATE POLICY "Users can delete own ticks"
  ON public.boulder_ticks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at_and_edited()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_TABLE_NAME = 'boulder_comments' THEN
    NEW.edited = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_boulder_ratings_updated_at ON public.boulder_ratings;
CREATE TRIGGER trigger_boulder_ratings_updated_at
  BEFORE UPDATE ON public.boulder_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_and_edited();

DROP TRIGGER IF EXISTS trigger_boulder_grade_feedback_updated_at ON public.boulder_grade_feedback;
CREATE TRIGGER trigger_boulder_grade_feedback_updated_at
  BEFORE UPDATE ON public.boulder_grade_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_and_edited();

DROP TRIGGER IF EXISTS trigger_boulder_comments_updated_at ON public.boulder_comments;
CREATE TRIGGER trigger_boulder_comments_updated_at
  BEFORE UPDATE ON public.boulder_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_and_edited();

DROP TRIGGER IF EXISTS trigger_boulder_ticks_updated_at ON public.boulder_ticks;
CREATE TRIGGER trigger_boulder_ticks_updated_at
  BEFORE UPDATE ON public.boulder_ticks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_and_edited();

CREATE OR REPLACE FUNCTION public.get_boulder_tick_summary(p_boulder_id UUID)
RETURNS TABLE (
  flash_count INTEGER,
  top_count INTEGER,
  attempted_count INTEGER,
  total_ticks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'flash')::INTEGER AS flash_count,
    COUNT(*) FILTER (WHERE status = 'top')::INTEGER AS top_count,
    COUNT(*) FILTER (WHERE status = 'attempted')::INTEGER AS attempted_count,
    COUNT(*)::INTEGER AS total_ticks
  FROM public.boulder_ticks
  WHERE boulder_id = p_boulder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.get_boulder_tick_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_boulder_tick_summary(UUID) TO authenticated;
