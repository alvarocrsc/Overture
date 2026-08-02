/**
 * Conversions between the canonical rating scale and the five-star display.
 *
 * Every rating in the app — films, series and episodes alike — is stored and
 * transported on the canonical **0.0-10.0** scale. Five stars is a display and
 * input skin over it: a 4.5-star rating is a 9.0.
 *
 * Keeping the canonical value as the only thing that crosses the API boundary
 * is what lets averages, distributions and stats aggregate without caring who
 * is looking at them. Conversion happens at the edges, and only here.
 */
import type { RatingFormat } from '@/src/types/profile.types';

/** Bounds of the canonical scale. */
export const CANONICAL_MIN = 0;
export const CANONICAL_MAX = 10;

/** Bounds of the star scale, in the 0.5 steps the star widgets already use. */
export const STAR_MAX = 5;
export const STAR_STEP = 0.5;

/** A canonical value is exactly twice its star value. */
const CANONICAL_PER_STAR = 2;

/**
 * Converts a canonical rating to the star scale for the existing star widgets,
 * which speak 0-5 in 0.5 steps and are left untouched by this conversion.
 *
 * The result is rounded to the nearest half star: a canonical 7.4 has no exact
 * star equivalent, and showing 3.7 stars would be meaningless in a widget that
 * only draws halves.
 *
 * @param canonical - A 0.0-10.0 rating, or null.
 * @returns A 0-5 value in 0.5 steps, or null.
 */
export function toStarValue(canonical: number | null): number | null {
  if (canonical === null || !Number.isFinite(canonical)) return null;
  const stars = canonical / CANONICAL_PER_STAR;
  return Math.round(stars / STAR_STEP) * STAR_STEP;
}

/**
 * Converts a star value from the star widgets back to canonical for storage.
 *
 * @param stars - A 0-5 value in 0.5 steps.
 * @returns The canonical 0.0-10.0 equivalent.
 */
export function toCanonicalValue(stars: number): number {
  return Number((stars * CANONICAL_PER_STAR).toFixed(1));
}

/**
 * Renders a *difference* between two canonical ratings — a spread, a gap — in
 * the given format.
 *
 * Distinct from {@link formatRating} because a delta is not itself a rating:
 * it is scaled but never rounded to a half star, since "1.7 apart" is a
 * meaningful quantity where a 1.7-star rating would not be.
 *
 * @param delta - A difference on the canonical scale.
 * @param format - The viewer's preferred format.
 * @returns Formatted text, to one decimal.
 */
export function formatRatingDelta(delta: number, format: RatingFormat): string {
  const scaled = format === 'numeric' ? delta : delta / CANONICAL_PER_STAR;
  return scaled.toFixed(1);
}

/** One bar of a rating distribution chart. */
export interface RatingBin {
  /** The bucket's canonical upper bound: 1 through 10. */
  value: number;
  count: number;
}

/** The distribution charts always draw ten bars. */
export const RATING_BIN_COUNT = 10;

/**
 * Folds a raw `GROUP BY value` distribution into the ten fixed buckets the
 * charts draw.
 *
 * Two things make this necessary. Ratings are no longer limited to ten discrete
 * values — numeric-format users rate in 0.1 steps — so values must be bucketed
 * by range rather than matched exactly. And the raw distribution omits values
 * nobody used, so indexing it positionally would line bars up against the wrong
 * ratings; building all ten buckets every time removes that class of bug.
 *
 * A value falls into the bucket it rounds *up* into, so bucket 9 covers
 * (8.0, 9.0] — which for star-authored data (whole canonical values) is an
 * exact one-to-one mapping, leaving the chart's existing behaviour unchanged.
 *
 * @param distribution - Raw `{ value, count }` rows on the canonical scale.
 * @returns Exactly ten bins, ascending.
 */
export function toRatingBins(
  distribution: readonly { value: number; count: number }[],
): RatingBin[] {
  const counts = new Array<number>(RATING_BIN_COUNT).fill(0);

  for (const row of distribution) {
    if (!Number.isFinite(row.value)) continue;
    const bucket = Math.ceil(Math.max(row.value, 0.1));
    const index = Math.min(Math.max(bucket, 1), RATING_BIN_COUNT) - 1;
    counts[index] += Number(row.count);
  }

  return counts.map((count, i) => ({ value: i + 1, count }));
}

/**
 * Renders a canonical rating as text in the given format.
 *
 * Numeric keeps one decimal so a column of ratings stays visually even;
 * stars drop a trailing `.0` so a whole rating reads as "4" rather than "4.0",
 * matching how the star widgets already label themselves.
 *
 * @param canonical - A 0.0-10.0 rating, or null.
 * @param format - The viewer's preferred format.
 * @returns Formatted text, or null when unrated.
 */
export function formatRating(
  canonical: number | null,
  format: RatingFormat,
): string | null {
  if (canonical === null || !Number.isFinite(canonical)) return null;

  if (format === 'numeric') return canonical.toFixed(1);

  const stars = toStarValue(canonical);
  if (stars === null) return null;
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1);
}
