import React from 'react';
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

import StarRating from '@/src/components/home/StarRating';
import { LikeIcon } from '@/src/components/icons/LikeIcon';
import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import type { LoggedTitle } from '@/src/types/library.types';

/** Horizontal screen padding from Figma. */
const SCREEN_PADDING = 20;
/** Gap between poster cells from Figma. */
const GAP = 10;
const COLUMNS = 3;
/** Poster aspect ratio from Figma (110×165). */
const POSTER_ASPECT = 165 / 110;

interface LoggedPostersGridProps {
  items: LoggedTitle[];
  onItemPress: (item: LoggedTitle) => void;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Three-column grid of a user's logged titles, mirroring the list "posters"
 * view. Each poster carries the user's star rating, plus a like and/or review
 * icon (like first, then review) when those actions exist. Pages in more rows
 * as the user scrolls to the end.
 */
export function LoggedPostersGrid({
  items,
  onItemPress,
  onEndReached,
  isFetchingNextPage,
  ListHeaderComponent,
  contentContainerStyle,
}: LoggedPostersGridProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const itemWidth = Math.floor(
    (width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
  );
  const itemHeight = Math.round(itemWidth * POSTER_ASPECT);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.ratingId.toString()}
      numColumns={COLUMNS}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      columnWrapperStyle={styles.column}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={Colors.white} style={styles.footer} />
        ) : null
      }
      renderItem={({ item }) => {
        const uri = posterUrl(item.posterPath, 'w342');
        return (
          <Pressable style={{ width: itemWidth }} onPress={() => onItemPress(item)}>
            <View style={[styles.poster, { width: itemWidth, height: itemHeight }]}>
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
              {item.isLiked ? (
                <LikeIcon size={9} color={Colors.white} />
              ) : null}
              {item.reviewId != null ? (
                <Ionicons
                  name="reader-outline"
                  size={11}
                  color={Colors.white}
                />
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
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
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    marginTop: 16,
  },
});
