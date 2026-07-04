-- ============================================================
--  PHASE 4 migration — run in Supabase SQL Editor
--  Internet Radar: content ideas from the WHOLE niche (not just competitors)
-- ============================================================

create table if not exists internet_ideas (
  id uuid primary key default gen_random_uuid(),
  format text not null default 'long',   -- long | short
  topic text not null,
  angle text,
  why text,                               -- why it's trending broadly right now
  evidence jsonb default '{}',            -- example trending titles from the wider web
  created_at timestamptz not null default now()
);
