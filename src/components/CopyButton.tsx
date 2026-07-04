"use client";

import { useState } from "react";

export default function CopyButton({ text, small = true }: { text: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className={`inline-flex items-center gap-1 rounded-lg border border-line bg-white font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition ${
        small ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${done ? "!text-emerald-600 !border-emerald-200 !bg-emerald-50" : ""}`}
    >
      {done ? "✓ Copied" : "⧉ Copy"}
    </button>
  );
}
