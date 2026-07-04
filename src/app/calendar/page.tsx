import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { generateWeekPlan, writeScriptForPlan, overrideSlot } from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function load() {
  const supabase = db();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("content_plan")
    .select("*")
    .gte("publish_date", today)
    .order("publish_date", { ascending: true });
  return data || [];
}

export default async function CalendarPage({ searchParams }: { searchParams: { error?: string } }) {
  let items: any[] = [];
  let err: string | null = null;
  try {
    items = await load();
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <Nav active="/calendar" />
      <form action={generateWeekPlan} className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Autopilot Calendar</h1>
            <p className="text-xs text-slate-400">
              Topics chosen from your pillars + timely trends. Film/edit dates back-planned from your edit buffer.
            </p>
          </div>
          <PendingButton pendingText="Planning…">🤖 Plan next week</PendingButton>
        </div>
        <PendingBar label="Choosing topics + back-planning your week with AI — up to a minute." />
      </form>

      {searchParams?.error && (
        <div className="card p-3 mb-4 text-sm text-red-300 border border-red-500/30">
          ⚠️ {searchParams.error}
        </div>
      )}
      {err && <p className="text-xs text-amber-300 mb-4">DB error: {err}</p>}
      {!err && items.length === 0 && (
        <div className="card p-5 text-sm text-slate-400">
          No plan yet. Set your cadence in <b>Channel DNA</b>, run a <b>Trends</b> analysis, then hit
          “Plan next week”.
        </div>
      )}

      <div className="space-y-3">
        {items.map((s) => (
          <Slot key={s.id} s={s} />
        ))}
      </div>
    </>
  );
}

function Slot({ s }: { s: any }) {
  const isShort = s.format === "short";
  const scripted = s.status !== "idea";
  const pub = new Date(s.publish_date + "T00:00:00");
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 w-16">
          {WD[pub.getDay()]} {pub.getDate()}/{pub.getMonth() + 1}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            isShort ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"
          }`}
        >
          {isShort ? "SHORT" : "LONG"}
        </span>
        <Source src={s.source} />
        <span className="font-medium text-sm flex-1">{s.topic}</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-line text-slate-300">{s.status}</span>
      </div>

      {s.angle && <p className="text-sm text-slate-400 mb-2">↳ {s.angle}</p>}

      <div className="text-xs text-slate-500 mb-3">
        📝 script by {s.script_ready_by} &nbsp;·&nbsp; 🎬 film by {s.film_by} &nbsp;·&nbsp; ✂️ edit{" "}
        {s.edit_start}→{s.edit_end} &nbsp;·&nbsp; 🚀 publish {s.publish_date}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {scripted ? (
          <a href="/generate" className="btn btn-ghost !py-1 !px-2 text-xs text-accent">
            ✓ Script ready — view
          </a>
        ) : (
          <form action={writeScriptForPlan}>
            <input type="hidden" name="id" value={s.id} />
            <PendingButton pendingText="Writing…" className="btn btn-brand !py-1 !px-2 text-xs">
              ✍️ Write script
            </PendingButton>
          </form>
        )}
        <form action={overrideSlot} className="flex items-center gap-1">
          <input type="hidden" name="id" value={s.id} />
          <input className="input !py-1 !px-2 text-xs w-56" name="topic" placeholder="Override with a hot idea…" />
          <button className="btn btn-ghost !py-1 !px-2 text-xs" type="submit">
            Swap
          </button>
        </form>
      </div>
    </div>
  );
}

function Source({ src }: { src: string }) {
  const map: Record<string, string> = {
    pillar: "bg-slate-500/20 text-slate-300",
    trend: "bg-amber-500/20 text-amber-300",
    hot: "bg-red-500/20 text-red-300",
    manual: "bg-brand/20 text-brand",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${map[src] || map.pillar}`}>
      {String(src || "pillar").toUpperCase()}
    </span>
  );
}
