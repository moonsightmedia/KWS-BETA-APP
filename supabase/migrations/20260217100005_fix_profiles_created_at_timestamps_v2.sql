-- Security: Fix incorrect created_at timestamps in profiles table (Version 2)
-- Previous migration found 22 mismatches but couldn't fix them due to RLS
-- This version uses SECURITY DEFINER to bypass RLS and actually fix the timestamps

-- Create SECURITY DEFINER function to bypass RLS
CREATE OR REPLACE FUNCTION public.fix_profiles_created_at_timestamps()
RETURNS TABLE(
  profiles_fixed integer,
  profiles_checked integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed integer;
  v_total integer;
BEGIN
  -- Count total mismatches
  SELECT COUNT(*) INTO v_total
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.created_at IS DISTINCT FROM u.created_at;
  
  -- Fix: Update profiles.created_at to match auth.users.created_at
  -- SECURITY DEFINER bypasses RLS, so this will work
  UPDATE public.profiles p
  SET created_at = u.created_at
  FROM auth.users u
  WHERE p.id = u.id
    AND p.created_at IS DISTINCT FROM u.created_at;
  
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  
  RAISE NOTICE 'Fixed % out of % profile timestamps', v_fixed, v_total;
  
  RETURN QUERY SELECT v_fixed, v_total;
END;
$$;

-- Execute the fix function
SELECT * FROM public.fix_profiles_created_at_timestamps();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS public.fix_profiles_created_at_timestamps();

-- Final verification
DO $$
DECLARE
  v_remaining integer;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.created_at IS DISTINCT FROM u.created_at;
  
  IF v_remaining > 0 THEN
    RAISE WARNING 'Still % profiles with timestamp mismatches after fix', v_remaining;
  ELSE
    RAISE NOTICE 'All profile timestamps are now correct!';
  END IF;
END $$;
