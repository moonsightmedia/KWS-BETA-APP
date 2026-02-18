-- Security: Remove anonymous read-all access to profiles and provide safe leaderboard display names via RPC.
-- See security disclosure: anon could read all profiles (PII) via /rest/v1/profiles.

-- 1. Remove the policy that allowed anon to read all profiles
DROP POLICY IF EXISTS "Anonymous can read profiles for leaderboard" ON public.profiles;

-- 2. Safe RPC: return only id, first_name, last_name, full_name for user_ids that are competition participants.
-- No email, no birth_date. Callable by anon for leaderboard display.
CREATE OR REPLACE FUNCTION public.get_leaderboard_display_names(p_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(p_user_ids)
    AND p.id IN (
      SELECT cp.user_id
      FROM public.competition_participants cp
      WHERE cp.user_id IS NOT NULL
    );
$$;

-- Grant execute to anon and authenticated so leaderboard works for guests and logged-in users
GRANT EXECUTE ON FUNCTION public.get_leaderboard_display_names(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_display_names(uuid[]) TO authenticated;
