import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { resolveChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Diagnostic: what actually works inside the Vercel runtime. Returns no secret values.
export async function GET() {
  const out: any = {};

  out.env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || null,
    DISCORD_WEBHOOK_URL: !!process.env.DISCORD_WEBHOOK_URL,
    // lengths help catch a stray space / newline / truncation (no values exposed)
    lengths: {
      YOUTUBE_API_KEY: (process.env.YOUTUBE_API_KEY || "").length,
      SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").length,
      SUPABASE_URL: (process.env.SUPABASE_URL || "").length,
    },
  };

  try {
    const ch = await resolveChannel("https://www.youtube.com/@mkbhd");
    out.youtube = { ok: true, resolved: ch.title };
  } catch (e: any) {
    out.youtube = { ok: false, error: String(e?.message || e) };
  }

  try {
    const { error } = await db().from("channels").select("id").limit(1);
    out.supabaseRead = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: any) {
    out.supabaseRead = { ok: false, error: String(e?.message || e) };
  }

  try {
    const { error } = await db()
      .from("channel_config")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", 1);
    out.supabaseWrite = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: any) {
    out.supabaseWrite = { ok: false, error: String(e?.message || e) };
  }

  return NextResponse.json(out, { status: 200 });
}
