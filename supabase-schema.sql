-- Tables
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null
);
create index if not exists idx_categories_owner on categories(owner_id);
create unique index if not exists uq_categories_owner_name on categories(owner_id, name);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category_id uuid not null references categories(id) on delete cascade,
  jersey_number int not null default 0,
  name text not null,
  position text not null,
  paid boolean not null default false
);
create index if not exists idx_players_owner on players(owner_id);
create index if not exists idx_players_category on players(category_id);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  color text not null,
  capacity int not null default 8
);
create index if not exists idx_teams_owner on teams(owner_id);
create index if not exists idx_teams_category on teams(category_id);

create table if not exists assignments (
  owner_id text not null,
  category_id uuid not null references categories(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (owner_id, category_id, team_id, player_id)
);
create index if not exists idx_assignments_team on assignments(team_id);
create index if not exists idx_assignments_player on assignments(player_id);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category_id uuid not null references categories(id) on delete cascade,
  left_team_id uuid not null references teams(id) on delete restrict,
  right_team_id uuid not null references teams(id) on delete restrict,
  phase text not null,
  started_at timestamptz null,
  half smallint not null default 1,
  remaining_ms int not null default 1200000
);
create index if not exists idx_matches_owner on matches(owner_id);
create index if not exists idx_matches_category on matches(category_id);

create table if not exists match_events (
  owner_id text not null,
  category_id uuid not null references categories(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  goals int not null default 0,
  yellow int not null default 0,
  red boolean not null default false,
  destaque boolean not null default false,
  primary key (owner_id, category_id, match_id, player_id)
);
create index if not exists idx_match_events_match on match_events(match_id);
create index if not exists idx_match_events_player on match_events(player_id);
