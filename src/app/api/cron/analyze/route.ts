import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/analyze";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Weekly. Guarded by CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  const ok = secret === expected || (expected && auth === `Bearer ${expected}`);
  if (expected && !ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await runAnalysis();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
