create extension if not exists btree_gist with schema extensions;

create type public.weight_unit as enum ('lb', 'kg');
create type public.rest_rule as enum ('six_of_seven', 'strict');
create type public.day_mark_kind as enum ('rest', 'skip');
create type public.resolved_via as enum ('normal', 'lock');
create type public.weigh_in_source as enum ('scale', 'manual');
create type public.weigh_in_flag as enum ('duplicate', 'outlier');

create function public.to_kg(value numeric, unit public.weight_unit)
returns numeric
language sql
immutable
parallel safe
return case unit when 'kg' then value else value * 0.45359237 end;

create function public.training_day(at timestamptz, time_zone text, rollover_hour integer)
returns date
language sql
immutable
parallel safe
return ((at at time zone time_zone) - make_interval(hours => rollover_hour))::date;

create table public.settings (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null unique references auth.users (id),
  unit public.weight_unit not null,
  time_zone text not null,
  rollover_hour smallint not null default 4 check (rollover_hour between 0 and 23),
  rest_rule public.rest_rule not null default 'six_of_seven',
  start_date date not null,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id bigint generated always as identity primary key,
  name text not null check (name = btrim(name) and name <> ''),
  is_bodyweight boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index exercises_name_key on public.exercises (lower(name));

create table public.exercise_aliases (
  alias text primary key check (alias ~ '^[a-z]+( [a-z]+)*$'),
  exercise_id bigint not null references public.exercises (id) on delete cascade
);

create table public.sets (
  id bigint generated always as identity primary key,
  day date not null,
  exercise_id bigint not null references public.exercises (id),
  load_value numeric(6, 2) not null check (load_value >= 0),
  load_unit public.weight_unit not null,
  load_kg numeric(7, 3) not null generated always as (public.to_kg(load_value, load_unit)) stored,
  reps smallint not null check (reps > 0),
  raw_input text not null,
  created_at timestamptz not null default now()
);

create table public.weigh_ins (
  id bigint generated always as identity primary key,
  measured_at timestamptz not null default now(),
  day date not null,
  value numeric(6, 2) not null,
  unit public.weight_unit not null,
  kg numeric(7, 3) not null generated always as (public.to_kg(value, unit)) stored,
  source public.weigh_in_source not null,
  flag public.weigh_in_flag,
  check (kg between 20 and 300),
  check (source = 'scale' or flag is null)
);
create unique index weigh_ins_one_manual_per_day on public.weigh_ins (day) where source = 'manual';

create table public.day_marks (
  day date primary key,
  kind public.day_mark_kind not null,
  reason text,
  resolved_via public.resolved_via not null default 'normal',
  created_at timestamptz not null default now(),
  check (
    (kind = 'skip' and reason is not null and char_length(btrim(reason)) >= 20)
    or (kind = 'rest' and reason is null)
  )
);

create table public.photos (
  day date primary key,
  storage_path text not null,
  thumb_path text not null,
  taken_at timestamptz not null default now()
);

create table public.addons (
  id bigint generated always as identity primary key,
  name text not null check (name = btrim(name) and name <> ''),
  created_at timestamptz not null default now()
);
create unique index addons_name_key on public.addons (lower(name));

create table public.addon_periods (
  id bigint generated always as identity primary key,
  addon_id bigint not null references public.addons (id) on delete cascade,
  details text not null default '',
  start_day date not null,
  end_day date check (end_day >= start_day),
  exclude using gist (addon_id with =, daterange(start_day, end_day, '[]') with &&)
);

create schema private;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
return exists (select 1 from public.settings where owner_id = auth.uid());

revoke execute on function private.is_owner() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_owner() to authenticated;

alter table public.settings enable row level security;
create policy owner_reads on public.settings for select to authenticated
  using (owner_id = (select auth.uid()));
create policy owner_updates on public.settings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy first_sign_in_claims on public.settings for insert to authenticated
  with check (owner_id = (select auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'exercises', 'exercise_aliases', 'sets', 'weigh_ins', 'day_marks', 'photos', 'addons', 'addon_periods'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy owner_only on public.%I for all to authenticated
         using ((select private.is_owner())) with check ((select private.is_owner()))',
      table_name
    );
  end loop;
end $$;

revoke delete, update on public.day_marks from authenticated;
grant update (reason) on public.day_marks to authenticated;
