import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import {
  generateWeekPlan,
  writeScriptForPlan,
  overrideSlot,
  regenerateSlotAction,
  markSlotDone,
  refreshSuggestions,
  swapWithSuggestion,
} from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function load() {
  const supabase = db();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: scheduled }, { data: pool }] = await Promise.all([
    supabase.from("content_plan").select("*").gte("publish_date", today).order("publish_date", { ascending: true }),
    supabase
      .from("content_plan")
      .select("*")
      .is("publish_date", null)
      .eq("status", "idea")
      .order("created_at", { ascending: false }),
  ]);
  return { scheduled: scheduled || [], pool: pool || [] };
}

export default async function CalendarPage({ searchParams }: { searchParams: { error?: string } }) {
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
        <div className="card p-3 mb-4 text-sm text-red-300 border border-red-500/30">⚠️ {searchParams.error}</div>
      )}
      {err && <p className="text-xs text-amber-300 mb-4">DB error: {err}</p>}
      {!err && scheduled.length === 0 && (
        <div className="card p-5 text-sm text-slate-400">
          No plan yet. Set your cadence in <b>Channel DNA</b>, run a <b>Trends</b> analysis, then hit “Plan next week”.
        </div>
      )}

      <div className="space-y-3">
        {scheduled.map((s) => (
          <Slot key={s.id} s={s} />
        ))}
      </div>

      {/* Fresh ideas pool — updates as trends change */}
      <div className="mt-10">
        <form action={refreshSuggestions} className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">💡 Fresh ideas from trends</h2>
              <p className="text-xs text-slate-400">
                Auto-updated as your competitors post &amp; trends shift. Swap any into a calendar slot.
              </p>
            </div>
            <PendingButton pendingText="Finding…">🔄 Refresh ideas</PendingButton>
          </div>
          <PendingBar label="Pulling fresh ideas from the latest trends…" />
        </form>

        {pool.length === 0 ? (
          <div className="card p-5 text-sm text-slate-400">
            No suggestions yet. Run a <b>Trends</b> analysis, or hit “Refresh ideas”.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {pool.map((p) => (
              <PoolCard key={p.id} p={p} slots={scheduled.filter((s) => s.format === p.format)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Slot({ s }: { s: any }) {
  const isShort = s.format === "short";
  const scripted = s.status === "scripted";
  const done = s.status === "published";
  const pub = new Date(s.publish_date + "T00:00:00");
  return (
    <div className={`card p-4 ${done ? "opacity-60" : ""}`}>
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
        <span className={`text-[10px] px-2 py-0.5 rounded ${done ? "bg-accent/20 text-accent" : "bg-line text-slate-300"}`}>
          {done ? "✓ done" : s.status}
        </span>
      </div>

      {s.angle && <p className="text-sm text-slate-400 mb-2">↳ {s.angle}</p>}

      <div className="text-xs text-slate-500 mb-3">
        📝 script by {s.script_ready_by} &nbsp;·&nbsp; 🎬 film by {s.film_by} &nbsp;·&nbsp; ✂️ edit {s.edit_start}→
        {s.edit_end} &nbsp;·&nbsp; 🚀 publish {s.publish_date}
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

        <form action={regenerateSlotAction}>
          <input type="hidden" name="id" value={s.id} />
          <PendingButton pendingText="Thinking…" className="btn btn-ghost !py-1 !px-2 text-xs">
            🔄 Suggest another
          </PendingButton>
        </form>

        {!done && (
          <form action={markSlotDone}>
            <input type="hidden" name="id" value={s.id} />
            <button className="btn btn-ghost !py-1 !px-2 text-xs text-accent" type="submit">
              ✓ Mark done
            </button>
          </form>
        )}

        <form action={overrideSlot} className="flex items-center gap-1">
          <input type="hidden" name="id" value={s.id} />
          <input className="input !py-1 !px-2 text-xs w-44" name="topic" placeholder="Type your own idea…" />
          <button className="btn btn-ghost !py-1 !px-2 text-xs" type="submit">
            Swap
          </button>
        </form>
      </div>
    </div>
  );
}

function PoolCard({ p, slots }: { p: any; slots: any[] }) {
  const isShort = p.format === "short";
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            isShort ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"
          }`}
        >
          {isShort ? "SHORT" : "LONG"}
        </span>
        <Source src={p.source} />
        <span className="font-medium text-sm flex-1">{p.topic}</span>
      </div>
      {p.angle && <p className="text-sm text-slate-400 mb-3">↳ {p.angle}</p>}

      {slots.length > 0 ? (
        <form action={swapWithSuggestion} className="flex items-center gap-2">
          <input type="hidden" name="poolId" value={p.id} />
          <select name="slotId" className="input !py-1 !px-2 text-xs flex-1">
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.publish_date + "T00:00:00").toLocaleDateString()} — {(s.topic || "").slice(0, 38)}
              </option>
            ))}
          </select>
          <button className="btn btn-brand !py-1 !px-2 text-xs" type="submit">
            Swap in →
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-500">No {isShort ? "short" : "long"} slots on the calendar to swap into.</p>
      )}
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
