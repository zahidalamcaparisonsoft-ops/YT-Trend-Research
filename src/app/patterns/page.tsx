import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { triggerPatterns } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

async function load() {
  const { data } = await db().from("insights").select("*").eq("id", 1).single();
  return data || {};
}

export default async function PatternsPage() {
  let ins: any = {};
  let err: string | null = null;
  try {
    ins = await load();
  } catch (e: any) {
    err = e.message;
  }
  const tp = ins.title_patterns || {};
  const thp = ins.thumbnail_patterns || {};

  return (
    <>
      <Nav active="/patterns" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Title &amp; Thumbnail Patterns</h1>
          <p className="text-xs text-slate-400">
            What makes competitors&apos; winning videos click — learned from their titles &amp; thumbnails.
          </p>
        </div>
        <form action={triggerPatterns}>
          <button className="btn btn-brand" type="submit">
            🔎 Analyze patterns
          </button>
        </form>
      </div>

      {err && <p className="text-xs text-amber-300 mb-4">DB error: {err}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold mb-3">📺 Long-form</h2>
          <List title="Title patterns" items={tp.long} />
          <List title="Thumbnail patterns" items={thp.long} />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3">⚡ Shorts</h2>
          <List title="Title/caption patterns" items={tp.short} />
          <List title="Thumbnail/cover patterns" items={thp.short} />
        </div>
      </div>
    </>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="card p-4 mb-3">
      <div className="label">{title}</div>
      {items && items.length > 0 ? (
        <ul className="text-sm list-disc pl-5 space-y-1 mt-1">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 mt-1">Run “Analyze patterns”.</p>
      )}
    </div>
  );
}
