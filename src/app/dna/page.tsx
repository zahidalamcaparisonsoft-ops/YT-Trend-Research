import { db } from "@/lib/supabase";
import { saveProfile, saveConfig } from "../actions";
import SavedToast from "@/components/SavedToast";
import PendingButton from "@/components/PendingButton";

export const dynamic = "force-dynamic";

export default async function DnaPage({ searchParams }: { searchParams: { saved?: string } }) {
  let profile: any = {};
  let config: any = {};
  let err: string | null = null;
  try {
    const supabase = db();
    const [p, c] = await Promise.all([
      supabase.from("channel_profile").select("*").eq("id", 1).single(),
      supabase.from("channel_config").select("*").eq("id", 1).single(),
    ]);
    profile = p.data ?? {};
    config = c.data ?? {};
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <div className="mb-5 hidden md:block">
        <h1 className="text-2xl font-bold">Channel DNA</h1>
        <p className="text-sm text-zinc-500">Who you are — every script and plan is generated from this.</p>
      </div>

      <SavedToast saved={searchParams?.saved} />
      {err && <p className="text-xs text-amber-600 mb-4">DB error: {err}</p>}

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <form action={saveProfile} className="card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold">Channel DNA</h2>
            <p className="text-xs text-zinc-500">The system uses this to keep every script on-brand.</p>
          </div>
          <Field name="name" label="Channel name" val={profile.name} />
          <Field name="niche" label="Niche" val={profile.niche} textarea />
          <Field name="audience" label="Audience" val={profile.audience} textarea />
          <Field name="voice_tone" label="Voice / tone" val={profile.voice_tone} textarea />
          <Field name="positioning" label="Positioning (one line)" val={profile.positioning} />
          <div>
            <label className="label">Content pillars (one per line)</label>
            <textarea
              className="input min-h-[100px]"
              name="pillars"
              defaultValue={(profile.pillars || []).join("\n")}
            />
          </div>
          <PendingButton pendingText="Saving…">Save DNA</PendingButton>
        </form>

        <form action={saveConfig} className="card p-5 space-y-4 h-fit">
          <div>
            <h2 className="text-sm font-bold">Cadence &amp; edit buffer</h2>
            <p className="text-xs text-zinc-500">Change anytime — the planner re-plans around it.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Num name="longs_per_week" label="Long / week" val={config.longs_per_week ?? 2} />
            <Num name="shorts_per_week" label="Shorts / week" val={config.shorts_per_week ?? 3} />
            <Num name="edit_days_long" label="Edit days (long)" val={config.edit_days_long ?? 2} />
            <Num name="edit_days_short" label="Edit days (short)" val={config.edit_days_short ?? 1} />
          </div>
          <div>
            <label className="label">Autopilot balance</label>
            <select className="input" name="trend_vs_pillar" defaultValue={config.trend_vs_pillar ?? "pillar-led"}>
              <option value="pillar-led">Pillar-led (consistent channel + timely trends)</option>
              <option value="balanced">Balanced</option>
              <option value="trend-led">Trend-led (chase what&apos;s hot)</option>
            </select>
          </div>
          <PendingButton pendingText="Saving…">Save config</PendingButton>
        </form>
      </div>
    </>
  );
}

function Field({ name, label, val, textarea }: { name: string; label: string; val?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea className="input min-h-[64px]" name={name} defaultValue={val || ""} />
      ) : (
        <input className="input" name={name} defaultValue={val || ""} />
      )}
    </div>
  );
}

function Num({ name, label, val }: { name: string; label: string; val: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" name={name} defaultValue={val} min={0} />
    </div>
  );
}
