const BASE = "https://www.googleapis.com/youtube/v3";

async function api(path: string, params: Record<string, string>) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY");
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export type ResolvedChannel = {
  channelId: string;
  title: string;
  handle: string | null;
  uploadsPlaylistId: string;
};

export async function resolveChannel(input: string): Promise<ResolvedChannel> {
  const s = input.trim();
  let channelId: string | null = null;
  let handle: string | null = null;

  if (/^UC[\w-]{20,}$/.test(s)) channelId = s;
  else if (s.includes("/channel/")) channelId = s.split("/channel/")[1].split(/[/?#]/)[0];
  else if (s.includes("/@")) handle = s.split("/@")[1].split(/[/?#]/)[0];
  else if (s.startsWith("@")) handle = s.slice(1);
  else handle = s.replace(/^@/, "");

  const data = channelId
    ? await api("channels", { part: "snippet,contentDetails", id: channelId })
    : await api("channels", { part: "snippet,contentDetails", forHandle: "@" + handle });

  const item = data.items?.[0];
  if (!item) throw new Error(`Channel not found for "${input}"`);
  return {
    channelId: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl || (handle ? "@" + handle : null),
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}

export async function latestUploads(uploadsPlaylistId: string, max = 25): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const data = await api("playlistItems", {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const it of data.items || []) ids.push(it.contentDetails.videoId);
    if (!data.nextPageToken || ids.length >= max) break;
    pageToken = data.nextPageToken;
  }
  return ids.slice(0, max);
}

export async function videoDetails(ids: string[]): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    if (!chunk.length) continue;
    const data = await api("videos", { part: "snippet,contentDetails,statistics", id: chunk.join(",") });
    out.push(...(data.items || []));
  }
  return out;
}

export function parseDuration(iso: string): number | null {
  const m = String(iso || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}
