import { db } from "./supabase";
import { generateJSON } from "./llm";
import { searchVideos, videoDetails, parseDuration } from "./youtube";
import { sendDiscord } from "./discord";

async function getProfile() {
  const { data } = await db().from("channel_profile").select("*").eq("id", 1).single();
  return data || {};
}

function buildQueries(profile: any): string[] {
  const set = new Set<string>();
  for (const p of profile.pillars || []) set.add(String(p));
  ["AI SaaS", "Claude Code", "vibe coding", "build an AI app", "no code AI"].forEach((k) => set.add(k));
  return Array.from(set).slice(0, 5);
}

// Scan the WHOLE of YouTube in your niche (not just tracked competitors) → content ideas.
export async function discoverInternetIdeas() {
  const profile = await getProfile();
  const queries = buildQueries(profile);
  const publishedAfter = new Date(Date.now() - 14 * 864e5).toISOString();

  const idSet = new Set<string>();
  for (const q of queries) {
    try {
      const ids = await searchVideos(q, publishedAfter, 15);
      ids.forEach((id) => idSet.add(id));
    } catch {
      /* skip a failing query */
    }
  }

  const details = await videoDetails(Array.from(idSet).slice(0, 120));
  const rows = details.map((v: any) => {
    const dur = parseDuration(v.contentDetails?.duration);
    const views = Number(v.statistics?.viewCount ?? 0);
    const age = Math.max(1, (Date.now() - new Date(v.snippet?.publishedAt).getTime()) / 864e5);
    return {
      title: v.snippet?.title || "",
      channel: v.snippet?.channelTitle || "",
      isShort: dur != null && dur <= 60,
      views,
      vpd: views / age,
    };
  });
  rows.sort((a, b) => b.vpd - a.vpd);
  const top = rows.slice(0, 25);
  if (top.length < 4) return { ideas: [] as any[] };

  const list = top
    .map((r, i) => `${i + 1}. "${r.title}" — ${r.channel} — ${Math.round(r.vpd).toLocaleString()} views/day`)
    .join("\n");

  const system = `You spot what the WHOLE internet (not just a few competitors) is making content about right now, and turn it into ideas that put one creator AHEAD of their niche. Respond ONLY with JSON.`;
  const user = `MY CHANNEL:
- Niche: ${profile.niche || "AI SaaS / vibe coding"}
- Voice: ${profile.voice_tone || "founder-to-founder"}
- Pillars: ${(profile.pillars || []).join(", ")}

TOP TRENDING VIDEOS ACROSS YOUTUBE (last 14 days, by views/day, from the whole niche):
${list}

Give 6 content ideas (mix long and short) that ride these BROAD trends but fit MY niche/voice — things that get me ahead of competitors. For each return: "format" ("long" | "short"), "topic", "angle" (one-line hook), "why" (why it's trending broadly right now). Be technically accurate: never conflate a tool with a model; no specific calendar years.
Return JSON: { "ideas": [ ... ] }`;

  const out = await generateJSON<{ ideas: any[] }>(system, user);
  const ideas = Array.isArray(out.ideas) ? out.ideas : [];

  const supabase = db();
  await supabase.from("internet_ideas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (const it of ideas) {
    await supabase.from("internet_ideas").insert({
      format: it.format === "short" ? "short" : "long",
      topic: it.topic || "",
      angle: it.angle || "",
      why: it.why || "",
      evidence: { examples: top.slice(0, 3).map((t) => t.title) },
    });
  }
  return { ideas };
}

// Discover + push the daily Discord digest.
export async function sendInternetDigest(appUrl: string) {
  const { ideas } = await discoverInternetIdeas();
  if (!ideas.length) return;
  const lines = ideas
    .map((i: any) => `• [${i.format === "short" ? "⚡ SHORT" : "📺 LONG"}] **${i.topic}** — ${i.why || i.angle || ""}`)
    .join("\n");
  await sendDiscord(
    `🌐 **Today's Content Radar** — what the whole niche is buzzing about right now:\n\n${lines}\n\n▶ Plan them: ${appUrl}/radar`
  );
}
