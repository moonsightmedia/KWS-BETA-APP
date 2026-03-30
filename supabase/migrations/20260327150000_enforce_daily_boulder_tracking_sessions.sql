WITH ranked_sessions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY boulder_id, user_id, session_date
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_num
  FROM public.boulder_tracking_sessions
)
DELETE FROM public.boulder_tracking_sessions
WHERE id IN (
  SELECT id
  FROM ranked_sessions
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_boulder_tracking_sessions_daily_unique
  ON public.boulder_tracking_sessions (boulder_id, user_id, session_date);
