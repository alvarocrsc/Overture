import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import SectionDivider from './SectionDivider';
import StarRating from '@/src/components/home/StarRating';
import { posterUrl } from '@/src/lib/tmdb';
import type { RecentActivityItem } from '@/src/types/profile.types';

interface RecentActivityRowProps {
  items: RecentActivityItem[];
  onPressItem?: (item: RecentActivityItem) => void;
}

const POSTER_W = 84;
const POSTER_H = 126;
const MAX_ITEMS = 4;

/**
 * "RECENT ACTIVITY" header + up to 4 poster cards with their star
 * rating below. A rewatch icon overlays cards where `is_rewatch` is
 * true.
 */
export default function RecentActivityRow({
  items,
  onPressItem,
}: RecentActivityRowProps): React.JSX.Element {
  const slots = items.slice(0, MAX_ITEMS);

  return (
    <View style={styles.section}>
      <SectionDivider prefix="RECENT" label="ACTIVITY" />

      <View style={styles.row}>
        {Array.from({ length: MAX_ITEMS }).map((_, idx) => {
          const item = slots[idx];
          if (!item) {
            return <View key={`empty-${idx}`} style={styles.posterEmpty} />;
          }
          const uri = posterUrl(item.poster_path, 'w342');
          return (
            <Pressable
              key={item.id}
              onPress={() => onPressItem?.(item)}
              style={styles.card}
            >
              <View style={styles.poster}>
                {uri ? (
                  <Image source={{ uri }} style={styles.posterImage} />
                ) : (
                  <View style={[styles.posterImage, styles.posterFallback]}>
                    <Text style={styles.posterFallbackText} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.ratingRow}>
                <StarRating rating={item.rating_value} size={10} gap={1} />
                {item.is_rewatch ? (
                  <Ionicons
                    name="refresh"
                    size={11}
                    color={Colors.accentBlue}
                    style={styles.rewatchIcon}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  card: {
    width: POSTER_W,
  },
  poster: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  posterImage: {
    width: '100%',
    height: '100%',
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
  posterEmpty: {
    width: POSTER_W,
    height: POSTER_H + 16,
  },
  ratingRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewatchIcon: {
    marginLeft: 2,
  },
});
