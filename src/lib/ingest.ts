import { db } from "./supabase";
import { latestUploads, videoDetails, parseDuration } from "./youtube";

const MAX_PER_CHANNEL = 25;
const SHORT_MAX_SECONDS = 60;

// Pull latest uploads for all active channels + append a fresh stats snapshot.
export async function runIngest() {
  const supabase = db();
  const { data: channels, error } = await supabase.from("channels").select("*").eq("is_active", true);
  if (error) throw error;

  let videos = 0;
  let snapshots = 0;
  const perChannel: { name: string; videos: number; error?: string }[] = [];

  for (const ch of channels || []) {
    try {
      if (!ch.uploads_playlist_id) {
        perChannel.push({ name: ch.name, videos: 0, error: "no uploads playlist" });
        continue;
      }
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
        const { error: se } = await supabase.from("video_stats").insert({
          video_id: vid.id,
          views: Number(v.statistics?.viewCount ?? 0),
          likes: Number(v.statistics?.likeCount ?? 0),
          comments: Number(v.statistics?.commentCount ?? 0),
        });
        if (!se) snapshots++;
      }
      perChannel.push({ name: ch.name, videos: details.length });
    } catch (e: any) {
      perChannel.push({ name: ch.name, videos: 0, error: e.message });
    }
  }
  return { channels: channels?.length || 0, videos, snapshots, perChannel };
}
