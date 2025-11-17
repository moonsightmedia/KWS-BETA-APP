-- Create upload_logs table for tracking video and thumbnail uploads
CREATE TABLE IF NOT EXISTS public.upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_session_id TEXT NOT NULL,
  boulder_id UUID REFERENCES public.boulders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'thumbnail')),
  upload_type TEXT NOT NULL CHECK (upload_type IN ('allinkl', 'supabase')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'compressing', 'uploading', 'completed', 'failed', 'duplicate')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  error_details JSONB,
  final_url TEXT,
  chunk_info JSONB,
  device_info JSONB,
  network_info JSONB,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_upload_logs_session_id ON public.upload_logs(upload_session_id);
CREATE INDEX idx_upload_logs_boulder_id ON public.upload_logs(boulder_id);
CREATE INDEX idx_upload_logs_status ON public.upload_logs(status);
CREATE INDEX idx_upload_logs_created_at ON public.upload_logs(created_at DESC);
CREATE INDEX idx_upload_logs_file_name ON public.upload_logs(file_name);

-- Add file_hash column for duplicate detection
ALTER TABLE public.upload_logs ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_upload_logs_file_hash ON public.upload_logs(file_hash);

-- Add user_id column to track who uploaded
ALTER TABLE public.upload_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_upload_logs_user_id ON public.upload_logs(user_id);

-- Enable RLS
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can see all logs
CREATE POLICY "Admins can view all upload logs"
  ON public.upload_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- RLS Policy: Setters can view all logs (they need to see their uploads)
CREATE POLICY "Setters can view all upload logs"
  ON public.upload_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'setter'
    )
  );

-- RLS Policy: Users can insert their own logs
CREATE POLICY "Users can insert their own upload logs"
  ON public.upload_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policy: Users can update their own logs
CREATE POLICY "Users can update their own upload logs"
  ON public.upload_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policy: Admins can update all logs
CREATE POLICY "Admins can update all upload logs"
  ON public.upload_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_upload_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_upload_logs_updated_at
  BEFORE UPDATE ON public.upload_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_upload_logs_updated_at();

-- Add comments
COMMENT ON TABLE public.upload_logs IS 'Logs for tracking video and thumbnail uploads';
COMMENT ON COLUMN public.upload_logs.upload_session_id IS 'Unique session ID for each upload attempt';
COMMENT ON COLUMN public.upload_logs.file_hash IS 'SHA-256 hash of the file for duplicate detection';
COMMENT ON COLUMN public.upload_logs.device_info IS 'Device information (user agent, platform, etc.)';
COMMENT ON COLUMN public.upload_logs.network_info IS 'Network information (connection type, speed, etc.)';
COMMENT ON COLUMN public.upload_logs.chunk_info IS 'Information about chunked uploads';
