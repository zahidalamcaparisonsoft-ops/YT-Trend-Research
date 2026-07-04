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
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold">My Performance</h1>
        <p className="text-xs md:text-sm text-zinc-500">
          The system learns from your own results — your winners feed every plan &amp; script.
        </p>
      </div>

      {err && <p className="text-xs text-amber-600 mb-4">DB error: {err}</p>}
      {!err && videos.length === 0 && (
        <div className="card p-5 text-sm text-zinc-500">
          No videos from your channel yet. Add your channel in <b>Channels</b> (mark “This is my channel”), then{" "}
          <b>Pull latest</b>.
        </div>
      )}

      {winners.length > 0 && (
        <div className="card p-4 mb-5">
          <h2 className="text-sm font-bold mb-3">🏆 Your winners (feeding the AI)</h2>
          <ul className="text-sm space-y-2">
            {winners.map((w) => (
              <li key={w.id} className="flex items-center gap-2">
                <span className={`pill ${w.format === "short" ? "pill-short" : "pill-long"}`}>
                  {w.format === "short" ? "SHORT" : "LONG"}
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${w.ytid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate font-medium hover:underline"
                >
                  {w.title}
                </a>
                <span className="text-emerald-600 font-bold text-xs">{w.ratio.toFixed(1)}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {videos.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {videos.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/watch?v=${v.ytid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-3.5 flex items-center gap-3 text-sm hover:bg-zinc-50 transition"
            >
              <span className={`pill ${v.format === "short" ? "pill-short" : "pill-long"}`}>
                {v.format === "short" ? "SHORT" : "LONG"}
              </span>
              <span className="flex-1 truncate font-medium group-hover:underline">{v.title}</span>
              <span className="text-zinc-400 text-xs w-20 text-right whitespace-nowrap">
                {v.views.toLocaleString()} views
              </span>
              <span
                className={`text-xs font-bold w-12 text-right ${
                  v.ratio >= 1.2 ? "text-emerald-600" : v.ratio < 0.7 ? "text-red-500" : "text-zinc-400"
                }`}
              >
                {v.ratio.toFixed(1)}×
              </span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
