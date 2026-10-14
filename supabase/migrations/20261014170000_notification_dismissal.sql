-- Hiding a notification is reversible and never re-inserts it (no second push).
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
COMMENT ON COLUMN public.notifications.dismissed_at IS 'Owner-hidden inbox item; NULL restores it. Existing owner RLS applies.';
NOTIFY pgrst, 'reload schema';
