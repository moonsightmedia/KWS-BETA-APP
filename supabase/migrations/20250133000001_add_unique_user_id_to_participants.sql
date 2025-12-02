-- Add UNIQUE constraint on user_id to prevent duplicate participants per user
-- This ensures each logged-in user can only have one participant entry

-- First, remove any duplicate entries (keep the oldest one)
DO $$
DECLARE
  duplicate_user_id UUID;
BEGIN
  -- Find and delete duplicate participants, keeping only the oldest one
  FOR duplicate_user_id IN
    SELECT user_id
    FROM public.competition_participants
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Delete all but the oldest participant for this user_id
    DELETE FROM public.competition_participants
    WHERE user_id = duplicate_user_id
      AND id NOT IN (
        SELECT id
        FROM public.competition_participants
        WHERE user_id = duplicate_user_id
        ORDER BY created_at ASC
        LIMIT 1
      );
  END LOOP;
END $$;

-- Add UNIQUE constraint on user_id (only for non-null values)
-- Note: We can't use a simple UNIQUE constraint because user_id can be NULL for guests
-- Instead, we'll use a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_competition_participants_user_id_unique
  ON public.competition_participants(user_id)
  WHERE user_id IS NOT NULL;

-- Also ensure guest_name is unique for guests (to prevent duplicate guest entries)
-- But only if guest_name is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_competition_participants_guest_name_unique
  ON public.competition_participants(guest_name)
  WHERE is_guest = true AND guest_name IS NOT NULL;

