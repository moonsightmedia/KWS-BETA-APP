CREATE TABLE IF NOT EXISTS public.boulder_attribute_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.boulder_attributes(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boulder_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_boulder_attribute_assignments_boulder_id
  ON public.boulder_attribute_assignments(boulder_id);

ALTER TABLE public.boulder_attribute_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view attribute assignments" ON public.boulder_attribute_assignments;
CREATE POLICY "Authenticated users can view attribute assignments"
  ON public.boulder_attribute_assignments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Setters and admins can manage attribute assignments" ON public.boulder_attribute_assignments;
CREATE POLICY "Setters and admins can manage attribute assignments"
  ON public.boulder_attribute_assignments
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'setter')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'setter')
  );

WITH ranked_votes AS (
  SELECT
    boulder_id,
    attribute_id,
    (ARRAY_AGG(user_id ORDER BY created_at ASC, user_id ASC))[1] AS assigned_by,
    COUNT(*) AS vote_count,
    ROW_NUMBER() OVER (
      PARTITION BY boulder_id
      ORDER BY COUNT(*) DESC, MIN(created_at) ASC
    ) AS rank
  FROM public.boulder_attribute_votes
  GROUP BY boulder_id, attribute_id
)
INSERT INTO public.boulder_attribute_assignments (boulder_id, attribute_id, assigned_by)
SELECT boulder_id, attribute_id, assigned_by
FROM ranked_votes
WHERE rank <= 3
ON CONFLICT (boulder_id, attribute_id) DO NOTHING;
