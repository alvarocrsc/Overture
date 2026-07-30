import React from 'react';
import { StyleSheet, View } from 'react-native';

import { GAP, SCREEN_PADDING, usePosterCellSize } from './posterGridLayout';

const SKELETON_BG = '#1a1a1a';

interface PosterSkeletonCellProps {
  width: number;
  posterHeight: number;
  cellHeight: number;
}

/**
 * A single poster-shaped placeholder (poster block + a short rating line),
 * sized to match a real grid cell exactly. Shared by the initial-load skeleton
 * grid and the in-grid placeholders rendered for not-yet-loaded items. Memoised
 * so fast scrolling doesn't re-render every placeholder.
 */
export const PosterSkeletonCell = React.memo(function PosterSkeletonCell({
  width,
  posterHeight,
  cellHeight,
}: PosterSkeletonCellProps): React.JSX.Element {
  return (
    <View style={{ width, height: cellHeight }}>
      <View style={[styles.poster, { width, height: posterHeight }]} />
      <View style={styles.ratingArea}>
        <View style={styles.ratingLine} />
      </View>
    </View>
  );
});

interface LoggedPostersSkeletonProps {
  /** Number of poster-shaped placeholders to render. */
  count: number;
  /**
   * Omit the outer horizontal padding when rendered inside an already-padded
   * container (e.g. as the grid's "loading more" footer).
   */
  inline?: boolean;
}

/**
 * Poster-shaped placeholders for the 3-column library grid, used for the
 * initial load before any page has arrived.
 */
export function LoggedPostersSkeleton({
  count,
  inline = false,
}: LoggedPostersSkeletonProps): React.JSX.Element {
  const { width, posterHeight, cellHeight } = usePosterCellSize();

  return (
    <View
      style={[styles.grid, inline ? null : { paddingHorizontal: SCREEN_PADDING }]}
    >
      {Array.from({ length: count }, (_, i) => (
        <PosterSkeletonCell
          key={i}
          width={width}
          posterHeight={posterHeight}
          cellHeight={cellHeight}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  poster: {
    borderRadius: 5,
    backgroundColor: SKELETON_BG,
  },
  ratingArea: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingLine: {
    height: 8,
    width: '70%',
    borderRadius: 4,
    backgroundColor: SKELETON_BG,
  },
});
