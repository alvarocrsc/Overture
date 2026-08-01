/**
 * Colour scale for the 0.0-10.0 episode rating heatmap.
 *
 * Kept as one exported array so the whole scale can be retuned in a single
 * place — the grid, the season badges and the episode rows all read from it.
 */

export interface RatingColorTier {
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
  color: string;
  /** Text colour that stays legible on `color`. */
  textColor: string;
}

/** Dark text for the light/mid tiers, near-black for the bright ones. */
const ON_LIGHT = '#000000';
const ON_DARK = '#FFFFFF';

/**
 * Highest tier first so the lookup returns the most specific match.
 *
 * TODO(rating-tiers): the 4.0-5.9 and 0.1-3.9 colours are placeholders — only
 * the top three tiers were specified by design. Confirm and replace.
 */
export const RATING_COLOR_TIERS: RatingColorTier[] = [
  { min: 10.0, max: 10.0, color: '#196A3B', textColor: ON_DARK },
  { min: 8.0, max: 9.9, color: '#28B563', textColor: ON_LIGHT },
  { min: 6.0, max: 7.9, color: '#F5D040', textColor: '#353434' },
  { min: 4.0, max: 5.9, color: '#F0883E', textColor: ON_LIGHT },
  { min: 0.1, max: 3.9, color: '#E5484D', textColor: ON_DARK },
];

/** Background used for a cell with no rating in the current source. */
export const RATING_EMPTY_COLOR = '#292929';

/**
 * Returns the heatmap tier for a rating value.
 *
 * Uses a small epsilon on the upper bound so a value that lands just past a
 * boundary through floating-point averaging (9.900000000000002) still matches
 * its intended tier rather than falling through.
 *
 * @param value - The rating, or null when unrated.
 * @returns The matching tier, or null when unrated / out of range.
 */
export function getRatingTier(value: number | null): RatingColorTier | null {
  if (value === null || !Number.isFinite(value)) return null;
  return (
    RATING_COLOR_TIERS.find((t) => value >= t.min && value <= t.max + 1e-9) ??
    null
  );
}

/**
 * Returns the heatmap background colour for a rating value.
 * @returns The tier colour, or null when the value is unrated.
 */
export function getRatingColor(value: number | null): string | null {
  return getRatingTier(value)?.color ?? null;
}

/**
 * Formats a rating for display in a badge or cell — always one decimal, so
 * 9 reads as "9.0" and the column stays visually even.
 */
export function formatRatingValue(value: number): string {
  return value.toFixed(1);
}
