-- Add DELETE policies for admins to delete competition_results
CREATE POLICY "Admins can delete competition_results"
  ON public.competition_results
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policies for admins to delete competition_participants
CREATE POLICY "Admins can delete competition_participants"
  ON public.competition_participants
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

