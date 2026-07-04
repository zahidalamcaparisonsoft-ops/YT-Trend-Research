import { db } from "./supabase";
import { generateJSON } from "./llm";
import { getMyWinnersText } from "./performance";

const DEFAULTS: Record<"long" | "short", number[]> = { long: [1, 4], short: [0, 2, 5] }; // 0=Mon

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function nextMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = Mon
  d.setDate(d.getDate() + (dow === 0 ? 0 : 7 - dow));
  return d;
}

// Rank weekdays (0=Mon) by competitor performance, per format. Falls back to sane defaults.
async function bestPublishDays() {
  const supabase = db();
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: vids } = await supabase
    .from("videos")
    .select("id, format, published_at, channels!inner(is_self, is_active)")
    .eq("channels.is_active", true)
    .gte("published_at", since);

  const comp = (vids || []).filter((v: any) => {
    const c = Array.isArray(v.channels) ? v.channels[0] : v.channels;
    return !c?.is_self;
  });

  const ids = comp.map((v: any) => v.id);
  const latest = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data: st } = await supabase
      .from("video_stats")
      .select("video_id, views, captured_at")
      .in("video_id", ids.slice(i, i + 150))
      .order("captured_at", { ascending: false });
    for (const s of st || []) if (!latest.has(s.video_id)) latest.set(s.video_id, Number(s.views || 0));
  }

  const agg: Record<string, number[][]> = {
    long: Array.from({ length: 7 }, () => []),
    short: Array.from({ length: 7 }, () => []),
  };
  for (const v of comp as any[]) {
    const views = latest.get(v.id) ?? 0;
    const age = Math.max(1, (Date.now() - new Date(v.published_at).getTime()) / 864e5);
    const dow = (new Date(v.published_at).getDay() + 6) % 7;
    if (agg[v.format]) agg[v.format][dow].push(views / age);
  }

  const rank = (fmt: "long" | "short") => {
    const rows = agg[fmt].map((arr, i) => ({
      i,
      n: arr.length,
      avg: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
    }));
    if (rows.reduce((a, b) => a + b.n, 0) < 8) return DEFAULTS[fmt];
    return rows.sort((a, b) => b.avg - a.avg).map((r) => r.i);
  };
  return { long: rank("long"), short: rank("short") };
}

async function assignTopics(
  slots: { format: "long" | "short"; date?: string }[],
  trends: { long: any[]; short: any[] },
  profile: any,
  balance: string,
  recentTopics: string[],
  winners: string
) {
  const fmtTrends = (arr: any[]) =>
    arr.map((t) => `- [${t.freshness}] ${t.topic}: ${t.summary}`).join("\n") || "(none yet)";
  const slotList = slots
    .map((s, i) => `${i + 1}. ${s.format.toUpperCase()}${s.date ? ` (publishes ${s.date})` : ""}`)
    .join("\n");

  const system = `You plan YouTube content for one creator. Balance mode: "${balance}". Respond ONLY with JSON.`;
  const user = `MY CHANNEL:
- Niche: ${profile.niche || "AI SaaS / vibe coding"}
- Voice: ${profile.voice_tone || "founder-to-founder, energetic"}
- Positioning: ${profile.positioning || "zero to first $1K MRR"}
- Pillars: ${(profile.pillars || []).join(", ") || "build-alongs, vibe-coding, AI SaaS business"}

SLOTS TO FILL (in order):
${slotList}

LONG-FORM TRENDS:
${fmtTrends(trends.long)}

SHORT-FORM TRENDS:
${fmtTrends(trends.short)}

RECENT TOPICS (do NOT repeat these):
${recentTopics.join(" | ") || "(none)"}
${winners ? `\nWHAT WORKS FOR ME (favor topics/angles like these winners):\n${winners}\n` : ""}
Rules:
- "pillar-led" => mostly evergreen pillar topics, weave in timely trends.
- "balanced" => ~half pillars, half trends.
- "trend-led" => mostly ride the hot trends.
- SHORT slots must use short-form ideas; LONG slots long-form ideas.
- Each must be specific to my niche/voice and NOT repeat recent topics.
- Vary topics across the whole plan — no near-duplicate ideas in the same batch.
- Be TECHNICALLY ACCURATE. Never conflate a tool with a model (e.g. "Claude Code" is a coding tool/CLI, not a model — do NOT pit it against a model like "Opus 4.8"; compare tools with tools and models with models). Do not reference specific calendar years. If unsure a claim is real, keep the idea general rather than inventing a comparison.

For EACH slot in order return: "topic" (specific), "angle" (the hook/POV, one line), "source" ("pillar" | "trend" | "hot").
Return JSON: { "items": [ ... same length and order as slots ... ] }`;

  const out = await generateJSON<{ items: any[] }>(system, user);
  return Array.isArray(out.items) ? out.items : [];
}

// Backward-plan production dates for a publish date.
export function productionDates(publishDate: string, format: "long" | "short", cfg: any) {
  const editDays = format === "long" ? cfg?.edit_days_long || 2 : cfg?.edit_days_short || 1;
  const publish = new Date(publishDate + "T00:00:00");
  const editEnd = addDays(publish, -1);
  const editStart = addDays(publish, -editDays);
  const filmBy = addDays(editStart, -1);
  const scriptBy = addDays(filmBy, -1);
  return {
    script_ready_by: iso(scriptBy),
    film_by: iso(filmBy),
    edit_start: iso(editStart),
    edit_end: iso(editEnd),
  };
}

// Build/refresh the calendar for the next `weeks` weeks (1 = next week, 4 = a full month).
// Preserves manual overrides and already-scripted slots.
export async function generatePlan(weeks = 1) {
  const supabase = db();
  const { data: cfgRow } = await supabase.from("channel_config").select("*").eq("id", 1).single();
  const cfg = cfgRow || {
    longs_per_week: 2,
    shorts_per_week: 3,
    edit_days_long: 2,
    edit_days_short: 1,
    trend_vs_pillar: "pillar-led",
  };
  const { data: profile } = await supabase.from("channel_profile").select("*").eq("id", 1).single();

  const start = nextMonday();
  const horizonStart = iso(start);
  const horizonEnd = iso(addDays(start, weeks * 7 - 1));
  const days = await bestPublishDays();

  const longDays = days.long.slice(0, cfg.longs_per_week);
  const shortDays = days.short.slice(0, cfg.shorts_per_week);
  await supabase
    .from("channel_config")
    .update({ publish_days: { long: longDays, short: shortDays } })
    .eq("id", 1);

  const slots: { format: "long" | "short"; publish: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    for (const d of longDays) slots.push({ format: "long", publish: iso(addDays(start, w * 7 + d)) });
    for (const d of shortDays) slots.push({ format: "short", publish: iso(addDays(start, w * 7 + d)) });
  }
  slots.sort((a, b) => a.publish.localeCompare(b.publish));

  const { data: trends } = await supabase
    .from("trends")
    .select("format, topic, summary, freshness")
    .order("week_start", { ascending: false })
    .limit(30);
  const trendsByFmt = {
    long: (trends || []).filter((t) => t.format === "long").slice(0, 8),
    short: (trends || []).filter((t) => t.format === "short").slice(0, 8),
  };

  const { data: recent } = await supabase
    .from("content_plan")
    .select("topic")
    .order("created_at", { ascending: false })
    .limit(30);
  const recentTopics = (recent || []).map((r) => r.topic).filter(Boolean) as string[];
  const winners = await getMyWinnersText();

  // clear un-scripted, non-manual AI ideas in the horizon; keep manual + already-scripted
  await supabase
    .from("content_plan")
    .delete()
    .gte("publish_date", horizonStart)
    .lte("publish_date", horizonEnd)
    .eq("status", "idea")
    .neq("source", "manual");

  const { data: existing } = await supabase
    .from("content_plan")
    .select("publish_date, format")
    .gte("publish_date", horizonStart)
    .lte("publish_date", horizonEnd);
  const taken = new Set((existing || []).map((e) => `${e.publish_date}|${e.format}`));

  const openSlots = slots.filter((s) => !taken.has(`${s.publish}|${s.format}`));
  if (openSlots.length === 0) return { created: 0, weekStart: horizonStart, weekEnd: horizonEnd };

  const assigned = await assignTopics(
    openSlots.map((s) => ({ format: s.format, date: s.publish })),
    trendsByFmt,
    profile || {},
    cfg.trend_vs_pillar,
    recentTopics,
    winners
  );

  let created = 0;
  for (let i = 0; i < openSlots.length; i++) {
    const s = openSlots[i];
    const a = assigned[i] || { topic: "(choose a topic)", angle: "", source: "pillar" };
    await supabase.from("content_plan").insert({
      publish_date: s.publish,
      format: s.format,
      status: "idea",
      topic: a.topic,
      angle: a.angle || "",
      source: ["pillar", "trend", "hot"].includes(a.source) ? a.source : "pillar",
      ...productionDates(s.publish, s.format, cfg),
    });
    created++;
  }
  return { created, weekStart: horizonStart, weekEnd: horizonEnd };
}

async function loadTrends(supabase: ReturnType<typeof db>) {
  const { data: trends } = await supabase
    .from("trends")
    .select("format, topic, summary, freshness")
    .order("week_start", { ascending: false })
    .limit(30);
  return {
    long: (trends || []).filter((t) => t.format === "long").slice(0, 8),
    short: (trends || []).filter((t) => t.format === "short").slice(0, 8),
  };
}

// Replace ONE slot's topic with a fresh AI suggestion (same format), avoiding existing/recent topics.
export async function regenerateSlot(slotId: string) {
  const supabase = db();
  const { data: slot } = await supabase.from("content_plan").select("*").eq("id", slotId).single();
  if (!slot) return;
  const [{ data: cfg }, { data: profile }] = await Promise.all([
    supabase.from("channel_config").select("*").eq("id", 1).single(),
    supabase.from("channel_profile").select("*").eq("id", 1).single(),
  ]);
  const trends = await loadTrends(supabase);
  const winners = await getMyWinnersText();
  const { data: others } = await supabase
    .from("content_plan")
    .select("topic")
    .neq("id", slotId)
    .order("created_at", { ascending: false })
    .limit(30);
  const avoid = (others || [])
    .map((o) => o.topic)
    .filter(Boolean)
    .concat(slot.topic ? [slot.topic] : []);

  const items = await assignTopics(
    [{ format: slot.format }],
    trends,
    profile || {},
    cfg?.trend_vs_pillar || "pillar-led",
    avoid as string[],
    winners
  );
  const a = items[0] || { topic: slot.topic, angle: "", source: "pillar" };
  await supabase
    .from("content_plan")
    .update({
      topic: a.topic,
      angle: a.angle || "",
      source: ["pillar", "trend", "hot"].includes(a.source) ? a.source : "trend",
      status: "idea",
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);
}

// Refresh the "fresh ideas" pool (unscheduled content_plan rows, publish_date = null) from current trends.
export async function generateSuggestions(nLong = 3, nShort = 3) {
  const supabase = db();
  const [{ data: cfg }, { data: profile }] = await Promise.all([
    supabase.from("channel_config").select("*").eq("id", 1).single(),
    supabase.from("channel_profile").select("*").eq("id", 1).single(),
  ]);
  const trends = await loadTrends(supabase);
  const winners = await getMyWinnersText();
  const { data: recent } = await supabase
    .from("content_plan")
    .select("topic")
    .order("created_at", { ascending: false })
    .limit(30);
  const recentTopics = (recent || []).map((r) => r.topic).filter(Boolean) as string[];

  const slots = [
    ...Array.from({ length: nLong }, () => ({ format: "long" as const })),
    ...Array.from({ length: nShort }, () => ({ format: "short" as const })),
  ];
  const items = await assignTopics(
    slots,
    trends,
    profile || {},
    cfg?.trend_vs_pillar || "pillar-led",
    recentTopics,
    winners
  );

  // clear the old pool (unscheduled AI ideas)
  await supabase.from("content_plan").delete().is("publish_date", null).eq("status", "idea");

  for (let i = 0; i < slots.length; i++) {
    const a = items[i] || {};
    if (!a.topic) continue;
    await supabase.from("content_plan").insert({
      publish_date: null,
      format: slots[i].format,
      status: "idea",
      topic: a.topic,
      angle: a.angle || "",
      source: ["pillar", "trend", "hot"].includes(a.source) ? a.source : "trend",
    });
  }
}
