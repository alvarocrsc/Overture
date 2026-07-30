import React, { useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import StarRating from '@/src/components/home/StarRating';
import { LikeIcon } from '@/src/components/icons/LikeIcon';
import { PosterSkeletonCell } from '@/src/components/library/LoggedPostersSkeleton';
import {
  COLUMNS,
  GAP,
  SCREEN_PADDING,
  usePosterCellSize,
} from '@/src/components/library/posterGridLayout';
import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import type { LoggedTitle } from '@/src/types/library.types';

/**
 * One grid cell: either a loaded title or a placeholder standing in for a title
 * on a page that hasn't been fetched yet.
 */
type GridRow =
  | { kind: 'item'; item: LoggedTitle }
  | { kind: 'skeleton'; id: string };

interface PosterCellProps {
  item: LoggedTitle;
  width: number;
  posterHeight: number;
  cellHeight: number;
  onPress: (item: LoggedTitle) => void;
}

/**
 * A single loaded poster cell. Memoised (and fed only primitive/stable props)
 * so the FlatList can recycle rows without re-rendering every visible cell on
 * each scroll tick — what the "slow to update" warning asks for.
 */
const PosterCell = React.memo(function PosterCell({
  item,
  width,
  posterHeight,
  cellHeight,
  onPress,
}: PosterCellProps): React.JSX.Element {
  const uri = posterUrl(item.posterPath, 'w342');
  return (
    <Pressable style={{ width, height: cellHeight }} onPress={() => onPress(item)}>
      <View style={[styles.poster, { width, height: posterHeight }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
            <Text style={styles.posterFallbackText} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.ratingRow}>
        <StarRating rating={item.ratingValue} size={10} gap={1} />
        {item.isLiked ? <LikeIcon size={9} color={Colors.white} /> : null}
        {item.reviewId != null ? (
          <Ionicons name="reader-outline" size={11} color={Colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
});

interface LoggedPostersGridProps {
  items: LoggedTitle[];
  /** Total distinct titles available, used to size the skeleton tail. */
  total: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Fetches the next page; guarded internally against duplicate calls. */
  onLoadMore: () => void;
  onItemPress: (item: LoggedTitle) => void;
  ListHeaderComponent?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * How many skeleton cells to append below the loaded titles while more pages
 * remain. Bounded (not the full remaining count) so the content height only
 * ever grows as pages load — a collapsing tail is what made the bottom bounce.
 */
const MAX_SKELETON_BUFFER = COLUMNS * 8;

/**
 * Three-column grid of a user's logged titles. While more pages remain, a
 * bounded run of skeleton cells trails the loaded titles, giving scroll head-
 * room and a "more coming" cue without a hard wall. The next page loads as that
 * buffer nears the viewport (onEndReached); content only ever grows, so the
 * scroll position stays stable — no bottom bounce.
 *
 * Cells are a fixed, uniform height and memoised, so FlatList virtualises them
 * cheaply while measuring real layout (no getItemLayout — its numColumns offset
 * math mismatched the rendered height and caused the bottom to bounce).
 */
export function LoggedPostersGrid({
  items,
  total,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onItemPress,
  ListHeaderComponent,
  contentContainerStyle,
}: LoggedPostersGridProps): React.JSX.Element {
  const { width: itemWidth, posterHeight, cellHeight } = usePosterCellSize();

  // Trail the loaded titles with a bounded run of skeletons (capped at
  // MAX_SKELETON_BUFFER, never more than actually remain). Because the cap is
  // fixed, the list grows monotonically as pages load and never shrinks.
  const data = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = items.map((item) => ({ kind: 'item', item }));
    const remaining = Math.min(
      Math.max(total - items.length, 0),
      MAX_SKELETON_BUFFER,
    );
    for (let i = 0; i < remaining; i++) {
      rows.push({ kind: 'skeleton', id: `skeleton-${items.length + i}` });
    }
    return rows;
  }, [items, total]);

  // Keep the latest "should we fetch?" logic in a ref so the end-reached
  // callback stays referentially stable.
  const loadMoreRef = useRef<() => void>(() => undefined);
  loadMoreRef.current = (): void => {
    if (hasNextPage && !isFetchingNextPage) onLoadMore();
  };

  const handleEndReached = useCallback((): void => {
    loadMoreRef.current();
  }, []);

  const keyExtractor = useCallback(
    (row: GridRow): string =>
      row.kind === 'item' ? `item-${row.item.ratingId}` : row.id,
    [],
  );

  const renderItem = useCallback(
    ({ item: row }: { item: GridRow }): React.JSX.Element => {
      if (row.kind === 'skeleton') {
        return (
          <PosterSkeletonCell
            width={itemWidth}
            posterHeight={posterHeight}
            cellHeight={cellHeight}
          />
        );
      }
      return (
        <PosterCell
          item={row.item}
          width={itemWidth}
          posterHeight={posterHeight}
          cellHeight={cellHeight}
          onPress={onItemPress}
        />
      );
    },
    [itemWidth, posterHeight, cellHeight, onItemPress],
  );

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      numColumns={COLUMNS}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      columnWrapperStyle={styles.column}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      onEndReached={handleEndReached}
      onEndReachedThreshold={1.2}
      initialNumToRender={COLUMNS * 6}
      maxToRenderPerBatch={COLUMNS * 4}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
  },
  column: {
    // Horizontal gap between the 3 cells; marginBottom is the vertical row gap.
    gap: GAP,
    marginBottom: GAP,
  },
  poster: {
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  posterFallbackText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  ratingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
