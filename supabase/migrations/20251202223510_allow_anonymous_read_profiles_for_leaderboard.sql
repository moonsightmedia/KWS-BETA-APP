-- Allow anonymous users (guests) to read profiles for competition leaderboard
-- This enables the leaderboard to display participant names even for guests

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Anonymous can read profiles for leaderboard'
  ) THEN
    CREATE POLICY "Anonymous can read profiles for leaderboard"
      ON public.profiles FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

