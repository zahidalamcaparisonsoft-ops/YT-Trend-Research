import { db } from "./supabase";
import { generateJSON } from "./llm";

async function getProfile() {
  const { data } = await db().from("channel_profile").select("*").eq("id", 1).single();
  return data || {};
}

// Generate a full content package for a topic (long or short) and save it.
export async function generateScript(opts: {
  topic: string;
  format: "long" | "short";
  trendId?: string | null;
  source?: "manual" | "trend" | "hot" | "pillar";
}) {
  const { topic, format } = opts;
  const supabase = db();
  const profile = await getProfile();

  const system = `You are a ghost-writer for a YouTube creator. You write ready-to-shoot ${
    format === "short" ? "SHORT-FORM (vertical, <60s)" : "LONG-FORM"
  } content in THEIR voice. Respond ONLY with JSON.`;

  const shape =
    format === "short"
      ? `{
  "title_options": ["3 punchy title/caption options"],
  "hook": "the first 2 seconds — a scroll-stopping spoken line",
  "script": "the full word-for-word short script (spoken), ~45-60s of talking",
  "onscreen_text": "the on-screen captions/text overlays, line by line",
  "audio_suggestion": "type of trending audio/sound or beat that fits",
  "hashtags": ["5-8 hashtags"],
  "skool_post": "a short companion post to drop in the Skool community"
}`
      : `{
  "title_options": ["3-4 SEO + click title options"],
  "hook": "the first 15 seconds — spoken, grabs attention",
  "script": "the full video script / detailed outline with talking points, sections, and CTA",
  "thumbnail_concept": "thumbnail image idea + the exact TEXT on the thumbnail",
  "description": "YouTube description with a 1-line summary + chapters if useful",
  "tags": ["8-12 tags"],
  "skool_post": "a companion post to drop in the Skool community"
}`;

  const user = `MY CHANNEL:
- Niche: ${profile.niche || "AI SaaS / vibe coding for beginners"}
- Audience: ${profile.audience || "aspiring founders / non-coders"}
- Voice: ${profile.voice_tone || "founder-to-founder, energetic, plain-spoken, no fluff"}
- Positioning: ${profile.positioning || "zero to first $1K MRR"}
- Pillars: ${(profile.pillars || []).join(", ") || "build-alongs, vibe-coding, AI SaaS business"}

FORMAT: ${format === "short" ? "YouTube SHORT (vertical, under 60s)" : "Long-form YouTube video"}
TOPIC: ${topic}

Write the complete package in my voice. Return JSON exactly in this shape:
${shape}`;

  const a = await generateJSON<any>(system, user);

  // save a plan row (memory) + the asset
  const { data: plan } = await supabase
    .from("content_plan")
    .insert({
      format,
      status: "scripted",
      topic,
      angle: a.title_options?.[0] || topic,
      source: opts.source || "manual",
      trend_id: opts.trendId || null,
    })
    .select("id")
    .single();

  const { data: asset } = await supabase
    .from("content_assets")
    .insert({
      plan_id: plan!.id,
      title_options: a.title_options || [],
      hook: a.hook || "",
      script: a.script || "",
      thumbnail_concept: a.thumbnail_concept || "",
      onscreen_text: a.onscreen_text || "",
      audio_suggestion: a.audio_suggestion || "",
      description: a.description || "",
      tags: a.tags || [],
      hashtags: a.hashtags || [],
      skool_post: a.skool_post || "",
      model_used: process.env.OPENAI_MODEL || "gpt-4o",
    })
    .select("*")
    .single();

  return { planId: plan!.id, asset };
}
