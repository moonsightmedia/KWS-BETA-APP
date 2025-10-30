-- COLORS_RECREATE.sql
-- Zweck: Alte inkompatible Tabelle public.colors umbenennen und saubere Struktur neu anlegen
-- Nutzung: Inhalt im Supabase SQL Editor ausführen.

-- 1) Alte Tabelle sichern
alter table if exists public.colors rename to colors_legacy;

-- 2) Neue Tabelle anlegen
create table public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Trigger für updated_at
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

-- 4) RLS + Policies
alter table public.colors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='colors' and policyname='Colors are selectable by anyone'
  ) then
    create policy "Colors are selectable by anyone" on public.colors for select using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='colors' and policyname='Only admin may modify colors'
  ) then
    create policy "Only admin may modify colors" on public.colors for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
  end if;
end$$;

-- 5) Standardfarben befüllen
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

-- Hinweis: Alte Daten stehen in public.colors_legacy zur Verfügung.


