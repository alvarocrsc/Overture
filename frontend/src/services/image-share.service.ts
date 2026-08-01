/**
 * Image sharing service — stages a remote TMDB image on disk and hands it to
 * the OS share sheet.
 *
 * Sharing the remote URL directly would share a *link*; the share sheet only
 * offers image actions (notably "Save Image", which is how a user saves to
 * their gallery) when it is given a real local file. So the image is downloaded
 * to the cache directory first.
 *
 * The download uses `expo-file-system`'s native downloader rather than the
 * app's axios instance: this is a binary asset from TMDB's CDN, not a call to
 * the Overture API, and it has to land on disk as a file.
 */
import { Platform, Share } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';

import { originalImageUrl } from '@/src/lib/tmdb';

/** Cache subdirectory holding images staged for sharing. */
const SHARE_CACHE_DIRNAME = 'shared-images';

/**
 * Resolution the shared copy is fetched at — the largest TMDB holds, so what
 * the user saves is the full-quality image. The viewers display this same size,
 * which is what lets {@link stageForSharing} reuse an already-downloaded copy
 * instead of paying for it twice.
 */
const SHARE_IMAGE_SIZE = 'original';

/**
 * Derives a safe cache filename from a TMDB file path (e.g. `/abc123.jpg`).
 * TMDB paths are a single leading slash plus an alphanumeric name, so stripping
 * the slash is enough to get a flat, collision-free filename. The size is part
 * of the name so a cached file is never reused at the wrong resolution.
 */
function cacheFileName(tmdbFilePath: string): string {
  return `${SHARE_IMAGE_SIZE}-${tmdbFilePath.replace(/^\/+/, '')}`;
}

/** `getCachePathAsync` yields a bare path on some platforms; `File` wants a URI. */
function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * Puts the full-resolution image on disk under a name the share sheet will
 * recognise as a JPEG, and returns it.
 *
 * Three tiers, cheapest first: a copy staged by an earlier share, then
 * expo-image's own disk cache — the viewer displays this exact URL, so the
 * bytes are usually already there and a local copy costs no network at all —
 * and only failing both, a download.
 */
async function stageForSharing(tmdbFilePath: string, url: string): Promise<File> {
  const directory = new Directory(Paths.cache, SHARE_CACHE_DIRNAME);
  if (!directory.exists) {
    directory.create({ idempotent: true });
  }

  const target = new File(directory, cacheFileName(tmdbFilePath));
  if (target.exists) return target;

  const cachedPath = await Image.getCachePathAsync(url);
  if (cachedPath) {
    try {
      new File(toFileUri(cachedPath)).copy(target);
      if (target.exists) return target;
    } catch {
      // Cache entry vanished or could not be copied — fall through and fetch it.
    }
  }

  await File.downloadFileAsync(url, target);
  return target;
}

/**
 * Opens the native share sheet for a TMDB image at full resolution, from which
 * the user can save it to their photo library or send it on.
 *
 * Files are staged in the cache directory, which the system reclaims
 * automatically when space is needed.
 *
 * @param tmdbFilePath - The image's TMDB `file_path` (e.g. `/abc123.jpg`).
 * @throws If the path is empty or the image cannot be staged.
 */
export async function shareTmdbImage(tmdbFilePath: string): Promise<void> {
  const url = originalImageUrl(tmdbFilePath);
  if (!url) {
    throw new Error('Image has no file path');
  }

  if (Platform.OS !== 'ios') {
    // Android's Share accepts only `message` — it ignores `url` entirely — so
    // staging a file there would achieve nothing. Share the link instead.
    // TODO(android-image-share): sharing the file itself needs `expo-sharing`,
    // which is not in the native build; adding it requires a rebuild.
    await Share.share({ message: url });
    return;
  }

  const file = await stageForSharing(tmdbFilePath, url);
  await Share.share({ url: file.uri });
}
