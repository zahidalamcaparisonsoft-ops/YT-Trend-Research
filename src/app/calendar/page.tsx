import { db } from "@/lib/supabase";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function load() {
  const supabase = db();
  const past = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const [{ data: scheduled }, { data: pool }] = await Promise.all([
    supabase
      .from("content_plan")
      .select("*")
      .not("publish_date", "is", null)
      .gte("publish_date", past)
      .order("publish_date", { ascending: true }),
    supabase
      .from("content_plan")
      .select("*")
      .is("publish_date", null)
      .eq("status", "idea")
      .order("created_at", { ascending: false }),
  ]);
  return { scheduled: scheduled || [], pool: pool || [] };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { error?: string; swapped?: string };
}) {
  let scheduled: any[] = [];
  let pool: any[] = [];
  let err: string | null = null;
  try {
    const d = await load();
    scheduled = d.scheduled;
    pool = d.pool;
  } catch (e: any) {
    err = e.message;
  }

  return (
    <CalendarClient
      scheduled={scheduled}
      pool={pool}
      dbError={err}
      actionError={searchParams?.error}
      swapped={searchParams?.swapped === "1"}
    />
  );
}
