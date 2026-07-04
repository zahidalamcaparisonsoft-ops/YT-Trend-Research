"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FlashToast({ msg, basePath }: { msg?: string; basePath: string }) {
  const router = useRouter();
  const [show, setShow] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    setShow(msg);
    router.replace(basePath);
    const t = setTimeout(() => setShow(null), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg]);

  if (!show) return null;
  return <div className="toast-ok">✓ {show}</div>;
}
