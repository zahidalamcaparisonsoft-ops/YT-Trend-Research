import { db } from "./supabase";
import { latestUploads, videoDetails, parseDuration } from "./youtube";
import { sendDiscord } from "./discord";

const MAX_PER_CHANNEL = 25;
const SHORT_MAX_SECONDS = 60;

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

type Rec = {
  id: string;
  channel: string;
  title: string;
  ytid: string;
  publishedAt: string;
  format: "long" | "short";
  views: number;
  vpd: number;
};

export async function runIngest() {
  const supabase = db();
  const { data: channels, error } = await supabase.from("channels").select("*").eq("is_active", true);
  if (error) throw error;

  let videos = 0;
  let snapshots = 0;
  const comp: Rec[] = [];

  for (const ch of channels || []) {
    try {
      if (!ch.uploads_playlist_id) continue;
      const ids = await latestUploads(ch.uploads_playlist_id, MAX_PER_CHANNEL);
      const details = await videoDetails(ids);
      for (const v of details) {
        const dur = parseDuration(v.contentDetails?.duration);
        const isShort = dur != null && dur <= SHORT_MAX_SECONDS;
        const { data: vid, error: ve } = await supabase
          .from("videos")
          .upsert(
            {
              channel_id: ch.id,
              youtube_video_id: v.id,
              title: v.snippet?.title,
              description: v.snippet?.description,
              published_at: v.snippet?.publishedAt,
              duration_seconds: dur,
              is_short: isShort,
              thumbnail_url: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url,
              youtube_tags: v.snippet?.tags || [],
            },
            { onConflict: "youtube_video_id" }
          )
          .select("id")
          .single();
        if (ve) continue;
        videos++;
        const views = Number(v.statistics?.viewCount ?? 0);
        const { error: se } = await supabase.from("video_stats").insert({
          video_id: vid.id,
          views,
          likes: Number(v.statistics?.likeCount ?? 0),
          comments: Number(v.statistics?.commentCount ?? 0),
        });
        if (!se) snapshots++;
        if (!ch.is_self) {
          const age = Math.max(1, (Date.now() - new Date(v.snippet?.publishedAt).getTime()) / 864e5);
          comp.push({
            id: vid.id,
            channel: ch.name,
            title: v.snippet?.title || "",
            ytid: v.id,
            publishedAt: v.snippet?.publishedAt,
            format: isShort ? "short" : "long",
            views,
            vpd: views / age,
          });
        }
      }
    } catch {
      /* skip channel on error */
    }
  }

  const alerts = await detectHot(comp);
  return { channels: channels?.length || 0, videos, snapshots, alerts };
}

// Ping Discord when a competitor video is spiking (>=3x that channel's baseline, recent, not yet alerted).
async function detectHot(comp: Rec[]): Promise<number> {
  try {
    const supabase = db();
    const ids = comp.map((r) => r.id);
    const alerted = new Set<string>();
    for (let i = 0; i < ids.length; i += 150) {
      const { data } = await supabase.from("alerts").select("video_id").in("video_id", ids.slice(i, i + 150));
      for (const a of data || []) alerted.add(a.video_id);
    }
    const byCh = new Map<string, number[]>();
    for (const r of comp) {
      if (!byCh.has(r.channel)) byCh.set(r.channel, []);
      byCh.get(r.channel)!.push(r.vpd);
    }
    const tenDaysAgo = Date.now() - 10 * 864e5;
    const hot = comp
      .filter(
        (r) =>
          !alerted.has(r.id) &&
          new Date(r.publishedAt).getTime() >= tenDaysAgo &&
          r.views >= 1000 &&
          r.vpd >= 3 * (median(byCh.get(r.channel)!) || 1)
      )
      .sort((a, b) => b.vpd - a.vpd)
      .slice(0, 5);

    for (const r of hot) {
      await sendDiscord(
        `🔥 **Hot ${r.format.toUpperCase()}** — **${r.channel}** is spiking at ~${Math.round(
          r.vpd
        ).toLocaleString()} views/day\n**${r.title}**\nhttps://youtube.com/watch?v=${r.ytid}`
      );
      await supabase.from("alerts").insert({ video_id: r.id });
    }
    return hot.length;
  } catch {
    return 0;
  }
}
