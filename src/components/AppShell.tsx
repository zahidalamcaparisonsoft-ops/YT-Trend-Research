"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/trends", label: "Trends", icon: "📈" },
  { href: "/radar", label: "Radar", icon: "🌐" },
  { href: "/patterns", label: "Patterns", icon: "🎨" },
  { href: "/calendar", label: "Calendar", icon: "🗓️" },
  { href: "/generate", label: "Generate", icon: "✍️" },
  { href: "/performance", label: "My Videos", icon: "🎬" },
  { href: "/channels", label: "Channels", icon: "📡" },
  { href: "/dna", label: "Channel DNA", icon: "🧬" },
];

// bottom tab bar shows these 4 + a "More" menu
const TABS = ["/", "/trends", "/calendar", "/generate"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);

  if (pathname.startsWith("/login")) return <>{children}</>;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const current = NAV.find((n) => isActive(n.href));

  return (
    <div className="min-h-screen">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden md:flex fixed z-40 inset-y-4 left-4 w-60 flex-col rounded-3xl bg-brand text-white p-4 shadow-pop">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sun text-zinc-900 font-black text-lg">▲</span>
          <div>
            <div className="text-sm font-bold leading-tight">YT Trend Research</div>
            <div className="text-[10px] text-zinc-400">Content command center</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive(n.href)
                  ? "bg-sun text-zinc-900"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl bg-white/5 p-3 text-[11px] leading-relaxed text-zinc-400">
          🌐 Radar digest lands in Discord daily at <span className="text-sun font-semibold">9:00 AM</span> Dhaka
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="md:hidden sticky top-0 z-40 bg-ink/85 backdrop-blur-md border-b border-line">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand text-sun font-black text-sm">▲</span>
          <span className="font-bold text-[15px]">{current?.label ?? "YT Trend Research"}</span>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="md:pl-72">
        <main className="mx-auto max-w-6xl px-4 md:px-8 pt-4 md:pt-8 pb-28 md:pb-12">{children}</main>
      </div>

      {/* ---------- Mobile bottom tabs ---------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]">
        {more && (
          <div className="absolute bottom-full right-3 mb-2 w-56 card p-2 shadow-pop">
            {NAV.filter((n) => !TABS.includes(n.href)).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive(n.href) ? "bg-sun/25 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            ))}
          </div>
        )}
        <div className="grid grid-cols-5">
          {TABS.map((href) => {
            const n = NAV.find((x) => x.href === href)!;
            const on = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-semibold ${
                  on ? "text-zinc-900" : "text-zinc-400"
                }`}
              >
                <span className={`text-lg leading-none ${on ? "" : "grayscale opacity-60"}`}>{n.icon}</span>
                {n.label === "Dashboard" ? "Home" : n.label}
                <span className={`h-1 w-4 rounded-full ${on ? "bg-sun" : "bg-transparent"}`} />
              </Link>
            );
          })}
          <button
            onClick={() => setMore(!more)}
            className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-semibold ${
              more ? "text-zinc-900" : "text-zinc-400"
            }`}
          >
            <span className="text-lg leading-none">☰</span>
            More
            <span className={`h-1 w-4 rounded-full ${more ? "bg-sun" : "bg-transparent"}`} />
          </button>
        </div>
      </nav>
    </div>
  );
}
