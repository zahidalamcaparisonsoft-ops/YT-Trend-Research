import { db } from "./supabase";

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type MyVid = {
  id: string;
  title: string;
  format: "long" | "short";
  published_at: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  vpd: number;
  ratio: number; // vs your own baseline for that format
};

export async function getMyPerformance(): Promise<{ videos: MyVid[]; winners: MyVid[] }> {
  const supabase = db();
  const { data: vids } = await supabase
    .from("videos")
    .select("id, title, format, published_at, thumbnail_url, channels!inner(is_self)")
    .eq("channels.is_self", true)
    .order("published_at", { ascending: false })
    .limit(80);
  if (!vids?.length) return { videos: [], winners: [] };

  const ids = (vids as any[]).map((v) => v.id);
  const latest = new Map<string, { views: number; likes: number; comments: number }>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data: st } = await supabase
      .from("video_stats")
      .select("video_id, views, likes, comments, captured_at")
      .in("video_id", ids.slice(i, i + 150))
      .order("captured_at", { ascending: false });
    for (const s of st || [])
      if (!latest.has(s.video_id))
        latest.set(s.video_id, {
          views: Number(s.views || 0),
          likes: Number(s.likes || 0),
          comments: Number(s.comments || 0),
        });
  }

  const rows: MyVid[] = (vids as any[]).map((v) => {
    const s = latest.get(v.id) || { views: 0, likes: 0, comments: 0 };
    const age = Math.max(1, (Date.now() - new Date(v.published_at).getTime()) / 864e5);
    return {
      id: v.id,
      title: v.title || "",
      format: v.format,
      published_at: v.published_at,
      thumbnail: v.thumbnail_url,
      ...s,
      vpd: s.views / age,
      ratio: 0,
    };
  });

  const baseLong = median(rows.filter((r) => r.format === "long").map((r) => r.vpd)) || 1;
  const baseShort = median(rows.filter((r) => r.format === "short").map((r) => r.vpd)) || 1;
  for (const r of rows) r.ratio = r.vpd / (r.format === "long" ? baseLong : baseShort);

  const winners = [...rows].sort((a, b) => b.ratio - a.ratio).slice(0, 8);
  return { videos: rows, winners };
}

// Compact text fed into planning + generation prompts so the AI leans into what works for YOU.
export async function getMyWinnersText(limit = 6): Promise<string> {
  try {
    const { winners } = await getMyPerformance();
    if (!winners.length) return "";
    return winners
      .slice(0, limit)
      .map((w) => `- [${w.format}] "${w.title}" (${w.ratio.toFixed(1)}x your average)`)
      .join("\n");
  } catch {
    return "";
  }
}
