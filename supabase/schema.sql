-- ============================================================
--  CONTENT ENGINE — Supabase schema (Phase 0)
--  Run this in your Supabase project: SQL Editor -> paste -> Run.
--  Longs and Shorts are tracked as SEPARATE intelligence tracks.
-- ============================================================

-- CHANNELS: your competitors + your own channel (is_self = true)
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  youtube_channel_id text unique not null,
  uploads_playlist_id text,
  is_self boolean not null default false,   -- your own channel (feedback loop)
  niche text,
  notes text,
  is_active boolean not null default true,
  added_at timestamptz not null default now()
);

-- VIDEOS: every long/short we've seen from any channel
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  youtube_video_id text unique not null,
  title text,
  description text,
  published_at timestamptz,
  duration_seconds int,
  is_short boolean not null default false,           -- duration <= 60s
  format text generated always as (case when is_short then 'short' else 'long' end) stored,
  thumbnail_url text,
  youtube_tags text[] default '{}',
  topics text[] default '{}',                        -- AI-tagged later
  plan_id uuid,                                       -- links a published SELF video back to its idea
  first_seen_at timestamptz not null default now()
);
create index if not exists idx_videos_channel   on videos(channel_id);
create index if not exists idx_videos_format     on videos(format);
create index if not exists idx_videos_published  on videos(published_at desc);

-- VIDEO_STATS: daily snapshots -> lets us compute view VELOCITY & outliers
create table if not exists video_stats (
  id bigint generated always as identity primary key,
  video_id uuid not null references videos(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint,
  likes bigint,
  comments bigint
);
create index if not exists idx_stats_video on video_stats(video_id, captured_at desc);

-- CHANNEL_PROFILE: YOUR Channel DNA (feeds every generation, on-brand)
create table if not exists channel_profile (
  id int primary key default 1,
  name text,
  niche text,
  audience text,
  voice_tone text,
  positioning text,
  pillars text[] default '{}',        -- your content pillars
  links jsonb default '{}',
  updated_at timestamptz not null default now(),
  constraint single_profile check (id = 1)
);

-- CHANNEL_CONFIG: cadence + scheduling (edit anytime -> the planner re-plans)
create table if not exists channel_config (
  id int primary key default 1,
  longs_per_week   int  not null default 2,
  shorts_per_week  int  not null default 3,
  edit_days_long   int  not null default 2,   -- your edit buffer
  edit_days_short  int  not null default 1,
  publish_days     jsonb default '{}',        -- system fills from competitor data; editable
  trend_vs_pillar  text not null default 'pillar-led',  -- pillar-led | balanced | trend-led
  updated_at timestamptz not null default now(),
  constraint single_config check (id = 1)
);

-- TRENDS: detected each week, SEPARATE for long vs short
create table if not exists trends (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  format text not null check (format in ('long','short')),   -- <- separate tracks
  topic text not null,
  summary text,
  evidence jsonb default '{}',                 -- which videos/channels drove it
  score numeric,                                -- strength
  freshness text default 'rising' check (freshness in ('hot','rising','evergreen')),
  status text default 'new',
  created_at timestamptz not null default now()
);
create index if not exists idx_trends_week on trends(week_start desc, format);

-- CONTENT_PLAN: the calendar (idea -> published) for longs & shorts
create table if not exists content_plan (
  id uuid primary key default gen_random_uuid(),
  publish_date date,
  format text not null check (format in ('long','short')),
  status text not null default 'idea'
    check (status in ('idea','scripted','filming','editing','scheduled','published')),
  topic text,
  angle text,
  source text not null default 'pillar'
    check (source in ('pillar','trend','hot','manual')),   -- 'manual' = your override
  trend_id uuid references trends(id) on delete set null,
  priority int not null default 0,
  -- backward-planned production dates (respect your edit buffer):
  script_ready_by date,
  film_by date,
  edit_start date,
  edit_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_plan_date on content_plan(publish_date);

-- CONTENT_ASSETS: the generated script + full package for a plan item
create table if not exists content_assets (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references content_plan(id) on delete cascade,
  title_options jsonb default '[]',
  hook text,
  script text,
  thumbnail_concept text,
  onscreen_text text,       -- shorts
  audio_suggestion text,    -- shorts (trending sound direction)
  description text,
  tags text[] default '{}',
  hashtags text[] default '{}',
  skool_post text,          -- cross-post for your Skool community
  model_used text,
  created_at timestamptz not null default now()
);

-- SWIPE_FILE: winning competitor hooks/formats/thumbnails to LEARN from
create table if not exists swipe_file (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete set null,
  category text,            -- hook | thumbnail | format | title
  note text,
  created_at timestamptz not null default now()
);

-- seed singletons
insert into channel_profile (id) values (1) on conflict do nothing;
insert into channel_config  (id) values (1) on conflict do nothing;

-- NOTE: RLS is intentionally OFF for Phase 0 (scripts use the service-role key).
-- Before exposing a browser-facing dashboard (Phase 1), enable RLS + policies.
