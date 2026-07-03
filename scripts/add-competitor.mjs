import 'dotenv/config';
import { supabase } from '../lib/supabase.mjs';
import { resolveChannel } from '../lib/youtube.mjs';

// Usage:
//   npm run add -- "https://youtube.com/@SomeCreator"
//   npm run add -- "@SomeCreator" --self         (marks it as YOUR channel)
const input = process.argv[2];
const isSelf = process.argv.includes('--self');

if (!input) {
  console.error('Usage: npm run add -- "<channel url | @handle | UC...id>" [--self]');
  process.exit(1);
}

try {
  const ch = await resolveChannel(input);
  const { error } = await supabase.from('channels').upsert(
    {
      name: ch.title,
      handle: ch.handle,
      youtube_channel_id: ch.channelId,
      uploads_playlist_id: ch.uploadsPlaylistId,
      is_self: isSelf,
      is_active: true,
    },
    { onConflict: 'youtube_channel_id' }
  );
  if (error) throw error;
  console.log(`✓ Added ${isSelf ? '(YOUR CHANNEL) ' : ''}${ch.title}  [${ch.channelId}]`);
} catch (e) {
  console.error('✗', e.message);
  process.exit(1);
}
