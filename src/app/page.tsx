import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { triggerIngest } from "./actions";

export const dynamic = "force-dynamic";

async function load() {
  const supabase = db();
  const [channels, longs, shorts, recent] = await Promise.all([
    supabase.from("channels").select("id", { count: "exact", head: true }),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("format", "long"),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("format", "short"),
    supabase
      .from("videos")
      .select("title, format, published_at, channels(name)")
      .order("published_at", { ascending: false })
      .limit(12),
  ]);
  return {
    channels: channels.count ?? 0,
    longs: longs.count ?? 0,
    shorts: shorts.count ?? 0,
    recent: recent.data ?? [],
  };
}

export default async function Dashboard() {
  let data;
  let err: string | null = null;
  try {
    data = await load();
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <Nav active="/" />
      {err ? (
        <div className="card p-5 text-sm text-amber-300">
          Couldn&apos;t reach the database. Make sure you ran <code>supabase/schema.sql</code> and set
          the env vars. <br />
          <span className="text-slate-400">({err})</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat n={data!.channels} label="Channels tracked" />
            <Stat n={data!.longs} label="Long videos" />
            <Stat n={data!.shorts} label="Shorts" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Recent competitor uploads</h2>
            <form action={triggerIngest}>
              <button className="btn btn-brand" type="submit">
                ⟳ Pull latest now
              </button>
            </form>
          </div>

          <div className="card divide-y divide-line">
            {data!.recent.length === 0 && (
              <div className="p-5 text-sm text-slate-400">
                No videos yet. Add channels, then hit “Pull latest now”.
              </div>
            )}
            {data!.recent.map((v: any, i: number) => (
              <div key={i} className="p-3 flex items-center gap-3 text-sm">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    v.format === "short" ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"
                  }`}
                >
                  {v.format === "short" ? "SHORT" : "LONG"}
                </span>
                <span className="flex-1 truncate">{v.title}</span>
                <span className="text-slate-500 truncate max-w-[140px]">{v.channels?.name}</span>
                <span className="text-slate-600 text-xs">
                  {v.published_at ? new Date(v.published_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
