import { useWindowDimensions } from 'react-native';

/** Horizontal screen padding from Figma. */
export const SCREEN_PADDING = 20;
/** Gap between poster cells (both axes) from Figma. */
export const GAP = 10;
export const COLUMNS = 3;
/** Poster aspect ratio from Figma (110×165). */
export const POSTER_ASPECT = 165 / 110;
/**
 * Fixed height of the rating row beneath each poster (poster→rating gap + the
 * row itself). Pinned so every cell has a known, identical height — required
 * for getItemLayout, which keeps fast scrolling smooth and blank-free.
 */
export const RATING_BLOCK_HEIGHT = 20;

export interface PosterCellSize {
  width: number;
  posterHeight: number;
  /** Full cell height (poster + rating block); the unit getItemLayout works in. */
  cellHeight: number;
}

/**
 * Computes the poster cell size for the 3-column library grid from the current
 * window width, so the real grid and its loading skeleton stay pixel-aligned.
 */
export function usePosterCellSize(): PosterCellSize {
  const { width } = useWindowDimensions();
  const cellWidth = Math.floor(
    (width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
  );
  const posterHeight = Math.round(cellWidth * POSTER_ASPECT);
  return {
    width: cellWidth,
    posterHeight,
    cellHeight: posterHeight + RATING_BLOCK_HEIGHT,
  };
}
