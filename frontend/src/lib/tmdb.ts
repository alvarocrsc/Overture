/**
 * Frontend TMDB image URL helpers.
 * All sizes match the TMDB image API documented at:
 * https://developer.themoviedb.org/docs/image-basics
 */

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w185' | 'w342' | 'w500' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

/**
 * Returns the full URL for a TMDB poster image.
 * @param path - The file_path value from the TMDB API (e.g. "/abc123.jpg").
 * @param size - Desired image size. Defaults to 'w342'.
 * @returns Full image URL or null if path is null/empty.
 */
export function posterUrl(path: string | null | undefined, size: PosterSize = 'original'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Returns the full URL for a TMDB backdrop image.
 * @param path - The file_path value from the TMDB API.
 * @param size - Desired image size. Defaults to 'w780'.
 * @returns Full image URL or null if path is null/empty.
 */
export function backdropUrl(path: string | null | undefined, size: BackdropSize = 'w780'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Returns the full URL for a TMDB logo image.
 * @param path - The file_path value from the TMDB API.
 * @param size - Desired image size. Defaults to 'w185'.
 * @returns Full image URL or null if path is null/empty.
 */
export function logoUrl(path: string | null | undefined, size: LogoSize = 'w185'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}
