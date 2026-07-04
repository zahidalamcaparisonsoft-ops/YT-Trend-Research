"use client";

import { useFormStatus } from "react-dom";

export default function PendingButton({
  children,
  pendingText,
  className = "btn btn-brand",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner" /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
