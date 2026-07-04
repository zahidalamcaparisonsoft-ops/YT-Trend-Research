import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { addChannel, removeChannel, toggleChannel } from "../actions";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({ searchParams }: { searchParams: { error?: string } }) {
  let channels: any[] = [];
  let err: string | null = null;
  try {
    const { data, error } = await db()
      .from("channels")
      .select("*")
      .order("is_self", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    channels = data ?? [];
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <Nav active="/channels" />

      {searchParams?.error && (
        <div className="card p-3 mb-4 text-sm text-red-300 border border-red-500/30">
          ⚠️ Couldn&apos;t add channel: {searchParams.error}
        </div>
      )}

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Add a channel</h2>
        <form action={addChannel} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[260px]">
            <label className="label">YouTube URL, @handle, or channel ID</label>
            <input className="input" name="input" placeholder="https://youtube.com/@Creator" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <input type="checkbox" name="is_self" /> This is my channel
          </label>
          <button className="btn btn-brand mb-1" type="submit">
            + Add
          </button>
        </form>
        {err && <p className="text-xs text-amber-300 mt-3">DB error: {err}</p>}
      </div>

      <div className="card divide-y divide-line">
        {channels.length === 0 && !err && (
          <div className="p-5 text-sm text-slate-400">No channels yet.</div>
        )}
        {channels.map((c) => (
          <div key={c.id} className="p-3 flex items-center gap-3 text-sm">
            {c.is_self && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/20 text-brand">YOU</span>
            )}
            <span className="flex-1 truncate">
              {c.name} <span className="text-slate-500">{c.handle || ""}</span>
            </span>
            {!c.is_active && <span className="text-xs text-slate-500">inactive</span>}
            <form action={toggleChannel}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(c.is_active)} />
              <button className="btn btn-ghost !py-1 !px-2 text-xs" type="submit">
                {c.is_active ? "Pause" : "Resume"}
              </button>
            </form>
            <form action={removeChannel}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn-ghost !py-1 !px-2 text-xs text-red-300" type="submit">
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
