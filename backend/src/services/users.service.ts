import { query, execute } from '../config/db';
import cloudinary from '../config/cloudinary';
import { AppError } from '../utils/app-error';
import type {
  UpdateMeInput,
  UpdateFavoritesInput,
} from '../validators/user.validators';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Public profile shape returned to the frontend. */
export interface UserProfilePayload {
  id: number;
  username: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  accent_color: string;
  profile_backdrop_tmdb_id: number | null;
  profile_backdrop_path: string | null;
  followers_count: number;
  following_count: number;
  films_count: number;
  series_count: number;
  watchlist_count: number;
  reviews_count: number;
  lists_count: number;
  diary_count: number;
  diary_this_year: number;
  films_this_year: number;
  series_this_year: number;
  is_following?: boolean;
}

export interface UserFavoritePayload {
  position: 1 | 2 | 3 | 4;
  film_id: number | null;
  series_id: number | null;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  media_type: 'film' | 'series';
}

export interface PublicUser {
  id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

interface BaseUserRow {
  id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  accent_color: string;
  profile_backdrop_tmdb_id: number | null;
  profile_backdrop_path: string | null;
}

interface CountRow {
  c: number | string;
}

interface FavoriteRow {
  position: number;
  film_id: number | null;
  series_id: number | null;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

async function ensureUserExists(userId: number): Promise<void> {
  const rows = await query<{ id: number }>(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  if (rows.length === 0) throw new AppError('User not found', 404);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Returns a user's public profile with aggregated counts.
 * Joins both films and series on `users.profile_backdrop_tmdb_id` to surface
 * the chosen banner backdrop path.
 *
 * @param userId - Profile owner id.
 * @param viewerId - Authenticated viewer id, or null for anonymous.
 * @returns The user's profile payload.
 */
export async function getUserProfile(
  userId: number,
  viewerId: number | null,
): Promise<UserProfilePayload> {
  const [base] = await query<BaseUserRow>(
    `SELECT
       u.id,
       u.username,
       u.name,
       u.avatar_url,
       u.bio,
       u.location,
       u.accent_color,
       u.profile_backdrop_tmdb_id,
       COALESCE(f.backdrop_path, s.backdrop_path) AS profile_backdrop_path
     FROM users u
     LEFT JOIN films  f ON f.tmdb_id = u.profile_backdrop_tmdb_id
     LEFT JOIN series s ON s.tmdb_id = u.profile_backdrop_tmdb_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );

  if (!base) throw new AppError('User not found', 404);

  const [
    [followers],
    [following],
    [films],
    [series],
    [watchlistCount],
    [reviewsCount],
    [listsCount],
    [diaryCount],
    [diaryThisYear],
    [filmsThisYear],
    [seriesThisYear],
  ] = await Promise.all([
    query<CountRow>('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM ratings WHERE user_id = ? AND film_id IS NOT NULL', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM ratings WHERE user_id = ? AND series_id IS NOT NULL', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM watchlist WHERE user_id = ?', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM reviews WHERE user_id = ?', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM lists WHERE user_id = ?', [userId]),
    query<CountRow>('SELECT COUNT(*) AS c FROM ratings WHERE user_id = ?', [userId]),
    query<CountRow>(
      `SELECT COUNT(*) AS c FROM ratings
       WHERE user_id = ? AND watched_on IS NOT NULL AND YEAR(watched_on) = YEAR(CURDATE())`,
      [userId],
    ),
    query<CountRow>(
      `SELECT COUNT(*) AS c FROM ratings
       WHERE user_id = ? AND film_id IS NOT NULL
         AND watched_on IS NOT NULL AND YEAR(watched_on) = YEAR(CURDATE())`,
      [userId],
    ),
    query<CountRow>(
      `SELECT COUNT(*) AS c FROM ratings
       WHERE user_id = ? AND series_id IS NOT NULL
         AND watched_on IS NOT NULL AND YEAR(watched_on) = YEAR(CURDATE())`,
      [userId],
    ),
  ]);

  let isFollowing: boolean | undefined;
  if (viewerId != null && viewerId !== userId) {
    const rows = await query<{ c: number }>(
      'SELECT 1 AS c FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [viewerId, userId],
    );
    isFollowing = rows.length > 0;
  }

  const payload: UserProfilePayload = {
    id: base.id,
    username: base.username,
    name: base.name ?? base.username,
    avatar_url: base.avatar_url,
    bio: base.bio,
    location: base.location,
    accent_color: base.accent_color,
    profile_backdrop_tmdb_id: base.profile_backdrop_tmdb_id,
    profile_backdrop_path: base.profile_backdrop_path,
    followers_count: n(followers?.c),
    following_count: n(following?.c),
    films_count: n(films?.c),
    series_count: n(series?.c),
    watchlist_count: n(watchlistCount?.c),
    reviews_count: n(reviewsCount?.c),
    lists_count: n(listsCount?.c),
    diary_count: n(diaryCount?.c),
    diary_this_year: n(diaryThisYear?.c),
    films_this_year: n(filmsThisYear?.c),
    series_this_year: n(seriesThisYear?.c),
  };

  if (isFollowing !== undefined) payload.is_following = isFollowing;

  return payload;
}

/**
 * Patches the authenticated user's editable profile fields. Only fields
 * present in `patch` are updated.
 * @param userId - The user being updated.
 * @param patch - Validated subset of editable fields.
 */
export async function updateUserProfile(
  userId: number,
  patch: UpdateMeInput,
): Promise<UserProfilePayload> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  const assignable: (keyof UpdateMeInput)[] = [
    'name',
    'bio',
    'location',
    'avatar_url',
    'accent_color',
    'profile_backdrop_tmdb_id',
  ];

  for (const key of assignable) {
    if (patch[key] !== undefined) {
      fields.push(`\`${key}\` = ?`);
      params.push(patch[key] as string | number | null);
    }
  }

  if (fields.length > 0) {
    params.push(userId);
    await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  return getUserProfile(userId, userId);
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

/**
 * Returns the user's pinned 4 favorites with title and poster info.
 * Always returns 0–4 rows ordered by position.
 */
export async function getUserFavorites(
  userId: number,
): Promise<UserFavoritePayload[]> {
  const rows = await query<FavoriteRow>(
    `SELECT
       uf.position,
       uf.film_id,
       uf.series_id,
       f.tmdb_id    AS film_tmdb_id,
       f.title      AS film_title,
       COALESCE(pf.custom_poster_path, f.poster_path) AS film_poster,
       s.tmdb_id    AS series_tmdb_id,
       s.title      AS series_title,
       COALESCE(ps.custom_poster_path, s.poster_path) AS series_poster
     FROM user_favorites uf
     LEFT JOIN films  f ON f.id = uf.film_id
     LEFT JOIN series s ON s.id = uf.series_id
     LEFT JOIN user_title_display_prefs pf
       ON pf.user_id = uf.user_id AND pf.film_id   = f.id
     LEFT JOIN user_title_display_prefs ps
       ON ps.user_id = uf.user_id AND ps.series_id = s.id
     WHERE uf.user_id = ?
     ORDER BY uf.position ASC`,
    [userId],
  );

  const out: UserFavoritePayload[] = [];
  for (const r of rows) {
    if (r.film_id != null && r.film_tmdb_id != null && r.film_title != null) {
      out.push({
        position: r.position as 1 | 2 | 3 | 4,
        film_id: r.film_id,
        series_id: null,
        tmdb_id: r.film_tmdb_id,
        title: r.film_title,
        poster_path: r.film_poster,
        media_type: 'film',
      });
    } else if (
      r.series_id != null &&
      r.series_tmdb_id != null &&
      r.series_title != null
    ) {
      out.push({
        position: r.position as 1 | 2 | 3 | 4,
        film_id: null,
        series_id: r.series_id,
        tmdb_id: r.series_tmdb_id,
        title: r.series_title,
        poster_path: r.series_poster,
        media_type: 'series',
      });
    }
  }
  return out;
}

/**
 * Replaces the user's favorites with the provided set. Items are matched
 * to local `films`/`series` rows by tmdb_id; unknown tmdb ids are skipped.
 */
export async function updateUserFavorites(
  userId: number,
  input: UpdateFavoritesInput,
): Promise<UserFavoritePayload[]> {
  await execute('DELETE FROM user_favorites WHERE user_id = ?', [userId]);

  for (const item of input.items) {
    if (item.media_type === 'film') {
      const [row] = await query<{ id: number }>(
        'SELECT id FROM films WHERE tmdb_id = ? LIMIT 1',
        [item.tmdb_id],
      );
      if (!row) continue;
      await execute(
        'INSERT INTO user_favorites (user_id, film_id, series_id, position) VALUES (?, ?, NULL, ?)',
        [userId, row.id, item.position],
      );
    } else {
      const [row] = await query<{ id: number }>(
        'SELECT id FROM series WHERE tmdb_id = ? LIMIT 1',
        [item.tmdb_id],
      );
      if (!row) continue;
      await execute(
        'INSERT INTO user_favorites (user_id, film_id, series_id, position) VALUES (?, NULL, ?, ?)',
        [userId, row.id, item.position],
      );
    }
  }

  return getUserFavorites(userId);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

/**
 * Creates a follow edge. Idempotent — duplicate follows are ignored.
 * @throws 400 when self-follow attempted, 404 when target does not exist.
 */
export async function followUser(
  followerId: number,
  followingId: number,
): Promise<void> {
  if (followerId === followingId) {
    throw new AppError('You cannot follow yourself', 400);
  }
  await ensureUserExists(followingId);
  await execute(
    'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
    [followerId, followingId],
  );
}

/**
 * Removes a follow edge if it exists.
 */
export async function unfollowUser(
  followerId: number,
  followingId: number,
): Promise<void> {
  await execute(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId],
  );
}

/**
 * Returns the users following the given user.
 */
export async function getFollowers(userId: number): Promise<PublicUser[]> {
  await ensureUserExists(userId);
  return query<PublicUser>(
    `SELECT u.id, u.username, u.name, u.avatar_url
     FROM follows fl
     JOIN users u ON u.id = fl.follower_id
     WHERE fl.following_id = ?
     ORDER BY fl.created_at DESC`,
    [userId],
  );
}

/**
 * Returns the users the given user is following.
 */
export async function getFollowing(userId: number): Promise<PublicUser[]> {
  await ensureUserExists(userId);
  return query<PublicUser>(
    `SELECT u.id, u.username, u.name, u.avatar_url
     FROM follows fl
     JOIN users u ON u.id = fl.following_id
     WHERE fl.follower_id = ?
     ORDER BY fl.created_at DESC`,
    [userId],
  );
}

/** A single row in the Home → Friends' Activity carousel. */
export interface FriendActivityRow {
  /** Rating id, used as a stable key in the frontend list. */
  id: number;
  /** Internal user id of the friend. */
  user_id: number;
  username: string;
  avatar_url: string | null;
  /** Friend's star rating (0.5–5). */
  rating: number;
  /** TMDB id of the film or series. */
  tmdb_id: number;
  title: string;
  /** Poster honours the FRIEND's custom override (their take, their poster). */
  poster_path: string | null;
  /** True when the rating has an attached review. */
  has_review: boolean;
  /** ID of the attached review, or null when no review exists. */
  review_id: number | null;
  /** Discriminator used by the frontend to route taps to /film/ vs /series/. */
  media_type: 'film' | 'series';
}

/**
 * Returns the latest rating per followed user for the given media type.
 * Designed to power the Home → Friends' Activity carousel. Each followed
 * user contributes at most one row (their most recent watched_on, breaking
 * ties on created_at) and rows where the title joined to NULL are excluded.
 *
 * @param viewerId - The currently authenticated user.
 * @param type - 'film' to return film ratings only, 'series' for series only.
 * @param limit - Maximum number of rows to return. Defaults to 20.
 */
export async function getFriendsActivity(
  viewerId: number,
  type: 'film' | 'series',
  limit = 20,
): Promise<FriendActivityRow[]> {
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  // Step 1: pick the latest rating id per followed user for the requested
  // media type. Using a correlated subquery is cleaner than window functions
  // here because it stays within standard MySQL 8 syntax and lets us reuse
  // the same plan for either type.
  const typeFilter = type === 'film' ? 'r.film_id IS NOT NULL' : 'r.series_id IS NOT NULL';

  const rows = await query<{
    id: number;
    user_id: number;
    username: string;
    avatar_url: string | null;
    value: number;
    tmdb_id: number | null;
    title: string | null;
    poster_path: string | null;
    review_id: number | null;
  }>(
    `SELECT
       r.id,
       u.id          AS user_id,
       u.username,
       u.avatar_url,
       r.value,
       ${type === 'film' ? 'f.tmdb_id' : 's.tmdb_id'}      AS tmdb_id,
       ${type === 'film' ? 'f.title'   : 's.title'}        AS title,
       COALESCE(
         p.custom_poster_path,
         ${type === 'film' ? 'f.poster_path' : 's.poster_path'}
       ) AS poster_path,
       rev.id        AS review_id
     FROM follows fl
     JOIN users u ON u.id = fl.following_id
     JOIN ratings r
       ON r.id = (
         SELECT r2.id
         FROM ratings r2
         WHERE r2.user_id = fl.following_id
           AND ${type === 'film' ? 'r2.film_id IS NOT NULL' : 'r2.series_id IS NOT NULL'}
         ORDER BY r2.watched_on DESC, r2.created_at DESC
         LIMIT 1
       )
     ${type === 'film'
       ? 'LEFT JOIN films  f ON f.id = r.film_id'
       : 'LEFT JOIN series s ON s.id = r.series_id'}
     LEFT JOIN user_title_display_prefs p
       ON p.user_id = u.id
       AND ${type === 'film' ? 'p.film_id = f.id' : 'p.series_id = s.id'}
     LEFT JOIN reviews rev ON rev.rating_id = r.id
     WHERE fl.follower_id = ?
       AND ${typeFilter}
     ORDER BY r.watched_on DESC, r.created_at DESC
     LIMIT ${clampedLimit}`,
    [viewerId],
  );

  // Drop rows where the joined title is missing (orphaned rating) so the UI
  // never has to render a blank poster.
  return rows
    .filter((r) => r.tmdb_id !== null && r.title !== null)
    .map<FriendActivityRow>((r) => ({
      id: r.id,
      user_id: r.user_id,
      username: r.username,
      avatar_url: r.avatar_url,
      rating: Number(r.value),
      // Safe: filter above guarantees non-null.
      tmdb_id: r.tmdb_id as number,
      title: r.title as string,
      poster_path: r.poster_path,
      has_review: r.review_id !== null,
      review_id: r.review_id,
      media_type: type,
    }));
}

// ---------------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------------

/**
 * Uploads an image buffer to Cloudinary under the `overture/avatars` folder
 * and saves the resulting public URL on the user's `avatar_url` column.
 *
 * The Cloudinary public id is `user_<userId>` with `overwrite: true`, so
 * each user only ever has one avatar asset on Cloudinary regardless of how
 * many times they replace it.
 *
 * @param userId   The authenticated user's id.
 * @param buffer   The raw image bytes from multer's memory storage.
 * @param mimetype The MIME type of the uploaded file (jpeg/png/webp).
 * @returns        The new public Cloudinary `secure_url`.
 */
export async function uploadAvatar(
  userId: number,
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  await ensureUserExists(userId);

  const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'overture/avatars',
    public_id: `user_${userId}`,
    overwrite: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  await execute('UPDATE users SET avatar_url = ? WHERE id = ?', [
    result.secure_url,
    userId,
  ]);

  return result.secure_url;
}
