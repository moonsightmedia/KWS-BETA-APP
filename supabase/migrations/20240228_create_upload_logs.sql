-- Drop existing table to ensure clean state and avoid conflicts
DROP TABLE IF EXISTS public.upload_logs;

-- Create upload_logs table
CREATE TABLE public.upload_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL, -- Changed from UUID to TEXT to match frontend generated ID
    boulder_id UUID REFERENCES public.boulders(id),
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'thumbnail')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'uploading', 'completed', 'failed')),
    progress FLOAT DEFAULT 0,
    error TEXT,
    file_name TEXT,
    file_size BIGINT,
    total_chunks INTEGER,
    uploaded_chunks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_logs_session_id ON public.upload_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_boulder_id ON public.upload_logs(boulder_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_status ON public.upload_logs(status);

-- Enable Row Level Security
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage their own logs
-- (Assuming we link logs to users implicitly via boulder ownership or just allow all authenticated)
-- For simplicity, allow all authenticated users to read/write
CREATE POLICY "Authenticated users can view upload logs" 
ON public.upload_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert upload logs" 
ON public.upload_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update upload logs" 
ON public.upload_logs FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete upload logs" 
ON public.upload_logs FOR DELETE 
TO authenticated 
USING (true);

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_upload_logs_updated_at
    BEFORE UPDATE ON public.upload_logs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Set up Realtime
-- Note: supabase_realtime publication might already exist, so we just try to add the table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'upload_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_logs;
  END IF;
END
$$;
