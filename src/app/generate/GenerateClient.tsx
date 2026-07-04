"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateFromTopic, clearAssetsBulk } from "../actions";
import PendingButton from "@/components/PendingButton";
import PendingBar from "@/components/PendingBar";
import CopyButton from "@/components/CopyButton";

const words = (t?: string) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

export default function GenerateClient({
  assets,
  slots,
  dbError,
  actionError,
  openPlanId,
}: {
  assets: any[];
  slots: any[];
  dbError: string | null;
  actionError?: string;
  openPlanId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* ---- form state ---- */
  const [planId, setPlanId] = useState("");
  const [format, setFormat] = useState<"long" | "short">("long");
  const chosenSlot = slots.find((s) => s.id === planId);
  const effFormat = chosenSlot ? chosenSlot.format : format;

  /* ---- accordion + selection state ---- */
  // null = auto (open the deep-linked or newest); "none" = all collapsed
  const [openId, setOpenId] = useState<string | null>(null);
  const autoOpen =
    (openPlanId && assets.find((a) => planOf(a)?.id === openPlanId)?.id) || assets[0]?.id || null;
  const effectiveOpen = openId === null ? autoOpen : openId === "none" ? null : openId;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = assets.length > 0 && selected.size === assets.length;

  const toggleOpen = (id: string) => setOpenId(effectiveOpen === id ? "none" : id);
  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const clear = (ids: string[]) =>
    startTransition(async () => {
      await clearAssetsBulk(ids);
      setSelected(new Set());
      router.refresh();
    });

  return (
    <>
      {/* ---------- generator form ---------- */}
      <div className="card p-5 mb-6">
        <h1 className="text-lg md:text-xl font-bold mb-1">Generate a script</h1>
        <p className="text-xs text-zinc-500 mb-4">
          Pick something from your calendar, or write any topic. It writes the full package in your voice.
        </p>

        <form action={generateFromTopic} className="space-y-4">
          <div>
            <label className="label">From your calendar</label>
            <select
              name="plan_id"
              className="input"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">✍️ Custom topic (write your own below)</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.publish_date + "T00:00:00").toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {s.format === "short" ? "SHORT" : "LONG"} · {s.topic}
                  {s.status === "scripted" ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>

          {chosenSlot ? (
            <div className="rounded-xl border border-line bg-zinc-50 p-3.5 text-sm">
              <span className={`pill ${chosenSlot.format === "short" ? "pill-short" : "pill-long"} mr-2`}>
                {chosenSlot.format === "short" ? "SHORT" : "LONG"}
              </span>
              <span className="font-medium">{chosenSlot.topic}</span>
              <p className="text-xs text-zinc-400 mt-1.5">
                Publishing {chosenSlot.publish_date}. The script will attach to this calendar slot.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Your topic</label>
                <textarea
                  className="input min-h-[72px]"
                  name="topic"
                  placeholder="e.g. Build a Chrome extension that summarizes any page with AI — in 20 minutes"
                />
              </div>
              <div className="flex items-center gap-4">
                {(["long", "short"] as const).map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      checked={format === f}
                      onChange={() => setFormat(f)}
                      className="accent-zinc-900 w-4 h-4"
                    />
                    {f === "long" ? "📺 Long video" : "⚡ Short"}
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="label">Script word count</label>
              <input
                className="input"
                type="number"
                name="word_count"
                min={50}
                max={5000}
                placeholder={effFormat === "short" ? "e.g. 150" : "e.g. 900"}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mb-2.5 flex-1 min-w-[140px]">
              Optional — leave empty and the AI picks a natural length.
            </p>
            <PendingButton pendingText="Writing…" className="btn btn-brand">
              ✍️ Generate
            </PendingButton>
          </div>
          <PendingBar label="Writing your full script package in your voice — up to a minute." />
        </form>

        {actionError && <p className="toast-err !mb-0 mt-3">⚠️ {actionError}</p>}
        {dbError && <p className="text-xs text-amber-600 mt-3">DB error: {dbError}</p>}
      </div>

      {/* ---------- scripts list ---------- */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="text-sm font-bold flex-1">
          Generated scripts <span className="text-zinc-400 font-semibold">({assets.length})</span>
        </h2>
        {assets.length > 0 && (
          <>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mr-1">
              <input
                type="checkbox"
                className="accent-zinc-900 w-4 h-4"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(assets.map((a) => a.id)))}
              />
              Select all
            </label>
            <button
              className="btn btn-ghost !py-1 !px-2.5 !text-xs"
              disabled={selected.size === 0 || pending}
              onClick={() => clear(Array.from(selected))}
            >
              {pending ? <span className="spinner" /> : "🗑"} Clear selected ({selected.size})
            </button>
            <button
              className="btn btn-ghost !py-1 !px-2.5 !text-xs !text-red-500"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Delete all ${assets.length} generated scripts?`))
                  clear(assets.map((a) => a.id));
              }}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {assets.length === 0 && (
        <div className="card p-5 text-sm text-zinc-500">Nothing yet — generate your first script above.</div>
      )}

      <div className="space-y-2.5">
        {assets.map((a) => {
          const p = planOf(a);
          const isShort = p?.format === "short";
          const open = effectiveOpen === a.id;
          const wc = words(a.script);
          return (
            <div key={a.id} className={`card overflow-hidden transition-shadow ${open ? "shadow-pop" : ""}`}>
              {/* header */}
              <button
                type="button"
                onClick={() => toggleOpen(a.id)}
                className="w-full flex items-center gap-2.5 p-3.5 text-left hover:bg-zinc-50 transition"
              >
                <input
                  type="checkbox"
                  className="accent-zinc-900 w-4 h-4 shrink-0"
                  checked={selected.has(a.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSel(a.id)}
                />
                <span className={`pill ${isShort ? "pill-short" : "pill-long"}`}>
                  {isShort ? "SHORT" : "LONG"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{p?.topic || "Untitled"}</span>
                  <span className="block text-[11px] text-zinc-400 truncate">
                    {a.title_options?.[0] || ""}
                  </span>
                </span>
                {wc > 0 && (
                  <span className="hidden sm:inline pill pill-muted">{wc.toLocaleString()} words</span>
                )}
                <span className="text-[11px] text-zinc-400 whitespace-nowrap hidden sm:inline">
                  {a.created_at
                    ? new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                    : ""}
                </span>
                <span
                  className="text-zinc-400 hover:text-red-500 text-sm px-1"
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clear([a.id]);
                  }}
                  title="Clear this script"
                >
                  🗑
                </span>
                <span className={`text-zinc-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
              </button>

              {/* body */}
              {open && (
                <div className="border-t border-line p-4 md:p-5 space-y-4 text-sm">
                  {a.title_options?.length > 0 && (
                    <Section label="Titles" copy={a.title_options.join("\n")}>
                      <ul className="list-disc pl-5 space-y-1">
                        {a.title_options.map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {a.hook && (
                    <Section label="Hook" copy={a.hook}>
                      <p className="font-medium">{a.hook}</p>
                    </Section>
                  )}
                  {a.script && (
                    <Section label={`Script${wc ? ` · ${wc.toLocaleString()} words` : ""}`} copy={a.script}>
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed bg-zinc-50 rounded-xl p-3.5 max-h-[420px] overflow-y-auto">
                        {a.script}
                      </pre>
                    </Section>
                  )}
                  {a.onscreen_text && (
                    <Section label="On-screen text" copy={a.onscreen_text}>
                      <pre className="whitespace-pre-wrap font-sans">{a.onscreen_text}</pre>
                    </Section>
                  )}
                  {a.audio_suggestion && (
                    <Section label="Audio" copy={a.audio_suggestion}>
                      <p>{a.audio_suggestion}</p>
                    </Section>
                  )}
                  {a.thumbnail_concept && (
                    <Section label="Thumbnail" copy={a.thumbnail_concept}>
                      <p>{a.thumbnail_concept}</p>
                    </Section>
                  )}
                  {a.description && (
                    <Section label="Description" copy={a.description}>
                      <pre className="whitespace-pre-wrap font-sans">{a.description}</pre>
                    </Section>
                  )}
                  {(a.tags?.length > 0 || a.hashtags?.length > 0) && (
                    <Section
                      label="Tags"
                      copy={[...(a.tags || []), ...(a.hashtags || [])].join(", ")}
                    >
                      <p className="text-zinc-500">{[...(a.tags || []), ...(a.hashtags || [])].join("  ")}</p>
                    </Section>
                  )}
                  {a.skool_post && (
                    <Section label="Skool post" copy={a.skool_post}>
                      <pre className="whitespace-pre-wrap font-sans">{a.skool_post}</pre>
                    </Section>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function planOf(a: any) {
  return Array.isArray(a.content_plan) ? a.content_plan[0] : a.content_plan;
}

function Section({ label, copy, children }: { label: string; copy: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="label !mb-0">{label}</div>
        <CopyButton text={copy} />
      </div>
      <div className="text-zinc-800">{children}</div>
    </div>
  );
}
