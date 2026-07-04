"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { addChannel } from "../actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-brand mb-0.5" type="submit" disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" /> Adding…
        </>
      ) : (
        "+ Add"
      )}
    </button>
  );
}

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
      {toast && <div className={toast.ok ? "toast-ok !mb-3" : "toast-err !mb-3"}>{toast.msg}</div>}
      <form ref={formRef} action={addChannel} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="label">YouTube URL, @handle, or channel ID</label>
          <input className="input" name="input" placeholder="https://youtube.com/@Creator" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 mb-2.5">
          <input type="checkbox" name="is_self" className="accent-zinc-900 w-4 h-4" /> This is my channel
        </label>
        <SubmitBtn />
      </form>
    </div>
  );
}
