-- Supabase schema for Futebol Dashboard
-- Run this SQL in your Supabase project

-- Extensions
create extension if not exists "pgcrypto";

-- Tables
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  jersey_number integer not null default 0,
  name text not null,
  position text not null,
  paid boolean not null default false,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  capacity integer not null default 8,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  inserted_at timestamptz not null default now(),
  primary key (team_id, player_id)
);
create index if not exists idx_assignments_team on public.assignments(team_id);
create index if not exists idx_assignments_player on public.assignments(player_id);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  left_team_id uuid not null references public.teams(id) on delete cascade,
  right_team_id uuid not null references public.teams(id) on delete cascade,
  phase text not null,
  started_at timestamptz null,
  half smallint not null default 1,
  remaining_ms integer not null default 1200000,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_matches_left_team on public.matches(left_team_id);
create index if not exists idx_matches_right_team on public.matches(right_team_id);

create table if not exists public.match_events (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  goals integer not null default 0,
  yellow integer not null default 0,
  red boolean not null default false,
  destaque boolean not null default false,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);
create index if not exists idx_match_events_match on public.match_events(match_id);
create index if not exists idx_match_events_player on public.match_events(player_id);

-- Row Level Security
alter table public.players enable row level security;
alter table public.teams enable row level security;
alter table public.assignments enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;

-- Policies (open read/write for anon - adjust for production)
-- players
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'players_select_all' and tablename = 'players') then
    create policy players_select_all on public.players for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'players_mod_all' and tablename = 'players') then
    create policy players_mod_all on public.players for all using (true) with check (true);
  end if;
end $$;

-- teams
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'teams_select_all' and tablename = 'teams') then
    create policy teams_select_all on public.teams for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'teams_mod_all' and tablename = 'teams') then
    create policy teams_mod_all on public.teams for all using (true) with check (true);
  end if;
end $$;

-- assignments
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'assignments_select_all' and tablename = 'assignments') then
    create policy assignments_select_all on public.assignments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'assignments_mod_all' and tablename = 'assignments') then
    create policy assignments_mod_all on public.assignments for all using (true) with check (true);
  end if;
end $$;

-- matches
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'matches_select_all' and tablename = 'matches') then
    create policy matches_select_all on public.matches for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'matches_mod_all' and tablename = 'matches') then
    create policy matches_mod_all on public.matches for all using (true) with check (true);
  end if;
end $$;

-- match_events
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'match_events_select_all' and tablename = 'match_events') then
    create policy match_events_select_all on public.match_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'match_events_mod_all' and tablename = 'match_events') then
    create policy match_events_mod_all on public.match_events for all using (true) with check (true);
  end if;
end $$;
