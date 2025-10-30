-- Create colors table for managing allowed boulder colors
create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text,
  hex text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at
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

-- RLS
alter table public.colors enable row level security;

-- Ensure required columns exist (in case table existed already)
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='colors' and column_name='name'
  ) then
    alter table public.colors add column name text;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='colors' and column_name='hex'
  ) then
    alter table public.colors add column hex text;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='colors' and column_name='sort_order'
  ) then
    alter table public.colors add column sort_order integer not null default 0;
  end if;
end$$;

-- Ensure unique index on name
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and tablename='colors' and indexname='colors_name_key'
  ) then
    create unique index colors_name_key on public.colors (name);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'colors' and policyname = 'Colors are selectable by anyone'
  ) then
    create policy "Colors are selectable by anyone" on public.colors for select using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'colors' and policyname = 'Only admin may modify colors'
  ) then
    create policy "Only admin may modify colors" on public.colors for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- Seed defaults if table empty
insert into public.colors (name, hex, sort_order) 
select * from (values
  ('Grün', '#22c55e', 1),
  ('Gelb', '#facc15', 2),
  ('Blau', '#3b82f6', 3),
  ('Orange', '#f97316', 4),
  ('Rot', '#ef4444', 5),
  ('Schwarz', '#111827', 6),
  ('Weiß', '#ffffff', 7),
  ('Lila', '#a855f7', 8)
) as t(name, hex, sort_order)
where not exists (select 1 from public.colors);


