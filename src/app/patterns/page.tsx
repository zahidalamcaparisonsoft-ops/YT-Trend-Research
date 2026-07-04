import { db } from "@/lib/supabase";
import { triggerPatterns } from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

async function load() {
  const { data } = await db().from("insights").select("*").eq("id", 1).single();
  return data || {};
}

export default async function PatternsPage({ searchParams }: { searchParams: { error?: string } }) {
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
      <form action={triggerPatterns} className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Title &amp; Thumbnail Patterns</h1>
            <p className="text-xs md:text-sm text-zinc-500">
              What makes competitors&apos; winning videos click — learned from their titles &amp; thumbnails.
            </p>
          </div>
          <PendingButton pendingText="Analyzing…">🔎 Analyze patterns</PendingButton>
        </div>
        <PendingBar label="Studying competitor titles & thumbnails with AI vision — up to a minute." />
      </form>

      {searchParams?.error && <div className="toast-err">⚠️ Pattern analysis failed: {searchParams.error}</div>}
      {err && <p className="text-xs text-amber-600 mb-4">DB error: {err}</p>}

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <h2 className="text-sm font-bold mb-3">📺 Long-form</h2>
          <List title="Title patterns" items={tp.long} />
          <List title="Thumbnail patterns" items={thp.long} />
        </div>
        <div>
          <h2 className="text-sm font-bold mb-3">⚡ Shorts</h2>
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
        <ul className="text-sm text-zinc-700 list-disc pl-5 space-y-1.5 mt-1">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-400 mt-1">Run “Analyze patterns”.</p>
      )}
    </div>
  );
}
