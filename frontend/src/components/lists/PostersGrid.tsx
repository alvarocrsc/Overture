import React from 'react';
import {
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

import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import type { NormalizedListItem } from '@/src/types/lists.types';

/** Horizontal screen padding from Figma. */
const SCREEN_PADDING = 20;
/** Gap between poster cells from Figma. */
const GAP = 10;
const COLUMNS = 3;
/** Poster aspect ratio from Figma (110×165). */
const POSTER_ASPECT = 165 / 110;

interface PostersGridProps {
  items: NormalizedListItem[];
  isRanked: boolean;
  onItemPress: (item: NormalizedListItem) => void;
  ListHeaderComponent?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Three-column poster grid used when a list is in "posters" view mode.
 * Acts as the screen's main scroll surface, so it accepts a
 * `ListHeaderComponent` for the list header + filters to scroll with it.
 */
export function PostersGrid({
  items,
  isRanked,
  onItemPress,
  ListHeaderComponent,
  contentContainerStyle,
}: PostersGridProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const itemWidth = Math.floor(
    (width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
  );
  const itemHeight = Math.round(itemWidth * POSTER_ASPECT);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.itemId.toString()}
      numColumns={COLUMNS}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      columnWrapperStyle={styles.column}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      renderItem={({ item }) => {
        const uri = posterUrl(item.posterPath, 'w342');
        return (
          <Pressable
            style={{ width: itemWidth, height: itemHeight }}
            onPress={() => onItemPress(item)}
          >
            <View style={[styles.poster, { width: itemWidth, height: itemHeight }]}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={0}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.posterFallback]} />
              )}
            </View>
            {isRanked ? (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{item.position}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SCREEN_PADDING,
    gap: GAP,
  },
  column: {
    gap: GAP,
  },
  poster: {
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  posterFallback: {
    backgroundColor: '#1a1a1a',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
});
