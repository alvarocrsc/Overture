import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import SeriesIcon from './SeriesIcon';
import type { FilmSearchResult, SeriesSearchResult } from '@/src/types/search.types';

interface Props {
  item: FilmSearchResult | SeriesSearchResult;
  isLogged?: boolean;
  isInWatchlist?: boolean;
  onPress: () => void;
  onLogPress: () => void;
  onWatchlistPress: () => void;
  onRemove?: () => void;
}

export default function MediaSearchItem({
  item,
  isLogged,
  isInWatchlist,
  onPress,
  onLogPress,
  onWatchlistPress,
  onRemove,
}: Props) {
  const url = resolveThumbnail(item.posterPath);
  const isSeries = item.type === 'series';
  const subtitleLabel = isSeries ? 'CREATED BY' : 'DIRECTED BY';
  const creator =
    item.type === 'film' ? item.director : (item as SeriesSearchResult).creator;
  const yearLabel = item.year ?? 'UNRELEASED';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.poster}>
        {url ? (
          <Image source={{ uri: url }} style={styles.posterImage} contentFit="cover" />
        ) : (
          <View style={styles.posterFallback} />
        )}
      </View>

      <View style={styles.textStack}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {isSeries && (
            <View style={styles.seriesIcon}>
              <SeriesIcon size={10} color={Colors.accentBlue} />
            </View>
          )}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.year}>{yearLabel}</Text>
          {creator ? <Text>{`   ·   ${subtitleLabel}`}</Text> : null}
        </Text>
        {creator ? (
          <Text style={styles.creator} numberOfLines={1}>
            {creator}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onLogPress}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons
            name={isLogged ? 'checkmark-circle' : 'add-circle-outline'}
            size={20}
            color={Colors.white}
          />
        </Pressable>
        <Pressable
          onPress={onWatchlistPress}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons
            name={isInWatchlist ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={Colors.white}
          />
        </Pressable>
        {onRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close" size={16} color={Colors.white} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Recent searches store full image URLs; live search results store
 * TMDB paths. Detect which one we have and resolve accordingly.
 */
function resolveThumbnail(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return posterUrl(path, 'w185');
}

const styles = StyleSheet.create({
  row: {
    height: 75,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    flex: 1,
    backgroundColor: '#222',
  },
  textStack: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 19,
    flexShrink: 1,
  },
  seriesIcon: {
    marginLeft: 6,
    marginTop: 5,
  },
  meta: {
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    letterSpacing: -0.5,
    marginTop: -2,
  },
  year: {
    fontFamily: FontFamily.semiBold,
    color: Colors.accentBlue,
  },
  creator: {
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 12,
  },
});
