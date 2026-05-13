import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import SectionDivider from './SectionDivider';
import { posterUrl } from '@/src/lib/tmdb';
import { SCREEN_PADDING_H, useLayout } from '@/src/lib/layout';
import type { UserFavorite } from '@/src/types/profile.types';

interface FavoritesRowProps {
  favorites: UserFavorite[];
  isOwnProfile: boolean;
  onSlotPress?: (position: number) => void;
  onRemovePress?: (position: number) => void;
}

const SLOTS: ReadonlyArray<1 | 2 | 3 | 4> = [1, 2, 3, 4];

/**
 * "FAVORITES" header + 4 poster slots. Empty slots show a "+" placeholder
 * for the profile owner; filled slots show an × remove button when the
 * profile owner is viewing.
 */
export default function FavoritesRow({
  favorites,
  isOwnProfile,
  onSlotPress,
  onRemovePress,
}: FavoritesRowProps): React.JSX.Element {
  const byPosition = new Map(favorites.map((f) => [f.position, f]));
  const count = favorites.length;
  const { favoritePosterWidth } = useLayout();
  const posterWidth = favoritePosterWidth;
  const posterHeight = Math.round(posterWidth * 1.5);
  const posterSizeStyle = { width: posterWidth, height: posterHeight };

  return (
    <View style={styles.section}>
      <SectionDivider prefix={String(count)} label="FAVORITES" lineWidth={120} />

      <View style={styles.row}>
        {SLOTS.map((slot) => {
          const fav = byPosition.get(slot);
          if (!fav) {
            return (
              <Pressable
                key={slot}
                onPress={isOwnProfile ? () => onSlotPress?.(slot) : undefined}
                style={[styles.posterEmpty, posterSizeStyle]}
              >
                {isOwnProfile ? <Text style={styles.plus}>+</Text> : null}
              </Pressable>
            );
          }
          const uri = posterUrl(fav.poster_path, 'original');
          return (
            <View key={slot} style={[styles.poster, posterSizeStyle]}>
              {uri ? (
                <Image source={{ uri }} style={styles.posterImage} />
              ) : (
                <View style={[styles.posterImage, styles.posterFallback]}>
                  <Text style={styles.posterFallbackText} numberOfLines={2}>
                    {fav.title}
                  </Text>
                </View>
              )}
              {isOwnProfile ? (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => onRemovePress?.(slot)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="close" size={14} color={Colors.white} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: SCREEN_PADDING_H,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  poster: {
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
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontFamily: FontFamily.regular,
    fontSize: 28,
    color: '#3A3A3A',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

