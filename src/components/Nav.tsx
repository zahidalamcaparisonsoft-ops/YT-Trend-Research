import Link from "next/link";

export default function Nav({ active }: { active?: string }) {
  const items: [string, string][] = [
    ["/", "Dashboard"],
    ["/trends", "Trends"],
    ["/generate", "Generate"],
    ["/channels", "Channels"],
    ["/dna", "Channel DNA"],
  ];
  return (
    <nav className="flex items-center gap-1 mb-8 flex-wrap">
      <span className="font-bold text-brand mr-4">▲ YT Trend Research</span>
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            active === href ? "bg-panel text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
