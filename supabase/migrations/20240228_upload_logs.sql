-- Migration 20240228: upload_logs table.
-- Already applied on remote; content replaced with no-op to allow repair+push without DROP TABLE (data loss).
-- Original schema is applied in later migrations (e.g. 20250131120000) and table exists.
DO $$ BEGIN NULL; END $$;
