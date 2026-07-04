"use client";

import { useFormStatus } from "react-dom";

export default function PendingBar({ label }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="mt-3">
      <div className="progress">
        <span />
      </div>
      {label && <p className="text-xs text-zinc-500 mt-2">⏳ {label}</p>}
    </div>
  );
}
