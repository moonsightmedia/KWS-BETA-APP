-- Create boulder_operation_logs table for tracking create, update, and delete operations
CREATE TABLE IF NOT EXISTS public.boulder_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID REFERENCES public.boulders(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  boulder_name TEXT,
  boulder_data JSONB, -- Store the boulder data at the time of operation
  changes JSONB, -- For update operations, store what changed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_boulder_operation_logs_boulder_id ON public.boulder_operation_logs(boulder_id);
CREATE INDEX idx_boulder_operation_logs_operation_type ON public.boulder_operation_logs(operation_type);
CREATE INDEX idx_boulder_operation_logs_user_id ON public.boulder_operation_logs(user_id);
CREATE INDEX idx_boulder_operation_logs_created_at ON public.boulder_operation_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.boulder_operation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all logs
CREATE POLICY "Admins can view all boulder operation logs"
  ON public.boulder_operation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- RLS Policy: Setters can view all logs
CREATE POLICY "Setters can view all boulder operation logs"
  ON public.boulder_operation_logs
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
CREATE POLICY "Users can insert their own boulder operation logs"
  ON public.boulder_operation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add comments
COMMENT ON TABLE public.boulder_operation_logs IS 'Logs for tracking create, update, and delete operations on boulders';
COMMENT ON COLUMN public.boulder_operation_logs.operation_type IS 'Type of operation: create, update, or delete';
COMMENT ON COLUMN public.boulder_operation_logs.boulder_data IS 'Full boulder data at the time of operation';
COMMENT ON COLUMN public.boulder_operation_logs.changes IS 'For update operations, stores what fields changed';

