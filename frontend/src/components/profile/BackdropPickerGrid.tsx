import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import RatingDisplay from '@/src/components/shared/RatingDisplay';
import { Colors, FontFamily, LetterSpacing, Radius, Spacing } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import type { BackdropOption } from '@/src/types/profile.types';

const COLUMNS = 2;
const GAP = 10;
/** TMDB backdrops are 16:9, so cells are sized to the source aspect ratio. */
const ASPECT_RATIO = 16 / 9;

/**
 * Identity of a backdrop option. Films and series have independent TMDB id
 * sequences, so the media type is part of the key — without it a series could
 * be ticked because an unrelated film shares its id.
 *
 * @param mediaType - The option's type; null for a banner saved before the
 *                    media type was stored, which resolved films first.
 * @param tmdbId - The option's TMDB id.
 * @returns A stable key identifying the option.
 */
export function backdropOptionKey(
  mediaType: 'film' | 'series' | null,
  tmdbId: number,
): string {
  return `${mediaType ?? 'film'}-${tmdbId}`;
}

interface BackdropCellProps {
  option: BackdropOption;
  width: number;
  height: number;
  isSelected: boolean;
  isPending: boolean;
  onSelect: (option: BackdropOption) => void;
}

/**
 * One selectable backdrop. Memoised and fed primitive props so the list can
 * recycle rows without re-rendering every visible cell as the user scrolls.
 */
const BackdropCell = React.memo(function BackdropCell({
  option,
  width,
  height,
  isSelected,
  isPending,
  onSelect,
}: BackdropCellProps): React.JSX.Element {
  const uri = backdropUrl(option.backdrop_path, 'w780');

  return (
    <Pressable
      style={{ width }}
      onPress={() => onSelect(option)}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Use ${option.title} as profile banner`}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.imageWrap,
              { height },
              isSelected && styles.imageWrapSelected,
              pressed && styles.pressed,
            ]}
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={120}
              />
            ) : null}

            {isPending ? (
              <View style={styles.overlay}>
                <ActivityIndicator color={Colors.white} size="small" />
              </View>
            ) : isSelected ? (
              <View style={styles.overlay}>
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={16} color={Colors.white} />
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>
              {option.title}
            </Text>
            {option.rating != null ? (
              <RatingDisplay
                value={option.rating}
                mediaType={option.media_type}
                size={10}
                gap={1}
              />
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
});

interface BackdropPickerGridProps {
  items: BackdropOption[];
  /** Key of the option currently saved as the banner, from {@link backdropOptionKey}. */
  selectedKey: string | null;
  /** Key of the option being saved right now, shown with a spinner. */
  pendingKey: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Fetches the next page; guarded internally against duplicate calls. */
  onLoadMore: () => void;
  onSelect: (option: BackdropOption) => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Two-column infinite grid of banner options.
 *
 * Purely presentational — paging and persistence are driven by the callbacks,
 * so the same grid serves both the rated-titles list and search results.
 */
export default function BackdropPickerGrid({
  items,
  selectedKey,
  pendingKey,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelect,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}: BackdropPickerGridProps): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions();

  const { cellWidth, cellImageHeight } = useMemo(() => {
    const available =
      screenWidth - Spacing.screenH * 2 - GAP * (COLUMNS - 1);
    const width = Math.floor(available / COLUMNS);
    return {
      cellWidth: width,
      cellImageHeight: Math.round(width / ASPECT_RATIO),
    };
  }, [screenWidth]);

  const handleEndReached = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) onLoadMore();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => backdropOptionKey(item.media_type, item.tmdb_id)}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.column}
      renderItem={({ item }) => {
        const key = backdropOptionKey(item.media_type, item.tmdb_id);
        return (
          <BackdropCell
            option={item}
            width={cellWidth}
            height={cellImageHeight}
            isSelected={key === selectedKey}
            isPending={key === pendingKey}
            onSelect={onSelect}
          />
        );
      }}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent ?? null}
      ListEmptyComponent={ListEmptyComponent ?? null}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={Colors.accentBlue} style={styles.footer} />
        ) : null
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  column: {
    gap: GAP,
    marginBottom: 16,
  },
  imageWrap: {
    width: '100%',
    borderRadius: Radius.poster,
    backgroundColor: '#1f1f1f',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageWrapSelected: {
    borderColor: Colors.accentBlue,
  },
  pressed: {
    opacity: 0.7,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  footer: {
    paddingVertical: 20,
  },
});
