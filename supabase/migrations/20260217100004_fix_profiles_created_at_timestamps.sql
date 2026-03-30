-- Security: Fix incorrect created_at timestamps in profiles table
-- Some users may have incorrect timestamps due to trigger updates
-- This migration syncs profiles.created_at with auth.users.created_at (the original registration time)

-- First, check which profiles have incorrect timestamps
-- Compare profiles.created_at with auth.users.created_at
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Count profiles where created_at doesn't match auth.users.created_at
  SELECT COUNT(*) INTO v_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.created_at IS DISTINCT FROM u.created_at;
  
  RAISE NOTICE 'Found % profiles with timestamp mismatches', v_count;
END $$;

-- Fix: Update profiles.created_at to match auth.users.created_at
-- This ensures the registration timestamp is preserved correctly
-- Use SECURITY DEFINER function to bypass RLS
CREATE OR REPLACE FUNCTION public.fix_profiles_created_at()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed integer;
BEGIN
  UPDATE public.profiles p
  SET created_at = u.created_at
  FROM auth.users u
  WHERE p.id = u.id
    AND p.created_at IS DISTINCT FROM u.created_at;
  
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  RAISE NOTICE 'Fixed % profile timestamps', v_fixed;
END;
$$;

-- Execute the fix function
SELECT public.fix_profiles_created_at();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS public.fix_profiles_created_at();

-- Log how many were fixed
DO $$
DECLARE
  v_fixed integer;
BEGIN
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  RAISE NOTICE 'Fixed % profile timestamps', v_fixed;
END $$;

-- Verify: Check that all timestamps now match
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
    RAISE NOTICE 'All profile timestamps are now correct';
  END IF;
END $$;
