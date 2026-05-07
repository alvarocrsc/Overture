/**
 * Deterministic hash of a string to a non-negative integer.
 * Same input always produces the same output.
 */
function hashUsername(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * A palette of visually distinct, vibrant colors that
 * look good with black outlines on the cat SVG.
 * The first color matches the app accent blue intentionally.
 */
const AVATAR_COLORS = [
  '#1A77DA', // blue (accent)
  '#E24B4A', // redF
  '#FF8C42', // orange
  '#F5A623', // amber
  '#1D9E75', // green
  '#00BCD4', // teal
  '#7F77DD', // purple
  '#FF6B9D', // pink
  '#E67E22', // carrot
  '#9B59B6', // violet
] as const;

/**
 * Light pastel backgrounds — each entry is a 30 % tint of the
 * corresponding AVATAR_COLORS entry (30 % color + 70 % white).
 * Must remain the same length and order as AVATAR_COLORS.
 */
const AVATAR_BG_COLORS = [
  '#BAD6F4', // blue tint
  '#F6C9C9', // red tint
  '#FFDCC6', // orange tint
  '#FCE4BD', // amber tint
  '#BBE2D6', // green tint
  '#B3EBF2', // teal tint
  '#D9D6F5', // purple tint
  '#FFD3E2', // pink tint
  '#F8D8BD', // carrot tint
  '#E1CDE9', // violet tint
] as const;

/**
 * Returns a stable color string for the given username.
 * The same username always produces the same color.
 *
 * @param username - The user's username string.
 * @returns A hex color string from the AVATAR_COLORS palette.
 */
export function getAvatarColor(username: string): string {
  return AVATAR_COLORS[hashUsername(username) % AVATAR_COLORS.length] as string;
}

/**
 * Returns the light background tint that pairs with the body color
 * for the given username.
 *
 * @param username - The user's username string.
 * @returns A hex color string from the AVATAR_BG_COLORS palette.
 */
export function getAvatarBgColor(username: string): string {
  return AVATAR_BG_COLORS[hashUsername(username) % AVATAR_BG_COLORS.length] as string;
}
