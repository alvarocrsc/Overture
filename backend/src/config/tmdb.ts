const requiredEnvVars = ['TMDB_API_KEY', 'TMDB_BASE_URL'] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const TMDB_BASE_URL = process.env['TMDB_BASE_URL'] as string;
export const TMDB_API_KEY = process.env['TMDB_API_KEY'] as string;

/**
 * Performs an authenticated GET request to the TMDB API.
 * @param path - The API path (e.g. `/movie/550`), without the base URL.
 * @param params - Optional query parameters to append (excluding api_key).
 * @returns The parsed JSON response typed as T.
 */
export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `TMDB request failed: ${response.status} ${response.statusText} — ${path}`,
    );
  }

  return response.json() as Promise<T>;
}
