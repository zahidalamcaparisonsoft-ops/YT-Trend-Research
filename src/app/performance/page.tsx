import Nav from "@/components/Nav";
import { getMyPerformance } from "@/lib/performance";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  let videos: any[] = [];
  let winners: any[] = [];
  let err: string | null = null;
  try {
    const d = await getMyPerformance();
    videos = d.videos;
    winners = d.winners;
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <Nav active="/performance" />
      <h1 className="text-lg font-semibold mb-1">My Performance</h1>
      <p className="text-xs text-slate-400 mb-5">
        The system learns from your own results — your winners feed every plan &amp; script.
      </p>

      {err && <p className="text-xs text-amber-300 mb-4">DB error: {err}</p>}
      {!err && videos.length === 0 && (
        <div className="card p-5 text-sm text-slate-400">
          No videos from your channel yet. Add your channel in <b>Channels</b> (mark “This is my channel”),
          then <b>Pull latest</b>.
        </div>
      )}

      {winners.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2">🏆 Your winners (feeding the AI)</h2>
          <ul className="text-sm space-y-1">
            {winners.map((w) => (
              <li key={w.id} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${w.format === "short" ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"}`}>
                  {w.format === "short" ? "SHORT" : "LONG"}
                </span>
                <span className="flex-1 truncate">{w.title}</span>
                <span className="text-accent font-semibold">{w.ratio.toFixed(1)}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {videos.length > 0 && (
        <div className="card divide-y divide-line">
          {videos.map((v) => (
            <div key={v.id} className="p-3 flex items-center gap-3 text-sm">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${v.format === "short" ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"}`}>
                {v.format === "short" ? "SHORT" : "LONG"}
              </span>
              <span className="flex-1 truncate">{v.title}</span>
              <span className="text-slate-500 text-xs w-24 text-right">{v.views.toLocaleString()} views</span>
              <span className={`text-xs font-semibold w-14 text-right ${v.ratio >= 1.2 ? "text-accent" : v.ratio < 0.7 ? "text-red-400" : "text-slate-400"}`}>
                {v.ratio.toFixed(1)}×
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
