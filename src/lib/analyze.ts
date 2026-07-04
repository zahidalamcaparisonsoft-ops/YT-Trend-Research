import { db } from "./supabase";
import { generateJSON } from "./llm";
import { sendDiscord } from "./discord";
import { generateSuggestions } from "./plan";

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

type Row = {
  id: string;
  title: string;
  desc: string;
  format: "long" | "short";
  channel: string;
  isSelf: boolean;
  ageDays: number;
  views: number;
  vpd: number;
};

async function getProfile() {
  const { data } = await db().from("channel_profile").select("*").eq("id", 1).single();
  return data || {};
}

// Detect outliers per format, then have the model cluster them into trends.
export async function runAnalysis() {
  const supabase = db();
  const since = new Date(Date.now() - 60 * 864e5).toISOString();

  const { data: vids, error } = await supabase
    .from("videos")
    .select("id, title, description, format, published_at, channels!inner(name, is_self, is_active)")
    .eq("channels.is_active", true)
    .gte("published_at", since);
  if (error) throw error;
  if (!vids?.length) return { trends: 0, message: "No recent videos — pull latest first." };

  // latest views per video (dedupe newest snapshot)
  const ids = (vids as any[]).map((v) => v.id);
  const latest = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const { data: stats } = await supabase
      .from("video_stats")
      .select("video_id, views, captured_at")
      .in("video_id", chunk)
      .order("captured_at", { ascending: false });
    for (const s of stats || []) if (!latest.has(s.video_id)) latest.set(s.video_id, Number(s.views || 0));
  }

  const rows: Row[] = (vids as any[]).map((v) => {
    const views = latest.get(v.id) ?? 0;
    const ageDays = Math.max(1, (Date.now() - new Date(v.published_at).getTime()) / 864e5);
    const ch = Array.isArray(v.channels) ? v.channels[0] : v.channels;
    return {
      id: v.id,
      title: v.title || "",
      desc: (v.description || "").slice(0, 180),
      format: v.format,
      channel: ch?.name || "",
      isSelf: !!ch?.is_self,
      ageDays,
      views,
      vpd: views / ageDays, // views-per-day = velocity proxy
    };
  });

  const profile = await getProfile();
  const weekStart = mondayOf(new Date());
  let created = 0;

  for (const format of ["long", "short"] as const) {
    const comp = rows.filter((r) => r.format === format && !r.isSelf && r.vpd > 0);
    if (comp.length < 3) continue;

    // per-channel baseline of views/day, then outlier ratio
    const byCh = new Map<string, number[]>();
    for (const r of comp) {
      if (!byCh.has(r.channel)) byCh.set(r.channel, []);
      byCh.get(r.channel)!.push(r.vpd);
    }
    const globalMed = median(comp.map((r) => r.vpd)) || 1;
    const scored = comp
      .map((r) => {
        const base = median(byCh.get(r.channel)!) || globalMed;
        return { ...r, outlier: r.vpd / (base || 1) };
      })
      // blend how-far-above-baseline with absolute reach so tiny channels don't dominate
      .sort((a, b) => b.outlier * Math.log10(b.vpd + 10) - a.outlier * Math.log10(a.vpd + 10))
      .slice(0, 18);

    const trends = await synthesize(format, scored, profile);

    await supabase.from("trends").delete().eq("week_start", weekStart).eq("format", format);
    for (const t of trends) {
      await supabase.from("trends").insert({
        week_start: weekStart,
        format,
        topic: t.topic,
        summary: t.summary,
        evidence: { examples: t.examples || [], angles: t.angles || [] },
        score: typeof t.score === "number" ? t.score : null,
        freshness: ["hot", "rising", "evergreen"].includes(t.freshness) ? t.freshness : "rising",
        status: "new",
      });
      created++;
    }
  }
  if (created > 0) {
    const { data: fresh } = await supabase
      .from("trends")
      .select("format, topic, freshness")
      .eq("week_start", weekStart)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(10);
    const lines = (fresh || [])
      .map((t) => `• [${t.format}${t.freshness === "hot" ? " 🔥" : ""}] ${t.topic}`)
      .join("\n");
    await sendDiscord(`📊 **Weekly trends ready** (${created} trends)\n${lines}`);
  }
  // refresh the "fresh ideas" pool from the new trends
  try {
    await generateSuggestions();
  } catch {
    /* non-fatal */
  }
  return { trends: created, week: weekStart };
}

async function synthesize(format: "long" | "short", top: any[], profile: any) {
  const kind = format === "short" ? "SHORT-FORM (Shorts / vertical)" : "LONG-FORM (regular videos)";
  const list = top
    .map(
      (r, i) =>
        `${i + 1}. "${r.title}" — ${r.channel} — ${Math.round(r.vpd).toLocaleString()} views/day, ${Math.round(
          r.views
        ).toLocaleString()} views, ${Math.round(r.ageDays)}d old (${r.outlier.toFixed(1)}x their baseline)`
    )
    .join("\n");

  const system = `You are a YouTube content strategist. You analyze what is OVER-PERFORMING on competitor channels and turn it into trends + specific content ideas for one creator. ${kind} behaves very differently from the other format — judge it on its own terms. Respond ONLY with JSON.`;

  const user = `MY CHANNEL:
- Niche: ${profile.niche || "AI SaaS / vibe coding for beginners"}
- Audience: ${profile.audience || "aspiring founders / non-coders"}
- Voice: ${profile.voice_tone || "founder-to-founder, energetic, plain"}
- Positioning: ${profile.positioning || "zero to first $1K MRR"}
- Pillars: ${(profile.pillars || []).join(", ") || "build-alongs, vibe-coding, AI SaaS business"}

TOP OVER-PERFORMING ${kind} VIDEOS FROM COMPETITORS (by views/day vs their own baseline):
${list}

Cluster these into 4-6 clear TRENDS. For each trend return:
- "topic": short trend name
- "summary": 1-2 sentences on WHY it's working right now (${format}-specific)
- "freshness": "hot" (spiking, very recent) | "rising" | "evergreen"
- "score": 1-100 (how strongly you'd bet on it for MY channel)
- "angles": 2-3 SPECIFIC ${format} ideas tailored to MY niche/voice (not generic) — for shorts, make them punchy/vertical-native; for long, make them substantial
- "examples": 2-3 of the competitor titles above that prove the trend

Return JSON: { "trends": [ ... ] }`;

  const out = await generateJSON<{ trends: any[] }>(system, user);
  return Array.isArray(out.trends) ? out.trends : [];
}
