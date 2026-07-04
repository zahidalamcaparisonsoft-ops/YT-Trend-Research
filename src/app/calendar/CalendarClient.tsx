"use client";

import { useMemo, useState } from "react";
import {
  generateWeekPlan,
  generateMonthPlan,
  writeScriptForPlan,
  overrideSlot,
  regenerateSlotAction,
  markSlotDone,
  deleteSlot,
  moveSlot,
  refreshSuggestions,
  swapWithSuggestion,
} from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";
import FlashToast from "@/components/FlashToast";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export default function CalendarClient({
  scheduled,
  pool,
  dbError,
  actionError,
  swapped,
}: {
  scheduled: any[];
  pool: any[];
  dbError: string | null;
  actionError?: string;
  swapped?: boolean;
}) {
  const today = new Date();
  const [view, setView] = useState<"list" | "month">("list");
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: today.getFullYear(), m: today.getMonth() });
  const [highlight, setHighlight] = useState<string | null>(null);

  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const upcoming = useMemo(
    () => scheduled.filter((s) => s.publish_date >= todayIso),
    [scheduled, todayIso]
  );

  const byDate = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of scheduled) {
      if (!m.has(s.publish_date)) m.set(s.publish_date, []);
      m.get(s.publish_date)!.push(s);
    }
    return m;
  }, [scheduled]);

  const jumpToSlot = (id: string) => {
    setView("list");
    setHighlight(id);
    setTimeout(() => {
      document.getElementById(`slot-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    setTimeout(() => setHighlight(null), 2600);
  };

  return (
    <>
      <FlashToast msg={swapped ? "Idea swapped into your calendar" : undefined} basePath="/calendar" />

      {/* header + plan buttons */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Autopilot Calendar</h1>
          <p className="text-xs md:text-sm text-zinc-500">
            Topics from your pillars + timely trends. Film/edit dates back-planned from your edit buffer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={generateWeekPlan}>
            <PendingButton pendingText="Planning…" className="btn btn-ghost">
              🤖 Plan next week
            </PendingButton>
          </form>
          <form action={generateMonthPlan}>
            <PendingButton pendingText="Planning…" className="btn btn-brand">
              🗓️ Plan the month
            </PendingButton>
          </form>
        </div>
      </div>

      {actionError && <div className="toast-err">⚠️ {actionError}</div>}
      {dbError && <p className="text-xs text-amber-600 mb-4">DB error: {dbError}</p>}

      {/* view toggle */}
      <div className="inline-flex items-center gap-1 bg-zinc-200/70 rounded-xl p-1 mb-4">
        {(["list", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              view === v ? "bg-white shadow-card text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {v === "list" ? "☰ List" : "🗓️ Month"}
          </button>
        ))}
      </div>

      {view === "month" ? (
        <MonthGrid ym={ym} setYm={setYm} byDate={byDate} todayIso={todayIso} onPick={jumpToSlot} />
      ) : (
        <div className="space-y-3">
          {upcoming.length === 0 && !dbError && (
            <div className="card p-5 text-sm text-zinc-500">
              No plan yet. Set your cadence in <b>Channel DNA</b>, run a <b>Trends</b> analysis, then hit “Plan
              next week” or “Plan the month”.
            </div>
          )}
          {upcoming.map((s) => (
            <Slot key={s.id} s={s} highlight={highlight === s.id} />
          ))}
        </div>
      )}

      {/* fresh ideas pool */}
      <div className="mt-10">
        <form action={refreshSuggestions} className="mb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">💡 Fresh ideas from trends</h2>
              <p className="text-xs text-zinc-500">
                Auto-updated as competitors post &amp; trends shift. Swap any into a calendar slot.
              </p>
            </div>
            <PendingButton pendingText="Finding…" className="btn btn-ghost">
              🔄 Refresh ideas
            </PendingButton>
          </div>
          <PendingBar label="Pulling fresh ideas from the latest trends…" />
        </form>

        {pool.length === 0 ? (
          <div className="card p-5 text-sm text-zinc-500">
            No suggestions yet. Run a <b>Trends</b> analysis, or hit “Refresh ideas”.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {pool.map((p) => (
              <PoolCard key={p.id} p={p} slots={upcoming.filter((s) => s.format === p.format)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- month grid ---------------- */

function MonthGrid({
  ym,
  setYm,
  byDate,
  todayIso,
  onPick,
}: {
  ym: { y: number; m: number };
  setYm: (v: { y: number; m: number }) => void;
  byDate: Map<string, any[]>;
  todayIso: string;
  onPick: (id: string) => void;
}) {
  const { y, m } = ym;
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => setYm(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const next = () => setYm(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });

  const statusDot: Record<string, string> = {
    idea: "bg-zinc-300",
    scripted: "bg-sky-400",
    filming: "bg-amber-400",
    editing: "bg-violet-400",
    scheduled: "bg-teal-400",
    published: "bg-emerald-500",
  };

  return (
    <div className="card p-3 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="btn btn-ghost !px-3 !py-1.5">
          ‹
        </button>
        <h2 className="font-bold text-sm md:text-base">
          {MONTHS[m]} {y}
        </h2>
        <button onClick={next} className="btn btn-ghost !px-3 !py-1.5">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-[10px] md:text-xs font-bold text-zinc-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-[64px] md:min-h-[96px]" />;
          const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
          const items = byDate.get(iso) || [];
          const isToday = iso === todayIso;
          return (
            <div
              key={i}
              className={`min-h-[64px] md:min-h-[96px] rounded-lg md:rounded-xl border p-1 md:p-1.5 overflow-hidden ${
                isToday ? "border-sun bg-sun/10" : "border-line bg-white"
              }`}
            >
              <div
                className={`text-[10px] md:text-xs font-bold mb-0.5 ${
                  isToday
                    ? "text-zinc-900 inline-flex items-center justify-center w-5 h-5 rounded-full bg-sun"
                    : "text-zinc-400"
                }`}
              >
                {d}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onPick(s.id)}
                    title={s.topic}
                    className={`w-full text-left rounded md:rounded-md px-1 md:px-1.5 py-0.5 text-[8px] md:text-[10px] font-semibold leading-tight truncate flex items-center gap-1 ${
                      s.format === "short" ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"
                    } ${s.status === "published" ? "opacity-50 line-through" : ""}`}
                  >
                    <span
                      className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusDot[s.status] || "bg-zinc-300"}`}
                    />
                    <span className="truncate">{s.topic}</span>
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="text-[8px] md:text-[10px] text-zinc-400 font-semibold px-1">
                    +{items.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-300" /> Long
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-100 border border-violet-300" /> Short
        </span>
        <span className="mx-1 text-zinc-300">|</span>
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-300" /> idea</span>
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> scripted</span>
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> done</span>
        <span className="ml-auto">Tap an item to open it in the list</span>
      </div>
    </div>
  );
}

/* ---------------- list slot ---------------- */

function Slot({ s, highlight }: { s: any; highlight: boolean }) {
  const isShort = s.format === "short";
  const scripted = s.status === "scripted";
  const done = s.status === "published";
  const pub = new Date(s.publish_date + "T00:00:00");
  return (
    <div
      id={`slot-${s.id}`}
      className={`card p-4 transition-all ${done ? "opacity-60" : ""} ${
        highlight ? "ring-2 ring-sun shadow-pop" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-bold text-zinc-400 w-14">
          {WD[pub.getDay()]} {pub.getDate()}/{pub.getMonth() + 1}
        </span>
        <span className={`pill ${isShort ? "pill-short" : "pill-long"}`}>{isShort ? "SHORT" : "LONG"}</span>
        <Source src={s.source} />
        <span className="font-semibold text-sm flex-1 leading-snug min-w-[160px]">{s.topic}</span>
        <span className={`pill ${done ? "pill-done" : "pill-muted"}`}>{done ? "✓ done" : s.status}</span>
      </div>

      {s.angle && <p className="text-sm text-zinc-500 mb-2">↳ {s.angle}</p>}

      <div className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
        📝 script by {s.script_ready_by} · 🎬 film by {s.film_by} · ✂️ edit {s.edit_start}→{s.edit_end} · 🚀
        publish {s.publish_date}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {scripted ? (
          <a href={`/generate?open=${s.id}`} className="btn btn-ghost !py-1 !px-2.5 !text-xs !text-emerald-600">
            ✓ Script ready — view
          </a>
        ) : (
          <form action={writeScriptForPlan}>
            <input type="hidden" name="id" value={s.id} />
            <PendingButton pendingText="Writing…" className="btn btn-brand !py-1 !px-2.5 !text-xs">
              ✍️ Write script
            </PendingButton>
          </form>
        )}

        <form action={regenerateSlotAction}>
          <input type="hidden" name="id" value={s.id} />
          <PendingButton pendingText="Thinking…" className="btn btn-ghost !py-1 !px-2.5 !text-xs">
            🔄 Suggest another
          </PendingButton>
        </form>

        {!done && (
          <form action={markSlotDone}>
            <input type="hidden" name="id" value={s.id} />
            <button className="btn btn-ghost !py-1 !px-2.5 !text-xs !text-emerald-600" type="submit">
              ✓ Mark done
            </button>
          </form>
        )}

        <form action={moveSlot} className="inline-flex items-center gap-1">
          <input type="hidden" name="id" value={s.id} />
          <input
            type="date"
            name="publish_date"
            defaultValue={s.publish_date}
            className="input !py-1 !px-2 !text-xs !w-auto"
          />
          <button className="btn btn-ghost !py-1 !px-2.5 !text-xs" type="submit">
            Move
          </button>
        </form>

        <form action={deleteSlot}>
          <input type="hidden" name="id" value={s.id} />
          <button className="btn btn-ghost !py-1 !px-2.5 !text-xs !text-red-500" type="submit">
            🗑
          </button>
        </form>

        <form action={overrideSlot} className="flex items-center gap-1 flex-1 min-w-[200px]">
          <input type="hidden" name="id" value={s.id} />
          <input className="input !py-1 !px-2 !text-xs flex-1" name="topic" placeholder="Type your own idea…" />
          <button className="btn btn-ghost !py-1 !px-2.5 !text-xs" type="submit">
            Swap
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- pool card ---------------- */

function PoolCard({ p, slots }: { p: any; slots: any[] }) {
  const isShort = p.format === "short";
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`pill ${isShort ? "pill-short" : "pill-long"}`}>{isShort ? "SHORT" : "LONG"}</span>
        <Source src={p.source} />
        <span className="font-semibold text-sm flex-1 leading-snug">{p.topic}</span>
      </div>
      {p.angle && <p className="text-sm text-zinc-500 mb-3">↳ {p.angle}</p>}

      {slots.length > 0 ? (
        <form action={swapWithSuggestion} className="flex items-center gap-2">
          <input type="hidden" name="poolId" value={p.id} />
          <select name="slotId" className="input !py-1.5 !px-2 !text-xs flex-1">
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.publish_date + "T00:00:00").toLocaleDateString()} — {(s.topic || "").slice(0, 38)}
              </option>
            ))}
          </select>
          <button className="btn btn-sun !py-1.5 !px-3 !text-xs" type="submit">
            Swap in →
          </button>
        </form>
      ) : (
        <p className="text-xs text-zinc-400">No {isShort ? "short" : "long"} slots on the calendar to swap into.</p>
      )}
    </div>
  );
}

function Source({ src }: { src: string }) {
  const map: Record<string, string> = {
    pillar: "pill-pillar",
    trend: "pill-trend",
    hot: "pill-hot",
    manual: "pill-manual",
  };
  return <span className={`pill ${map[src] || "pill-pillar"}`}>{String(src || "pillar").toUpperCase()}</span>;
}
