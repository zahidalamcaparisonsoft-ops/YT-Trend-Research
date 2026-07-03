import 'dotenv/config';
import { supabase } from '../lib/supabase.mjs';
import { latestUploads, videoDetails, parseDuration } from '../lib/youtube.mjs';

// Pulls latest uploads for every active channel, upserts videos,
// and appends a fresh STATS SNAPSHOT (so we can measure view velocity over time).
const MAX_PER_CHANNEL = 25;
const SHORT_MAX_SECONDS = 60; // <=60s = Short (adjust later if needed)

const { data: channels, error } = await supabase
  .from('channels')
  .select('*')
  .eq('is_active', true);
if (error) throw error;

console.log(`Ingesting ${channels.length} channel(s)...`);
let newVideos = 0;
let snapshots = 0;

for (const ch of channels) {
  try {
    if (!ch.uploads_playlist_id) {
      console.warn(`- skip ${ch.name}: no uploads playlist`);
      continue;
    }
    const ids = await latestUploads(ch.uploads_playlist_id, MAX_PER_CHANNEL);
    const details = await videoDetails(ids);

    for (const v of details) {
      const dur = parseDuration(v.contentDetails?.duration);
      const isShort = dur != null && dur <= SHORT_MAX_SECONDS;

      const { data: vid, error: ve } = await supabase
        .from('videos')
        .upsert(
          {
            channel_id: ch.id,
            youtube_video_id: v.id,
            title: v.snippet?.title,
            description: v.snippet?.description,
            published_at: v.snippet?.publishedAt,
            duration_seconds: dur,
            is_short: isShort,
            thumbnail_url:
              v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url,
            youtube_tags: v.snippet?.tags || [],
          },
          { onConflict: 'youtube_video_id' }
        )
        .select('id, first_seen_at')
        .single();
      if (ve) {
        console.warn(`  video upsert failed: ${ve.message}`);
        continue;
      }
      // count only genuinely new rows (created in the last minute)
      if (vid.first_seen_at && Date.now() - new Date(vid.first_seen_at).getTime() < 60_000) {
        newVideos++;
      }

      const { error: se } = await supabase.from('video_stats').insert({
        video_id: vid.id,
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
      });
      if (!se) snapshots++;
    }
    console.log(`  ✓ ${ch.name}: ${details.length} videos`);
  } catch (e) {
    console.error(`  ✗ ${ch.name}: ${e.message}`);
  }
}

console.log(`Done. ~${newVideos} new videos, ${snapshots} stat snapshots.`);
