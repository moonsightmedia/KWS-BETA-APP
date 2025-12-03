-- Fix profiles INSERT policy to allow users to create their own profile
-- The trigger should create profiles automatically, but if it fails or is delayed,
-- users should be able to create their own profile

DO $$
BEGIN
  -- Drop existing INSERT policy if it exists
  DROP POLICY IF EXISTS "profiles insert self" ON public.profiles;
  
  -- Create new INSERT policy that allows users to create their own profile
  CREATE POLICY "profiles insert self" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());
END $$;

-- Allow authenticated users to read all profiles for leaderboard
-- This is needed so logged-in users can see participant names in the competition leaderboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Authenticated can read all profiles for leaderboard'
  ) THEN
    CREATE POLICY "Authenticated can read all profiles for leaderboard"
      ON public.profiles FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Ensure all existing auth users have profiles (backfill)
-- This uses SECURITY DEFINER to bypass RLS
DO $$
BEGIN
  INSERT INTO public.profiles (id, email)
  SELECT u.id, u.email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END $$;

