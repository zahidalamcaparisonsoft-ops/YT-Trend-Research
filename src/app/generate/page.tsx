import Nav from "@/components/Nav";
import { db } from "@/lib/supabase";
import { generateFromTopic } from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function recent() {
  const { data } = await db()
    .from("content_assets")
    .select("*, content_plan(topic, format, source, created_at)")
    .order("created_at", { ascending: false })
    .limit(10);
  return data || [];
}

export default async function GeneratePage({ searchParams }: { searchParams: { error?: string } }) {
  let items: any[] = [];
  let err: string | null = null;
  try {
    items = await recent();
  } catch (e: any) {
    err = e.message;
  }

  return (
    <>
      <Nav active="/generate" />
      <div className="card p-5 mb-6">
        <h1 className="text-lg font-semibold mb-1">Generate a script</h1>
        <p className="text-xs text-slate-400 mb-4">
          Any topic — from your trend list or a brand-new idea. It writes the full package in your voice.
        </p>
        <form action={generateFromTopic} className="space-y-3">
          <textarea
            className="input min-h-[70px]"
            name="topic"
            placeholder="e.g. Build a Chrome extension that summarizes any page with AI — in 20 minutes"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="format" value="long" defaultChecked /> Long video
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="format" value="short" /> Short
            </label>
            <PendingButton pendingText="Writing…" className="btn btn-brand ml-auto">
              ✍️ Generate
            </PendingButton>
          </div>
          <PendingBar label="Writing your full script package in your voice — up to a minute." />
        </form>
        {searchParams?.error && (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm bg-red-500/15 text-red-300 border border-red-500/30">
            ⚠️ {searchParams.error}
          </p>
        )}
        {err && <p className="text-xs text-amber-300 mt-3">DB error: {err}</p>}
      </div>

      <h2 className="text-sm font-semibold mb-3">Recent generations</h2>
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="card p-4 text-sm text-slate-400">Nothing yet — generate your first script above.</div>
        )}
        {items.map((a) => {
          const p = Array.isArray(a.content_plan) ? a.content_plan[0] : a.content_plan;
          const isShort = p?.format === "short";
          return (
            <details key={a.id} className="card p-4">
              <summary className="cursor-pointer flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isShort ? "bg-brand/20 text-brand" : "bg-accent/20 text-accent"
                  }`}
                >
                  {isShort ? "SHORT" : "LONG"}
                </span>
                <span className="text-sm font-medium flex-1">{p?.topic}</span>
                <span className="text-xs text-slate-500">{a.title_options?.[0] || ""}</span>
              </summary>
              <div className="mt-3 space-y-3 text-sm">
                {a.title_options?.length > 0 && (
                  <Block label="Titles">
                    <ul className="list-disc pl-5">
                      {a.title_options.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </Block>
                )}
                {a.hook && <Block label="Hook"><p>{a.hook}</p></Block>}
                {a.script && <Block label="Script"><pre className="whitespace-pre-wrap font-sans">{a.script}</pre></Block>}
                {a.onscreen_text && <Block label="On-screen text"><pre className="whitespace-pre-wrap font-sans">{a.onscreen_text}</pre></Block>}
                {a.audio_suggestion && <Block label="Audio"><p>{a.audio_suggestion}</p></Block>}
                {a.thumbnail_concept && <Block label="Thumbnail"><p>{a.thumbnail_concept}</p></Block>}
                {a.description && <Block label="Description"><pre className="whitespace-pre-wrap font-sans">{a.description}</pre></Block>}
                {(a.tags?.length > 0 || a.hashtags?.length > 0) && (
                  <Block label="Tags">
                    <p className="text-slate-400">{[...(a.tags || []), ...(a.hashtags || [])].join("  ")}</p>
                  </Block>
                )}
                {a.skool_post && <Block label="Skool post"><pre className="whitespace-pre-wrap font-sans">{a.skool_post}</pre></Block>}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-slate-200">{children}</div>
    </div>
  );
}
