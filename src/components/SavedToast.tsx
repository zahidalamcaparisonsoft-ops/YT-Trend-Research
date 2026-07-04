"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SavedToast({ saved, basePath = "/dna" }: { saved?: string; basePath?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    setMsg(saved === "config" ? "Config saved" : "Channel DNA saved");
    router.replace(basePath); // strip the query param
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  if (!msg) return null;
  return <div className="toast-ok">✓ {msg}</div>;
}
