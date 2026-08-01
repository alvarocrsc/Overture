import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { stillUrl } from '@/src/lib/tmdb';
import {
  formatRatingValue,
  getRatingTier,
} from '@/src/utils/episode-rating-color.utils';
import type { EpisodeListRow } from '@/src/types/episode-ratings.types';

/** Still thumbnail size (16:9, matching TMDB stills). */
const STILL_WIDTH = 96;
const STILL_HEIGHT = 54;

const OVERVIEW_LINES = 3;

interface EpisodeListItemProps {
  episode: EpisodeListRow;
  /** Opens the log flow for this episode. */
  onLogPress: (episode: EpisodeListRow) => void;
  /** Opens the episode itself (row body tap). */
  onPress: (episode: EpisodeListRow) => void;
}

/**
 * One episode inside an expanded season: still, number and title, air date and
 * runtime, a truncated overview, and — on the right — the rating badge plus a
 * watched toggle.
 */
export default function EpisodeListItem({
  episode,
  onLogPress,
  onPress,
}: EpisodeListItemProps): React.JSX.Element {
  const tier = getRatingTier(episode.value);
  const uri = stillUrl(episode.still_path, 'w300');

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onPress(episode)}
      accessibilityRole="button"
      accessibilityLabel={`Episode ${episode.episode_number}${
        episode.name ? `, ${episode.name}` : ''
      }`}
    >
      <View style={styles.still}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          <Text style={styles.episodeNumber}>{`${episode.episode_number}  `}</Text>
          {episode.name ?? ''}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {formatMeta(episode.air_date, episode.runtime_min)}
        </Text>

        {episode.overview ? (
          <Text style={styles.overview} numberOfLines={OVERVIEW_LINES}>
            {episode.overview}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {episode.value !== null && tier ? (
          <View style={[styles.ratingBadge, { backgroundColor: tier.color }]}>
            <Text style={[styles.ratingValue, { color: tier.textColor }]}>
              {formatRatingValue(episode.value)}
            </Text>
          </View>
        ) : (
          <View style={styles.ratingPlaceholder} />
        )}

        <Pressable
          onPress={() => onLogPress(episode)}
          hitSlop={10}
          style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ checked: episode.is_logged }}
          accessibilityLabel={
            episode.is_logged ? 'Edit this episode log' : 'Log this episode'
          }
        >
          <Ionicons
            name={episode.is_logged ? 'eye' : 'eye-outline'}
            size={16}
            color={episode.is_logged ? Colors.accentBlue : Colors.textMuted}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

/**
 * Builds the "september 10 1993 · 49m" line, dropping whichever half is
 * missing so a lone separator never appears.
 */
function formatMeta(airDate: string | null, runtimeMin: number | null): string {
  const parts: string[] = [];
  if (airDate) {
    const date = new Date(airDate);
    if (!Number.isNaN(date.getTime())) {
      parts.push(
        date
          .toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
          .toLowerCase(),
      );
    }
  }
  if (runtimeMin != null) parts.push(`${runtimeMin}m`);
  return parts.join('  ·  ');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  still: {
    width: STILL_WIDTH,
    height: STILL_HEIGHT,
    borderRadius: Radius.poster,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
  },
  episodeNumber: {
    color: Colors.white,
  },
  meta: {
    fontFamily: FontFamily.light,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginTop: 1,
  },
  overview: {
    fontFamily: FontFamily.light,
    fontSize: 10,
    lineHeight: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginTop: 3,
  },
  actions: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  ratingBadge: {
    minWidth: 30,
    height: 22,
    borderRadius: Radius.poster,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPlaceholder: {
    height: 22,
  },
  ratingValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  logButton: {
    padding: 2,
  },
});
