import { useWindowDimensions } from 'react-native';

/**
 * Single source of truth for responsive layout values used across the app.
 * Every component that needs screen-relative dimensions must import from
 * this file instead of calling `useWindowDimensions()` directly or
 * hardcoding pixel widths.
 *
 * Target range: ~240dp (Unihertz Jelly) through full-size tablets.
 */

/** Horizontal padding applied to every screen container. Matches Spacing.screenH. */
export const SCREEN_PADDING_H = 20;

/** Standard gap between adjacent grid / row items. */
export const CARD_GAP = 10;

/** Leading padding applied before the first item in horizontal carousels. */
export const CAROUSEL_SNAP_PADDING = 16;

export interface LayoutValues {
  /** Full window width in dp. */
  screenWidth: number;
  /** Full window height in dp. */
  screenHeight: number;
  /** Usable width after both sides of `SCREEN_PADDING_H` are subtracted. */
  contentWidth: number;
  /** Width of a card in a 2-column grid (MediaGrid). */
  gridCardWidth: number;
  /** Width of a poster in the 4-up FavoritesRow. */
  favoritePosterWidth: number;
  /**
   * Width of a peeked carousel card (slightly narrower than content width
   * so the next item peeks into view on the right edge).
   */
  carouselCardWidth: number;
  /** Width of a full-bleed carousel card (trending, divides). */
  fullCarouselCardWidth: number;
  /** Width of a card in the 2x2 suggestion grid. */
  suggestionCardWidth: number;
  /** Width of a poster in the 4-up RecentActivityRow. */
  recentActivityPosterWidth: number;
  /** True for screens narrower than 320dp. */
  isSmallScreen: boolean;
  /** True for screens narrower than 260dp (Unihertz Jelly territory). */
  isTinyScreen: boolean;
}

/**
 * Returns all screen-relative layout values for the current window size.
 * Recomputed on every render, so components automatically respond to
 * orientation changes and split-screen resizes.
 */
export function useLayout(): LayoutValues {
  const { width, height } = useWindowDimensions();

  const contentWidth = width - SCREEN_PADDING_H * 2;
  const gridCardWidth = (contentWidth - CARD_GAP) / 2;
  const favoritePosterWidth = (contentWidth - CARD_GAP * 3) / 4;
  const carouselCardWidth = width - SCREEN_PADDING_H * 2 - 32;
  const fullCarouselCardWidth = width - SCREEN_PADDING_H * 2;
  const suggestionCardWidth = (contentWidth - CARD_GAP) / 2;
  const recentActivityPosterWidth = (contentWidth - CARD_GAP * 3) / 4;

  return {
    screenWidth: width,
    screenHeight: height,
    contentWidth,
    gridCardWidth,
    favoritePosterWidth,
    carouselCardWidth,
    fullCarouselCardWidth,
    suggestionCardWidth,
    recentActivityPosterWidth,
    isSmallScreen: width < 320,
    isTinyScreen: width < 260,
  };
}
