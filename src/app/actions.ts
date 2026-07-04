"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { resolveChannel } from "@/lib/youtube";
import { runIngest } from "@/lib/ingest";
import { runAnalysis } from "@/lib/analyze";
import { generateScript } from "@/lib/generate";
import { generatePlan, regenerateSlot, generateSuggestions, productionDates } from "@/lib/plan";
import { analyzePatterns } from "@/lib/patterns";
import { discoverInternetIdeas } from "@/lib/internet";

/* ---------------- channels ---------------- */

export async function addChannel(formData: FormData) {
  const input = String(formData.get("input") || "").trim();
  const isSelf = formData.get("is_self") === "on";
  if (!input) return;
  let addedName = "";
  try {
    const ch = await resolveChannel(input);
    const { error } = await db()
      .from("channels")
      .upsert(
        {
          name: ch.title,
          handle: ch.handle,
          youtube_channel_id: ch.channelId,
          uploads_playlist_id: ch.uploadsPlaylistId,
          is_self: isSelf,
          is_active: true,
        },
        { onConflict: "youtube_channel_id" }
      );
    if (error) throw new Error(error.message);
    addedName = ch.title;
  } catch (e: any) {
    redirect(`/channels?error=${encodeURIComponent(e?.message || "Failed to add channel")}`);
  }
  revalidatePath("/channels");
  revalidatePath("/");
  redirect(`/channels?added=${encodeURIComponent(addedName)}`);
}

export async function removeChannel(formData: FormData) {
  await db().from("channels").delete().eq("id", String(formData.get("id")));
  revalidatePath("/channels");
}

export async function toggleChannel(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await db().from("channels").update({ is_active: !active }).eq("id", id);
  revalidatePath("/channels");
}

/* ---------------- DNA / config ---------------- */

export async function saveProfile(formData: FormData) {
  const pillars = String(formData.get("pillars") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  await db()
    .from("channel_profile")
    .update({
      name: String(formData.get("name") || ""),
      niche: String(formData.get("niche") || ""),
      audience: String(formData.get("audience") || ""),
      voice_tone: String(formData.get("voice_tone") || ""),
      positioning: String(formData.get("positioning") || ""),
      pillars,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  revalidatePath("/dna");
  redirect("/dna?saved=dna");
}

export async function saveConfig(formData: FormData) {
  await db()
    .from("channel_config")
    .update({
      longs_per_week: Number(formData.get("longs_per_week") || 2),
      shorts_per_week: Number(formData.get("shorts_per_week") || 3),
      edit_days_long: Number(formData.get("edit_days_long") || 2),
      edit_days_short: Number(formData.get("edit_days_short") || 1),
      trend_vs_pillar: String(formData.get("trend_vs_pillar") || "pillar-led"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  revalidatePath("/dna");
  redirect("/dna?saved=config");
}

/* ---------------- data & analysis ---------------- */

export async function triggerIngest() {
  await runIngest();
  revalidatePath("/");
}

export async function triggerAnalysis() {
  try {
    await runAnalysis();
  } catch (e: any) {
    redirect(`/trends?error=${encodeURIComponent(e?.message || "Analysis failed")}`);
  }
  revalidatePath("/trends");
  redirect("/trends");
}

export async function triggerPatterns() {
  try {
    await analyzePatterns();
  } catch (e: any) {
    redirect(`/patterns?error=${encodeURIComponent(e?.message || "Pattern analysis failed")}`);
  }
  revalidatePath("/patterns");
}

export async function triggerRadar() {
  try {
    await discoverInternetIdeas();
  } catch (e: any) {
    redirect(`/radar?error=${encodeURIComponent(e?.message || "Radar scan failed")}`);
  }
  revalidatePath("/radar");
}

/* ---------------- generation ---------------- */

export async function generateFromTopic(formData: FormData) {
  const planId = String(formData.get("plan_id") || "").trim();
  const wordCountRaw = Number(formData.get("word_count") || 0);
  const wordCount = wordCountRaw > 0 ? Math.min(wordCountRaw, 5000) : undefined;

  let topic = String(formData.get("topic") || "").trim();
  let format = (String(formData.get("format") || "long") === "short" ? "short" : "long") as
    | "long"
    | "short";

  let openId = "";
  try {
    if (planId) {
      const { data: p } = await db().from("content_plan").select("topic, format").eq("id", planId).single();
      if (!p) throw new Error("Calendar item not found");
      topic = p.topic;
      format = p.format as "long" | "short";
      await generateScript({ topic, format, planId, wordCount });
      openId = planId;
    } else {
      if (!topic) return;
      await generateScript({ topic, format, source: "manual", wordCount });
    }
  } catch (e: any) {
    redirect(`/generate?error=${encodeURIComponent(e?.message || "Generation failed")}`);
  }
  revalidatePath("/generate");
  revalidatePath("/calendar");
  redirect(openId ? `/generate?open=${openId}` : "/generate");
}

export async function writeScriptForPlan(formData: FormData) {
  const id = String(formData.get("id"));
  try {
    const { data: p } = await db().from("content_plan").select("topic, format").eq("id", id).single();
    if (p) await generateScript({ topic: p.topic, format: p.format as "long" | "short", planId: id });
  } catch (e: any) {
    redirect(`/calendar?error=${encodeURIComponent(e?.message || "Script generation failed")}`);
  }
  revalidatePath("/calendar");
  revalidatePath("/generate");
}

// Clear generated scripts (one or many). Reverts calendar slots to "idea",
// removes orphaned manual (unscheduled) plan rows entirely.
export async function clearAssetsBulk(ids: string[]) {
  if (!ids?.length) return;
  const supabase = db();
  const { data: rows } = await supabase.from("content_assets").select("id, plan_id").in("id", ids);
  await supabase.from("content_assets").delete().in("id", ids);

  const planIds = Array.from(new Set((rows || []).map((r) => r.plan_id).filter(Boolean)));
  for (const pid of planIds) {
    const { count } = await supabase
      .from("content_assets")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", pid);
    if ((count ?? 0) === 0) {
      const { data: plan } = await supabase
        .from("content_plan")
        .select("publish_date, source, status")
        .eq("id", pid)
        .single();
      if (plan) {
        if (!plan.publish_date && plan.source === "manual") {
          await supabase.from("content_plan").delete().eq("id", pid);
        } else if (plan.status === "scripted") {
          await supabase.from("content_plan").update({ status: "idea" }).eq("id", pid);
        }
      }
    }
  }
  revalidatePath("/generate");
  revalidatePath("/calendar");
}

/* ---------------- calendar ---------------- */

export async function generateWeekPlan() {
  try {
    await generatePlan(1);
  } catch (e: any) {
    redirect(`/calendar?error=${encodeURIComponent(e?.message || "Planning failed")}`);
  }
  revalidatePath("/calendar");
}

export async function generateMonthPlan() {
  try {
    await generatePlan(4);
  } catch (e: any) {
    redirect(`/calendar?error=${encodeURIComponent(e?.message || "Month planning failed")}`);
  }
  revalidatePath("/calendar");
}

export async function overrideSlot(formData: FormData) {
  const id = String(formData.get("id"));
  const topic = String(formData.get("topic") || "").trim();
  if (!topic) return;
  await db().from("content_plan").update({ topic, source: "manual", angle: "" }).eq("id", id);
  revalidatePath("/calendar");
}

export async function setPlanStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  await db().from("content_plan").update({ status }).eq("id", id);
  revalidatePath("/calendar");
}

export async function regenerateSlotAction(formData: FormData) {
  const id = String(formData.get("id"));
  try {
    await regenerateSlot(id);
  } catch (e: any) {
    redirect(`/calendar?error=${encodeURIComponent(e?.message || "Couldn't suggest a new topic")}`);
  }
  revalidatePath("/calendar");
}

export async function markSlotDone(formData: FormData) {
  const id = String(formData.get("id"));
  await db().from("content_plan").update({ status: "published" }).eq("id", id);
  revalidatePath("/calendar");
}

export async function deleteSlot(formData: FormData) {
  const id = String(formData.get("id"));
  await db().from("content_plan").delete().eq("id", id);
  revalidatePath("/calendar");
}

// Move a slot to a new publish date; production dates are re-planned around the edit buffer.
export async function moveSlot(formData: FormData) {
  const id = String(formData.get("id"));
  const date = String(formData.get("publish_date") || "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const supabase = db();
  const [{ data: plan }, { data: cfg }] = await Promise.all([
    supabase.from("content_plan").select("format").eq("id", id).single(),
    supabase.from("channel_config").select("*").eq("id", 1).single(),
  ]);
  if (!plan) return;
  await supabase
    .from("content_plan")
    .update({
      publish_date: date,
      ...productionDates(date, plan.format as "long" | "short", cfg),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/calendar");
}

export async function refreshSuggestions() {
  try {
    await generateSuggestions();
  } catch (e: any) {
    redirect(`/calendar?error=${encodeURIComponent(e?.message || "Couldn't refresh ideas")}`);
  }
  revalidatePath("/calendar");
}

export async function swapWithSuggestion(formData: FormData) {
  const slotId = String(formData.get("slotId"));
  const poolId = String(formData.get("poolId"));
  if (!slotId || !poolId) return;
  const supabase = db();
  const { data: pool } = await supabase.from("content_plan").select("*").eq("id", poolId).single();
  if (!pool) return;
  await supabase
    .from("content_plan")
    .update({
      topic: pool.topic,
      angle: pool.angle,
      source: pool.source,
      status: "idea",
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);
  await supabase.from("content_plan").delete().eq("id", poolId); // consume the suggestion
  revalidatePath("/calendar");
}

export async function swapRadarIntoSlot(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  const slotId = String(formData.get("slotId"));
  if (!ideaId || !slotId) return;
  const supabase = db();
  const { data: idea } = await supabase.from("internet_ideas").select("*").eq("id", ideaId).single();
  if (!idea) return;
  await supabase
    .from("content_plan")
    .update({
      topic: idea.topic,
      angle: idea.angle || "",
      source: "hot",
      status: "idea",
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);
  revalidatePath("/calendar");
  redirect("/calendar?swapped=1");
}
