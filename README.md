# Content Engine — AI YouTube Content Command Center

Watches your competitors' YouTube channels daily, detects what's actually working
(**longs and shorts tracked separately**), then autonomously plans your week and
writes every script. Everything lives in Supabase, so it gets smarter over time.

## Modes
- **🤖 Autopilot** — each week it decides topics, builds a production calendar (respecting your edit buffer), and writes scripts. Pillar-led, with timely trends mixed in.
- **🎯 On-demand** — pick a topic from the trend list, or paste a brand-new topic, and it generates the full package using your Channel DNA.
- **🔥 Hot feed** — a live "what's hot right now" list you can use to **override** any planned idea.

## Phases
- **Phase 0 (this scaffold):** Supabase schema + daily YouTube ingestion + view-velocity snapshots + Channel DNA. *(← you are here)*
- **Phase 1:** trend/outlier analysis (long + short, separately), the auto production calendar, and OpenAI script generation.
- **Phase 2:** your-own-channel feedback loop, thumbnail/title intelligence, hot alerts, Skool cross-posting, and the Next.js dashboard.

## Stack
Node scripts → Supabase (Postgres) → YouTube Data API v3 (free) → OpenAI (scripts).
Later: Next.js dashboard + Vercel Cron for the daily/weekly jobs.

---

## Setup (Phase 0)

**1. Install deps**
```bash
cd content-engine
npm install
```

**2. Create the database**
- Create a Supabase project → open **SQL Editor** → paste `supabase/schema.sql` → **Run**.

**3. Get your keys → put them in `.env`** (copy from `.env.example`)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API.
- `YOUTUBE_API_KEY` — Google Cloud Console → enable **YouTube Data API v3** → Credentials → API key.
- `OPENAI_API_KEY` + `OPENAI_MODEL` — your OpenAI key and preferred model.

**4. Add your competitors (and your own channel)**
```bash
npm run add -- "https://www.youtube.com/@CompetitorHandle"
npm run add -- "@AnotherCompetitor"
npm run add -- "@YourOwnChannel" --self      # enables the feedback loop
npm run list                                  # see what's tracked
```

**5. Pull the data (run daily — later this becomes a cron job)**
```bash
npm run ingest
```
Each run stores new videos + a fresh stats snapshot, building the view-velocity
history that powers outlier/trend detection.

---

## What's next
Once data is flowing for a few days, Phase 1 adds:
- `analyze.mjs` — computes per-channel baselines and flags **outliers** for **longs and shorts separately** → writes weekly `trends`.
- `plan.mjs` — builds/refreshes the **content calendar** with backward-planned film/edit dates from your `channel_config`.
- `generate.mjs` — OpenAI writes the full script + assets for each planned slot (and on-demand for any topic).

## Notes
- Shorts are classified by duration ≤ 60s. Longs and shorts never mix in analysis or planning.
- Free tiers cover this (YouTube API, Supabase, Vercel). Only OpenAI generation costs a few $/mo.
- RLS is off in Phase 0 (scripts use the service-role key); it goes on before the dashboard ships.
