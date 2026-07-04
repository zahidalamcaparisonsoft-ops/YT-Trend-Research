"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addChannel } from "../actions";

export default function AddChannelForm({ added, error }: { added?: string; error?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!added && !error) return;
    if (added) {
      setToast({ ok: true, msg: `✓ Added ${added}` });
      formRef.current?.reset(); // clear the input
    } else if (error) {
      setToast({ ok: false, msg: `⚠️ ${error}` });
    }
    router.replace("/channels"); // strip the query param
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [added, error]);

  return (
    <div>
      {toast && (
        <div
          className={`mb-3 rounded-lg px-4 py-2 text-sm transition-opacity ${
            toast.ok
              ? "bg-accent/15 text-accent border border-accent/30"
              : "bg-red-500/15 text-red-300 border border-red-500/30"
          }`}
        >
          {toast.msg}
        </div>
      )}
      <form ref={formRef} action={addChannel} className="flex flex-wrap items-end gap-3">
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
    </div>
  );
}
