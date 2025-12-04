-- Create competition_boulders table
CREATE TABLE IF NOT EXISTS public.competition_boulders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_number INTEGER UNIQUE NOT NULL CHECK (boulder_number >= 1 AND boulder_number <= 20),
  boulder_id UUID REFERENCES public.boulders(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create competition_participants table
CREATE TABLE IF NOT EXISTS public.competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')) DEFAULT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure either user_id or guest_name is set
  CONSTRAINT check_participant_identity CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL) OR 
    (user_id IS NULL AND guest_name IS NOT NULL AND is_guest = true)
  )
);

-- Create competition_results table
CREATE TABLE IF NOT EXISTS public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.competition_participants(id) ON DELETE CASCADE NOT NULL,
  boulder_number INTEGER NOT NULL CHECK (boulder_number >= 1 AND boulder_number <= 20),
  result_type TEXT NOT NULL CHECK (result_type IN ('flash', 'top', 'zone', 'none')),
  attempts INTEGER CHECK (attempts IS NULL OR (attempts >= 1 AND result_type = 'top')),
  points NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure unique result per participant per boulder
  UNIQUE (participant_id, boulder_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competition_boulders_number ON public.competition_boulders(boulder_number);
CREATE INDEX IF NOT EXISTS idx_competition_participants_user_id ON public.competition_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_guest ON public.competition_participants(is_guest);
CREATE INDEX IF NOT EXISTS idx_competition_results_participant ON public.competition_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_competition_results_boulder ON public.competition_results(boulder_number);

-- Create function to calculate points
CREATE OR REPLACE FUNCTION calculate_competition_points(
  p_result_type TEXT,
  p_attempts INTEGER DEFAULT NULL
) RETURNS NUMERIC AS $$
BEGIN
  CASE p_result_type
    WHEN 'flash' THEN
      RETURN 11.0;
    WHEN 'top' THEN
      -- Top: 2. Versuch = 10 Punkte, dann -0.5 pro weiterem Versuch, Minimum 5 Punkte
      -- Formel: 10 - (Versuche - 2) * 0.5
      -- Sicherstellen, dass attempts >= 2 ist (bei 1 oder NULL wird 2 verwendet)
      IF p_attempts IS NULL OR p_attempts < 2 THEN
        RETURN 10.0; -- Default: 2. Versuch = 10 Punkte
      END IF;
      RETURN GREATEST(5.0, 10.0 - (p_attempts - 2) * 0.5);
    WHEN 'zone' THEN
      RETURN 3.0;
    WHEN 'none' THEN
      RETURN 0.0;
    ELSE
      RETURN 0.0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-calculate points
CREATE OR REPLACE FUNCTION update_competition_result_points()
RETURNS TRIGGER AS $$
BEGIN
  NEW.points := calculate_competition_points(NEW.result_type, NEW.attempts);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_competition_result_points ON public.competition_results;
CREATE TRIGGER trigger_update_competition_result_points
  BEFORE INSERT OR UPDATE ON public.competition_results
  FOR EACH ROW
  EXECUTE FUNCTION update_competition_result_points();

-- Enable RLS
ALTER TABLE public.competition_boulders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_boulders
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read competition_boulders" ON public.competition_boulders;
DROP POLICY IF EXISTS "Setters and admins can insert competition_boulders" ON public.competition_boulders;
DROP POLICY IF EXISTS "Setters and admins can update competition_boulders" ON public.competition_boulders;
DROP POLICY IF EXISTS "Setters and admins can delete competition_boulders" ON public.competition_boulders;

-- Everyone can read
CREATE POLICY "Anyone can read competition_boulders"
  ON public.competition_boulders
  FOR SELECT
  USING (true);

-- Only setters and admins can write
CREATE POLICY "Setters and admins can insert competition_boulders"
  ON public.competition_boulders
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Setters and admins can update competition_boulders"
  ON public.competition_boulders
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Setters and admins can delete competition_boulders"
  ON public.competition_boulders
  FOR DELETE
  USING (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for competition_participants
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read competition_participants" ON public.competition_participants;
DROP POLICY IF EXISTS "Users can insert own participant" ON public.competition_participants;
DROP POLICY IF EXISTS "Users can update own participant" ON public.competition_participants;

-- Everyone can read
CREATE POLICY "Anyone can read competition_participants"
  ON public.competition_participants
  FOR SELECT
  USING (true);

-- Users can insert their own participant record
CREATE POLICY "Users can insert own participant"
  ON public.competition_participants
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (is_guest = true AND guest_name IS NOT NULL)
  );

-- Users can update their own participant record
CREATE POLICY "Users can update own participant"
  ON public.competition_participants
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for competition_results
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read competition_results" ON public.competition_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.competition_results;
DROP POLICY IF EXISTS "Users can update own results" ON public.competition_results;
DROP POLICY IF EXISTS "Users can delete own results" ON public.competition_results;

-- Everyone can read
CREATE POLICY "Anyone can read competition_results"
  ON public.competition_results
  FOR SELECT
  USING (true);

-- Users can insert their own results
CREATE POLICY "Users can insert own results"
  ON public.competition_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competition_participants cp
      WHERE cp.id = participant_id
      AND (
        (cp.user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
        (cp.is_guest = true)
      )
    ) OR public.has_role(auth.uid(), 'admin')
  );

-- Users can update their own results
CREATE POLICY "Users can update own results"
  ON public.competition_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_participants cp
      WHERE cp.id = participant_id
      AND (
        (cp.user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
        (cp.is_guest = true)
      )
    ) OR public.has_role(auth.uid(), 'admin')
  );

