import { db } from "@/lib/supabase";
import GenerateClient from "./GenerateClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function load() {
  const supabase = db();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: assets }, { data: slots }] = await Promise.all([
    supabase
      .from("content_assets")
      .select("*, content_plan(id, topic, format, source, publish_date)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("content_plan")
      .select("id, publish_date, format, topic, status")
      .not("publish_date", "is", null)
      .gte("publish_date", today)
      .order("publish_date", { ascending: true }),
  ]);
  return { assets: assets || [], slots: slots || [] };
}

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: { error?: string; open?: string };
}) {
  let assets: any[] = [];
  let slots: any[] = [];
  let err: string | null = null;
  try {
    const d = await load();
    assets = d.assets;
    slots = d.slots;
  } catch (e: any) {
    err = e.message;
  }

  return (
    <GenerateClient
      assets={assets}
      slots={slots}
      dbError={err}
      actionError={searchParams?.error}
      openPlanId={searchParams?.open}
    />
  );
}
