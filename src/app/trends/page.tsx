import { db } from "@/lib/supabase";
import { triggerAnalysis } from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function load() {
  const { data } = await db()
    .from("trends")
    .select("*")
    .order("week_start", { ascending: false })
    .order("score", { ascending: false, nullsFirst: false })
    .limit(60);
  const rows = data || [];
  return {
    long: rows.filter((t) => t.format === "long"),
    short: rows.filter((t) => t.format === "short"),
  };
}

export default async function TrendsPage({ searchParams }: { searchParams: { error?: string } }) {
  let long: any[] = [];
  let short: any[] = [];
  let err: string | null = null;
  try {
    const d = await load();
    long = d.long;
    short = d.short;
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <form action={triggerAnalysis} className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Trends</h1>
            <p className="text-xs md:text-sm text-zinc-500">
              What&apos;s over-performing on competitor channels — longs &amp; shorts judged separately.
            </p>
          </div>
          <PendingButton pendingText="Analyzing…">⚡ Run analysis</PendingButton>
        </div>
        <PendingBar label="Finding outliers & clustering trends with AI — this can take up to a minute." />
      </form>

      {searchParams?.error && <div className="toast-err">⚠️ Analysis failed: {searchParams.error}</div>}
      {err && <p className="text-xs text-amber-600 mb-4">DB error: {err}</p>}

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <Column title="📺 Long-form" trends={long} />
        <Column title="⚡ Shorts" trends={short} />
      </div>
    </>
  );
}

function Column({ title, trends }: { title: string; trends: any[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold mb-3">{title}</h2>
      {trends.length === 0 && (
        <div className="card p-4 text-sm text-zinc-500">
          No trends yet. Add channels, pull data, then hit “Run analysis”.
        </div>
      )}
      <div className="space-y-3">
        {trends.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Fresh f={t.freshness} />
              <h3 className="font-bold text-sm flex-1">{t.topic}</h3>
              {t.score != null && (
                <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
                  {t.score}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-600 mb-2">{t.summary}</p>
            {t.evidence?.angles?.length > 0 && (
              <ul className="text-sm text-zinc-700 list-disc pl-5 space-y-1 mb-2">
                {t.evidence.angles.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            {t.evidence?.examples?.length > 0 && (
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Proof: {t.evidence.examples.slice(0, 3).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Fresh({ f }: { f: string }) {
  const cls: Record<string, string> = { hot: "pill-hot", rising: "pill-rising", evergreen: "pill-evergreen" };
  const icon: Record<string, string> = { hot: "🔥", rising: "📈", evergreen: "🌲" };
  return (
    <span className={`pill ${cls[f] || "pill-rising"}`}>
      {icon[f] || "📈"} {String(f || "rising").toUpperCase()}
    </span>
  );
}
