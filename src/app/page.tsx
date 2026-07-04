import Link from "next/link";
import { db } from "@/lib/supabase";
import { triggerIngest } from "./actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function load() {
  const supabase = db();
  const today = new Date().toISOString().slice(0, 10);
  const [channels, longs, shorts, recent, nextUp] = await Promise.all([
    supabase.from("channels").select("id", { count: "exact", head: true }),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("format", "long"),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("format", "short"),
    supabase
      .from("videos")
      .select("title, format, published_at, youtube_video_id, channels(name)")
      .order("published_at", { ascending: false })
      .limit(12),
    supabase
      .from("content_plan")
      .select("id, topic, format, publish_date, status")
      .gte("publish_date", today)
      .neq("status", "published")
      .order("publish_date", { ascending: true })
      .limit(3),
  ]);
  return {
    channels: channels.count ?? 0,
    longs: longs.count ?? 0,
    shorts: shorts.count ?? 0,
    recent: recent.data ?? [],
    nextUp: nextUp.data ?? [],
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
      <div className="hidden md:block mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Your competitor intelligence at a glance.</p>
      </div>

      {err ? (
        <div className="card p-5 text-sm text-amber-700 bg-amber-50 border-amber-200">
          Couldn&apos;t reach the database. Make sure you ran <code>supabase/schema.sql</code> and set the env
          vars. <br />
          <span className="text-zinc-500">({err})</span>
        </div>
      ) : (
        <>
          {/* stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat n={data!.channels} label="Channels tracked" />
            <Stat n={data!.longs} label="Long videos" />
            <Stat n={data!.shorts} label="Shorts" />
          </div>

          {/* next up */}
          {data!.nextUp.length > 0 && (
            <div className="card p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold">🎯 Next up on your calendar</h2>
                <Link href="/calendar" className="text-xs font-semibold text-zinc-500 hover:text-zinc-900">
                  Open calendar →
                </Link>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {data!.nextUp.map((s: any) => (
                  <Link
                    key={s.id}
                    href="/calendar"
                    className="rounded-xl border border-line p-3 hover:bg-zinc-50 transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`pill ${s.format === "short" ? "pill-short" : "pill-long"}`}>
                        {s.format === "short" ? "SHORT" : "LONG"}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-400">
                        {new Date(s.publish_date + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium leading-snug line-clamp-2">{s.topic}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* recent uploads */}
          <form action={triggerIngest} className="mb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">Recent competitor uploads</h2>
              <PendingButton pendingText="Pulling…">⟳ Pull latest now</PendingButton>
            </div>
            <PendingBar label="Fetching latest videos from all your channels — this can take up to a minute." />
          </form>

          <div className="card divide-y divide-line overflow-hidden">
            {data!.recent.length === 0 && (
              <div className="p-5 text-sm text-zinc-500">No videos yet. Add channels, then hit “Pull latest now”.</div>
            )}
            {data!.recent.map((v: any, i: number) => (
              <a
                key={i}
                href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-3.5 flex items-center gap-3 text-sm hover:bg-zinc-50 transition"
              >
                <span className={`pill ${v.format === "short" ? "pill-short" : "pill-long"}`}>
                  {v.format === "short" ? "SHORT" : "LONG"}
                </span>
                <span className="flex-1 truncate font-medium group-hover:underline">{v.title}</span>
                <span className="hidden sm:block text-zinc-400 truncate max-w-[140px] text-xs">
                  {v.channels?.name}
                </span>
                <span className="text-zinc-400 text-xs whitespace-nowrap">
                  {v.published_at
                    ? new Date(v.published_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                    : ""}
                </span>
                <span className="text-zinc-300 group-hover:text-zinc-900 text-xs">↗</span>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card p-4 md:p-5">
      <div className="text-2xl md:text-3xl font-bold tracking-tight">{n}</div>
      <div className="text-[11px] md:text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
