import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";
import { sendInternetDigest } from "@/lib/internet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs daily at 9am Bangladesh time (03:00 UTC). Sends the Internet Radar digest first
// (the priority), then refreshes competitor data.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result: any = {};

  // 1) daily internet-ideas Discord message (the 9am digest)
  try {
    await sendInternetDigest(req.nextUrl.origin);
    result.radar = "sent";
  } catch (e: any) {
    result.radarError = e.message;
  }

  // 2) refresh competitor data (+ hot alerts fire inside)
  try {
    result.ingest = await runIngest();
  } catch (e: any) {
    result.ingestError = e.message;
  }

  return NextResponse.json({ ok: true, ...result });
}
