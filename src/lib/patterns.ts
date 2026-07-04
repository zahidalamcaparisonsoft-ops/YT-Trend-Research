import OpenAI from "openai";
import { db } from "./supabase";
import { generateJSON } from "./llm";

let _c: OpenAI | null = null;
const openai = () => (_c ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

function median(a: number[]) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// top over-performing competitor videos per format, with thumbnails
async function topOutliers(format: "long" | "short", limit: number) {
  const supabase = db();
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data: vids } = await supabase
    .from("videos")
    .select("id, title, thumbnail_url, published_at, format, channels!inner(name, is_self, is_active)")
    .eq("channels.is_active", true)
    .eq("format", format)
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
  const rows = (comp as any[]).map((v) => {
    const views = latest.get(v.id) ?? 0;
    const age = Math.max(1, (Date.now() - new Date(v.published_at).getTime()) / 864e5);
    return { title: v.title || "", thumb: v.thumbnail_url as string, vpd: views / age };
  });
  const base = median(rows.map((r) => r.vpd)) || 1;
  return rows
    .map((r) => ({ ...r, score: r.vpd / base }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function titlePatterns(format: string, top: { title: string }[]) {
  if (top.length < 3) return [];
  const out = await generateJSON<{ patterns: string[] }>(
    `You analyze winning YouTube ${format} TITLES for reusable patterns. JSON only.`,
    `These titles are over-performing:\n${top.map((t) => "- " + t.title).join("\n")}\n\nReturn 4-6 concrete, reusable title patterns/templates (with a fill-in example each). JSON: { "patterns": ["..."] }`
  );
  return out.patterns || [];
}

async function thumbnailPatterns(format: string, top: { thumb: string }[]) {
  const urls = top.map((t) => t.thumb).filter(Boolean).slice(0, 8);
  if (urls.length < 3) return [];
  try {
    const res = await openai().chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `You analyze winning YouTube ${format} THUMBNAILS for common visual patterns. JSON only.` },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `These thumbnails are over-performing. List 4-6 common winning visual patterns (face/expression, text size & wording, colors, composition, arrows/objects). JSON: { "patterns": ["..."] }`,
            },
            ...urls.map((u) => ({ type: "image_url" as const, image_url: { url: u } })),
          ] as any,
        },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    return parsed.patterns || [];
  } catch {
    return []; // model may not support vision
  }
}

export async function analyzePatterns() {
  const [tl, ts] = await Promise.all([topOutliers("long", 12), topOutliers("short", 12)]);
  const [titleLong, titleShort, thumbLong, thumbShort] = await Promise.all([
    titlePatterns("long", tl),
    titlePatterns("short", ts),
    thumbnailPatterns("long", tl),
    thumbnailPatterns("short", ts),
  ]);
  await db()
    .from("insights")
    .update({
      title_patterns: { long: titleLong, short: titleShort },
      thumbnail_patterns: { long: thumbLong, short: thumbShort },
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  return { ok: true };
}

// compact patterns text for the generator prompt
export async function getPatternsText(format: "long" | "short"): Promise<string> {
  try {
    const { data } = await db().from("insights").select("title_patterns, thumbnail_patterns").eq("id", 1).single();
    const titles = data?.title_patterns?.[format] || [];
    const thumbs = data?.thumbnail_patterns?.[format] || [];
    if (!titles.length && !thumbs.length) return "";
    return `WINNING TITLE PATTERNS:\n${titles.map((t: string) => "- " + t).join("\n")}\n\nWINNING THUMBNAIL PATTERNS:\n${thumbs
      .map((t: string) => "- " + t)
      .join("\n")}`;
  } catch {
    return "";
  }
}
