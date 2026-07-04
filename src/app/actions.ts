"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { resolveChannel } from "@/lib/youtube";
import { runIngest } from "@/lib/ingest";
import { runAnalysis } from "@/lib/analyze";
import { generateScript } from "@/lib/generate";
import { generatePlan } from "@/lib/plan";
import { analyzePatterns } from "@/lib/patterns";

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

export async function generateFromTopic(formData: FormData) {
  const topic = String(formData.get("topic") || "").trim();
  const format = (String(formData.get("format") || "long") === "short" ? "short" : "long") as
    | "long"
    | "short";
  if (!topic) return;
  await generateScript({ topic, format, source: "manual" });
  revalidatePath("/generate");
}

export async function generateWeekPlan() {
  await generatePlan();
  revalidatePath("/calendar");
}

export async function writeScriptForPlan(formData: FormData) {
  const id = String(formData.get("id"));
  const { data: p } = await db().from("content_plan").select("topic, format").eq("id", id).single();
  if (p) await generateScript({ topic: p.topic, format: p.format as "long" | "short", planId: id });
  revalidatePath("/calendar");
  revalidatePath("/generate");
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

export async function triggerPatterns() {
  await analyzePatterns();
  revalidatePath("/patterns");
}
