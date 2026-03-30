INSERT INTO public.boulder_attributes (key, label, sort_order, is_active)
VALUES
  ('partner_boulder', 'Partnerboulder', 80, true),
  ('dual_color', 'Zweifarbiger Boulder', 90, true)
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    is_active = true;
