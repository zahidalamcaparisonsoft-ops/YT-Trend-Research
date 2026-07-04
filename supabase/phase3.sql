-- ============================================================
--  PHASE 3 migration — run in Supabase SQL Editor (after schema.sql)
-- ============================================================

-- de-dupe hot alerts (so we don't ping the same video twice)
create table if not exists alerts (
  video_id uuid primary key references videos(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- learned patterns + your-own performance summary (singleton)
create table if not exists insights (
  id int primary key default 1,
  title_patterns jsonb default '{}',       -- { long: [...], short: [...] }
  thumbnail_patterns jsonb default '{}',   -- { long: [...], short: [...] }
  my_winners jsonb default '{}',
  updated_at timestamptz not null default now(),
  constraint single_insights check (id = 1)
);
insert into insights (id) values (1) on conflict do nothing;
