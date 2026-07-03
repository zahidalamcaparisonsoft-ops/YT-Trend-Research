import 'dotenv/config';

const KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

async function api(path, params) {
  if (!KEY) throw new Error('Missing YOUTUBE_API_KEY in .env');
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set('key', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

// Accepts a channel URL, @handle, or UC... id -> { channelId, title, handle, uploadsPlaylistId }
export async function resolveChannel(input) {
  const s = String(input).trim();
  let channelId = null;
  let handle = null;

  if (/^UC[\w-]{20,}$/.test(s)) channelId = s;
  else if (s.includes('/channel/')) channelId = s.split('/channel/')[1].split(/[/?#]/)[0];
  else if (s.includes('/@')) handle = s.split('/@')[1].split(/[/?#]/)[0];
  else if (s.startsWith('@')) handle = s.slice(1);
  else handle = s.replace(/^@/, '');

  const data = channelId
    ? await api('channels', { part: 'snippet,contentDetails', id: channelId })
    : await api('channels', { part: 'snippet,contentDetails', forHandle: '@' + handle });

  const item = data.items?.[0];
  if (!item) throw new Error(`Channel not found for "${input}"`);
  return {
    channelId: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl || (handle ? '@' + handle : null),
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}

// Latest N upload video IDs from an uploads playlist (newest first)
export async function latestUploads(uploadsPlaylistId, max = 25) {
  const ids = [];
  let pageToken;
  while (ids.length < max) {
    const data = await api('playlistItems', {
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const it of data.items || []) ids.push(it.contentDetails.videoId);
    if (!data.nextPageToken || ids.length >= max) break;
    pageToken = data.nextPageToken;
  }
  return ids.slice(0, max);
}

// Full details + statistics for up to any number of IDs (batched by 50)
export async function videoDetails(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    if (!chunk.length) continue;
    const data = await api('videos', {
      part: 'snippet,contentDetails,statistics',
      id: chunk.join(','),
    });
    out.push(...(data.items || []));
  }
  return out;
}

// ISO 8601 duration (PT#H#M#S) -> seconds
export function parseDuration(iso) {
  const m = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
}
