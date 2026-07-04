import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { removeChannel, toggleChannel } from "../actions";
import AddChannelForm from "./AddChannelForm";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: { error?: string; added?: string };
}) {
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

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Add a channel</h2>
        <AddChannelForm added={searchParams?.added} error={searchParams?.error} />
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
