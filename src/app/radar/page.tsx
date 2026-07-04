import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { triggerRadar, swapRadarIntoSlot } from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

async function load() {
  const supabase = db();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: ideas }, { data: slots }] = await Promise.all([
    supabase.from("internet_ideas").select("*").order("created_at", { ascending: false }),
    supabase
      .from("content_plan")
      .select("id, publish_date, format, topic")
      .gte("publish_date", today)
      .order("publish_date", { ascending: true }),
  ]);
  return { ideas: ideas || [], slots: slots || [] };
}

export default async function RadarPage({ searchParams }: { searchParams: { error?: string } }) {
  let ideas: any[] = [];
  let slots: any[] = [];
  let err: string | null = null;
  try {
    const d = await load();
    ideas = d.ideas;
    slots = d.slots;
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <Nav active="/radar" />
      <form action={triggerRadar} className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">🌐 Internet Radar</h1>
            <p className="text-xs text-slate-400">
              What the WHOLE niche is making right now — beyond your competitors. Stay ahead. (Auto-refreshed
              daily at 9am Dhaka + sent to Discord.)
            </p>
          </div>
          <PendingButton pendingText="Scanning…">🔍 Discover now</PendingButton>
        </div>
        <PendingBar label="Scanning all of YouTube across your niche — up to a minute." />
      </form>

      {searchParams?.error && (
        <div className="card p-3 mb-4 text-sm text-red-300 border border-red-500/30">⚠️ {searchParams.error}</div>
      )}
      {err && <p className="text-xs text-amber-300 mb-4">DB error: {err}</p>}
      {ideas.length === 0 && !err && (
        <div className="card p-5 text-sm text-slate-400">No radar ideas yet. Hit “Discover now”.</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {ideas.map((i) => {
          const slotsFor = slots.filter((s) => s.format === i.format);
          return (
            <div key={i.id} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    i.format === "short" ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"
                  }`}
                >
                  {i.format === "short" ? "SHORT" : "LONG"}
                </span>
                <span className="font-medium text-sm flex-1">{i.topic}</span>
              </div>
              {i.angle && <p className="text-sm text-slate-300 mb-1">↳ {i.angle}</p>}
              {i.why && <p className="text-xs text-slate-500 mb-3">📈 {i.why}</p>}

              {slotsFor.length > 0 ? (
                <form action={swapRadarIntoSlot} className="flex items-center gap-2">
                  <input type="hidden" name="ideaId" value={i.id} />
                  <select name="slotId" className="input !py-1 !px-2 text-xs flex-1">
                    {slotsFor.map((s) => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.publish_date + "T00:00:00").toLocaleDateString()} — {(s.topic || "").slice(0, 34)}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-brand !py-1 !px-2 text-xs" type="submit">
                    Swap in →
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-600">Plan a week first to swap this {i.format} idea into a slot.</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
