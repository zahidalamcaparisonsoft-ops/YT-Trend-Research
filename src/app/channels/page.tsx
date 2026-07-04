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
      <div className="mb-5 hidden md:block">
        <h1 className="text-2xl font-bold">Channels</h1>
        <p className="text-sm text-zinc-500">The competitors you track — plus your own channel.</p>
      </div>

      <div className="card p-5 mb-5">
        <h2 className="text-sm font-bold mb-3">Add a channel</h2>
        <AddChannelForm added={searchParams?.added} error={searchParams?.error} />
        {err && <p className="text-xs text-amber-600 mt-3">DB error: {err}</p>}
      </div>

      <div className="card divide-y divide-line overflow-hidden">
        {channels.length === 0 && !err && <div className="p-5 text-sm text-zinc-500">No channels yet.</div>}
        {channels.map((c) => (
          <div key={c.id} className="p-3.5 flex items-center gap-3 text-sm flex-wrap">
            {c.is_self && <span className="pill bg-sun/30 text-yellow-800">★ YOU</span>}
            <span className="flex-1 truncate font-medium min-w-[140px]">
              {c.name} <span className="text-zinc-400 font-normal">{c.handle || ""}</span>
            </span>
            {!c.is_active && <span className="pill pill-muted">paused</span>}
            <div className="flex items-center gap-2 ml-auto">
              <form action={toggleChannel}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={String(c.is_active)} />
                <button className="btn btn-ghost !py-1 !px-2.5 !text-xs" type="submit">
                  {c.is_active ? "Pause" : "Resume"}
                </button>
              </form>
              <form action={removeChannel}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn btn-ghost !py-1 !px-2.5 !text-xs !text-red-500" type="submit">
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
