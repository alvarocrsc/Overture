import { query, execute } from '../config/db';
import { AppError } from '../utils/app-error';
import type { Review } from '../models/review.model';
import type { UpdateReviewInput, CreateCommentInput } from '../validators/review.validators';

/** Full review row joined with rating, user, and title data. */
export interface ReviewDetail {
  id: number;
  body: string;
  contains_spoilers: boolean;
  liked_title: boolean;
  likes_count: number;
  created_at: Date;
  updated_at: Date;
  rating: number;
  watched_on: string | null;
  is_rewatch: boolean;
  user_id: number;
  username: string;
  avatar_url: string | null;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
}

/** A comment row joined with author data. */
export interface CommentRow {
  id: number;
  body: string | null;
  likes_count: number;
  is_deleted: boolean;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
  user_id: number | null;
  username: string | null;
  avatar_url: string | null;
  reply_count: number;
}

/** Internal shape used for ownership checks on review_comments. */
interface CommentOwnerRow {
  id: number;
  user_id: number;
  review_id: number;
  parent_id: number | null;
}

/** Lookup result for review_likes. */
interface LikeRow {
  user_id: number;
}

/** Internal ID lookup. */
interface IdRow {
  id: number;
}

/** Internal row for rating FK lookups. */
interface RatingFkRow {
  film_id: number | null;
  series_id: number | null;
}

/**
 * Fetches a single review with full join data.
 * Optionally includes liked_by_me if a userId is provided.
 * @param reviewId - The review's primary key.
 * @param requestingUserId - The authenticated user's ID, if any.
 * @returns The review detail plus liked_by_me flag.
 */
export async function getReviewById(
  reviewId: number,
  requestingUserId: number | undefined,
): Promise<ReviewDetail & { liked_by_me: boolean }> {
  const [review] = await query<ReviewDetail>(
    `SELECT
       rev.id,
       rev.body,
       rev.contains_spoilers,
       rev.liked_title,
       rev.likes_count,
       rev.created_at,
       rev.updated_at,
       r.value AS rating,
       r.watched_on,
       r.is_rewatch,
       u.id AS user_id,
       u.username,
       u.avatar_url,
       f.tmdb_id  AS film_tmdb_id,
       f.title    AS film_title,
       f.poster_path AS film_poster,
       s.tmdb_id  AS series_tmdb_id,
       s.title    AS series_title,
       s.poster_path AS series_poster
     FROM reviews rev
     JOIN ratings r ON rev.rating_id = r.id
     JOIN users u ON rev.user_id = u.id
     LEFT JOIN films f ON r.film_id = f.id
     LEFT JOIN series s ON r.series_id = s.id
     WHERE rev.id = ?`,
    [reviewId],
  );

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  let liked_by_me = false;
  if (requestingUserId !== undefined) {
    const [like] = await query<LikeRow>(
      `SELECT user_id FROM review_likes WHERE user_id = ? AND review_id = ?`,
      [requestingUserId, reviewId],
    );
    liked_by_me = like !== undefined;
  }

  return { ...review, liked_by_me };
}

/**
 * Partially updates a review's body, spoiler flag, or liked_title.
 * Syncs title_likes when liked_title changes.
 * @param reviewId - The review's primary key.
 * @param userId - The authenticated user's ID.
 * @param data - Validated update payload.
 * @returns The updated reviewId.
 */
export async function updateReview(
  reviewId: number,
  userId: number,
  data: UpdateReviewInput,
): Promise<{ reviewId: number }> {
  const [review] = await query<Review>(
    `SELECT id, user_id, rating_id FROM reviews WHERE id = ?`,
    [reviewId],
  );
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  if (review.user_id !== userId) {
    throw new AppError('Forbidden', 403);
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (data.body !== undefined) {
    setClauses.push('body = ?');
    params.push(data.body);
  }
  if (data.contains_spoilers !== undefined) {
    setClauses.push('contains_spoilers = ?');
    params.push(data.contains_spoilers);
  }
  if (data.liked_title !== undefined) {
    setClauses.push('liked_title = ?');
    params.push(data.liked_title);
  }

  if (setClauses.length > 0) {
    params.push(reviewId);
    await execute(
      `UPDATE reviews SET ${setClauses.join(', ')} WHERE id = ?`,
      params as Parameters<typeof execute>[1],
    );
  }

  if (data.liked_title !== undefined) {
    const [ratingRow] = await query<RatingFkRow>(
      `SELECT film_id, series_id FROM ratings WHERE id = ?`,
      [review.rating_id],
    );
    // rating_id FK is NOT NULL on reviews — row always exists.
    const filmId = ratingRow!.film_id;
    const seriesId = ratingRow!.series_id;

    if (data.liked_title) {
      await execute(
        `INSERT IGNORE INTO title_likes (user_id, film_id, series_id) VALUES (?, ?, ?)`,
        [userId, filmId, seriesId],
      );
    } else {
      await execute(
        `DELETE FROM title_likes WHERE user_id = ?
         AND (film_id <=> ? OR series_id <=> ?)`,
        [userId, filmId, seriesId],
      );
    }
  }

  return { reviewId };
}

/**
 * Deletes a review. The parent rating row is preserved.
 * @param reviewId - The review's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function deleteReview(reviewId: number, userId: number): Promise<void> {
  const [review] = await query<Review>(
    `SELECT id, user_id FROM reviews WHERE id = ?`,
    [reviewId],
  );
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  if (review.user_id !== userId) {
    throw new AppError('Forbidden', 403);
  }

  await execute(`DELETE FROM reviews WHERE id = ?`, [reviewId]);
}

/**
 * Likes a review. Idempotent — liking twice has no error or side effect.
 * Increments likes_count only when a new row is actually inserted.
 * @param reviewId - The review's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function likeReview(reviewId: number, userId: number): Promise<void> {
  const [review] = await query<IdRow>(
    `SELECT id FROM reviews WHERE id = ?`,
    [reviewId],
  );
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  const result = await execute(
    `INSERT IGNORE INTO review_likes (user_id, review_id) VALUES (?, ?)`,
    [userId, reviewId],
  );

  if (result.affectedRows === 1) {
    await execute(
      `UPDATE reviews SET likes_count = likes_count + 1 WHERE id = ?`,
      [reviewId],
    );
  }
}

/**
 * Unlikes a review. Decrements likes_count only when a row is actually removed.
 * GREATEST(likes_count - 1, 0) guards against going below zero.
 * @param reviewId - The review's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function unlikeReview(reviewId: number, userId: number): Promise<void> {
  const [review] = await query<IdRow>(
    `SELECT id FROM reviews WHERE id = ?`,
    [reviewId],
  );
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  const result = await execute(
    `DELETE FROM review_likes WHERE user_id = ? AND review_id = ?`,
    [userId, reviewId],
  );

  if (result.affectedRows === 1) {
    await execute(
      `UPDATE reviews SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?`,
      [reviewId],
    );
  }
}

/**
 * Masks a soft-deleted comment: replaces body and user fields with null.
 * @param comment - A raw comment row from the DB.
 * @returns The comment with sensitive fields nulled out if is_deleted is true.
 */
function maskDeleted(comment: CommentRow): CommentRow {
  if (!comment.is_deleted) return comment;
  return {
    ...comment,
    body: null,
    user_id: null,
    username: null,
    avatar_url: null,
  };
}

/** Options for getReviewComments. */
export interface GetCommentsOptions {
  parentId: number | null;
}

/**
 * Returns top-level comments for a review (or replies to a specific comment).
 * Soft-deleted rows are included but their content is masked.
 * @param reviewId - The review's primary key.
 * @param options - Filter by parentId (null = top-level).
 * @returns Array of comments with reply counts.
 */
export async function getReviewComments(
  reviewId: number,
  options: GetCommentsOptions,
): Promise<{ data: CommentRow[]; total: number }> {
  const [review] = await query<IdRow>(
    `SELECT id FROM reviews WHERE id = ?`,
    [reviewId],
  );
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  const whereClause =
    options.parentId === null
      ? 'WHERE rc.review_id = ? AND rc.parent_id IS NULL'
      : 'WHERE rc.review_id = ? AND rc.parent_id = ?';

  const bindParams: unknown[] =
    options.parentId === null ? [reviewId] : [reviewId, options.parentId];

  const rows = await query<CommentRow>(
    `SELECT
       rc.id,
       rc.body,
       rc.likes_count,
       rc.is_deleted,
       rc.parent_id,
       rc.created_at,
       rc.updated_at,
       u.id AS user_id,
       u.username,
       u.avatar_url,
       COUNT(replies.id) AS reply_count
     FROM review_comments rc
     JOIN users u ON rc.user_id = u.id
     LEFT JOIN review_comments replies ON replies.parent_id = rc.id
     ${whereClause}
     GROUP BY rc.id, u.id, u.username, u.avatar_url
     ORDER BY rc.created_at ASC`,
    bindParams as Parameters<typeof query>[1],
  );

  const masked = rows.map(maskDeleted);
  return { data: masked, total: masked.length };
}

/**
 * Creates a top-level comment or reply on a review.
 * Enforces max 1 level of nesting.
 * @param reviewId - The review's primary key.
 * @param userId - The authenticated user's ID.
 * @param data - Validated comment payload.
 * @returns The new commentId.
 */
export async function createReviewComment(
  reviewId: number,
  userId: number,
  data: CreateCommentInput,
): Promise<{ commentId: number }> {
  const [review] = await query<IdRow>(
    `SELECT id FROM reviews WHERE id = ?`,
    [reviewId],
  );
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (data.parent_id) {
    const [parent] = await query<CommentOwnerRow>(
      `SELECT id, user_id, review_id, parent_id FROM review_comments WHERE id = ?`,
      [data.parent_id],
    );
    if (!parent || parent.review_id !== reviewId) {
      throw new AppError('Parent comment not found', 404);
    }
    if (parent.parent_id !== null) {
      throw new AppError('Replies to replies are not supported', 400);
    }
  }

  const result = await execute(
    `INSERT INTO review_comments (review_id, user_id, body, parent_id) VALUES (?, ?, ?, ?)`,
    [reviewId, userId, data.body, data.parent_id ?? null],
  );

  return { commentId: result.insertId };
}
