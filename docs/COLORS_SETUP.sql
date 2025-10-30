-- COLORS_SETUP.sql
-- Zweck: Tabelle public.colors anlegen (falls fehlend), RLS/Policies setzen und Standardfarben befüllen.
-- Nutzung: Inhalt komplett im Supabase SQL Editor ausführen.

-- 1) Tabelle anlegen (idempotent)
create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger für updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_colors_updated_at on public.colors;
create trigger trg_colors_updated_at
before update on public.colors
for each row execute function public.set_updated_at();

-- RLS aktivieren
alter table public.colors enable row level security;

-- Falls die Tabelle bereits existierte und einzelne Spalten fehlen, nachrüsten (idempotent)
alter table public.colors add column if not exists name text;
alter table public.colors add column if not exists hex text;
alter table public.colors add column if not exists is_active boolean not null default true;
alter table public.colors add column if not exists sort_order integer not null default 0;

-- 2) Policies idempotent anlegen
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='colors' and policyname='Colors are selectable by anyone'
  ) then
    create policy "Colors are selectable by anyone"
      on public.colors for select using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='colors' and policyname='Only admin may modify colors'
  ) then
    create policy "Only admin may modify colors"
      on public.colors for all
      using (public.has_role(auth.uid(),'admin'))
      with check (public.has_role(auth.uid(),'admin'));
  end if;
end$$;

-- 3) Standardfarben befüllen (idempotent)
insert into public.colors (name, hex, sort_order) values
  ('Grün',    '#22c55e', 1),
  ('Gelb',    '#facc15', 2),
  ('Blau',    '#3b82f6', 3),
  ('Orange',  '#f97316', 4),
  ('Rot',     '#ef4444', 5),
  ('Schwarz', '#111827', 6),
  ('Weiß',    '#ffffff', 7),
  ('Lila',    '#a855f7', 8)
on conflict (name) do update
  set hex = excluded.hex,
      sort_order = excluded.sort_order,
      is_active = true;

-- Fertig. Danach Seite neu laden: Admin → Farben verwalten und Setter-Farbauswahl verwenden ab jetzt die Tabelle colors.


