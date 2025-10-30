-- OPTIONAL: Bestehende Farbnamen aus public.boulders in public.colors übernehmen
-- Nutzung: Nur ausführen, wenn du bestehende Boulder-Farben in die neue Farbtabelle schreiben willst.

insert into public.colors (name, hex, sort_order)
select bc.color,
       case bc.color
         when 'Grün' then '#22c55e'
         when 'Gelb' then '#facc15'
         when 'Blau' then '#3b82f6'
         when 'Orange' then '#f97316'
         when 'Rot' then '#ef4444'
         when 'Schwarz' then '#111827'
         when 'Weiß' then '#ffffff'
         when 'Lila' then '#a855f7'
         else '#9ca3af'
       end as hex,
       row_number() over (order by bc.color) as sort_order
from (
  select distinct color from public.boulders
  where color is not null and color <> ''
) bc
on conflict (name) do update
  set hex = excluded.hex,
      sort_order = excluded.sort_order,
      is_active = true;


