const requiredEnvVars = ['YOUTUBE_API_KEY'] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
// Validated non-empty by the check above, mirroring how tmdb.ts resolves its key.
const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY'] as string;

interface YoutubeSearchResult {
  items: Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string };
  }>;
}

/**
 * Searches YouTube for a video matching the query.
 *
 * Costs 100 quota units per call (out of a 10,000/day free quota) — this
 * function must only ever be called as a last-resort fallback, and callers MUST
 * cache the result to avoid repeat calls for the same title.
 *
 * @param searchQuery - The free-text search query (e.g. "Dune 2021 official trailer").
 * @returns The parsed YouTube search response (up to 5 embeddable video items).
 */
export async function youtubeSearch(searchQuery: string): Promise<YoutubeSearchResult> {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'snippet',
    type: 'video',
    maxResults: '5',
    videoEmbeddable: 'true',
    q: searchQuery,
  });

  const response = await fetch(`${YOUTUBE_BASE_URL}/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  return response.json() as Promise<YoutubeSearchResult>;
}

/**
 * Fetches basic video details (duration) to sanity-check a search result before
 * accepting it as a trailer. Costs 1 quota unit.
 *
 * @param videoId - The YouTube video ID to inspect.
 * @returns The video's duration in seconds, or null if it could not be resolved.
 */
export async function youtubeVideoDetails(
  videoId: string,
): Promise<{ durationSeconds: number } | null> {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'contentDetails',
    id: videoId,
  });

  const response = await fetch(`${YOUTUBE_BASE_URL}/videos?${params.toString()}`);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    items: Array<{ contentDetails: { duration: string } }>;
  };
  const iso = data.items[0]?.contentDetails.duration;
  if (!iso) return null;

  return { durationSeconds: parseIsoDuration(iso) };
}

/**
 * Parses an ISO 8601 duration (e.g. 'PT2M31S') into a total number of seconds.
 * @param iso - The ISO 8601 duration string.
 * @returns The duration in whole seconds (0 when unparseable).
 */
function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}
