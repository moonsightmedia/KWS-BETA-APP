-- The historical public-wide SELECT policy bypasses the asynchronous video
-- publication gate. Anonymous and authenticated readers are covered by the
-- lifecycle-aware policies created in the preceding migration; service_role
-- bypasses RLS and setter/admin retain their explicit manager branch.
DROP POLICY IF EXISTS "Anyone can view boulders" ON public.boulders;
