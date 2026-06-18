import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import { useTitleTrailer } from '@/src/hooks/useTitleTrailer';
import { useFilmMyLogs } from '@/src/hooks/useFilmDetail';
import { useSeriesMyLogs } from '@/src/hooks/useSeriesDetail';
import { useWatchlistToggle } from '@/src/hooks/useWatchlist';
import YoutubeBackgroundPlayer from '@/src/components/discover/YoutubeBackgroundPlayer';
import type { NormalizedListItem } from '@/src/types/lists.types';

/** Backdrop aspect ratio, matched to the Discover trending card (186/350). */
const BACKDROP_ASPECT = 186 / 350;

interface ExpandedItemProps {
  item: NormalizedListItem;
  /** Rendered width in pixels (full content width). */
  width: number;
  /** Whether this row is the active/visible one — only then plays its trailer. */
  active: boolean;
  /** Whether trailer audio is muted (shared globally across the list). */
  isMuted: boolean;
  onMuteToggle: () => void;
  onPress: () => void;
  isRanked: boolean;
}

/**
 * A single full-width expanded list row: an auto-playing backdrop/trailer
 * card with rating, title, year + director/creator overlays, followed by the
 * overview text and a watchlist bookmark. Mirrors the Discover trending card.
 */
export function ExpandedItem({
  item,
  width,
  active,
  isMuted,
  onMuteToggle,
  onPress,
  isRanked,
}: ExpandedItemProps): React.JSX.Element {
  const backdropHeight = Math.round(width * BACKDROP_ASPECT);
  const [isReady, setIsReady] = useState(false);

  const isFilm = item.mediaType === 'film';
  // Fetch the trailer key eagerly (not gated by `active`) so it is ready to
  // play the instant the card becomes the visible one — mirroring the
  // Discover trending carousel. The backdrop stays visible until then.
  const { data: trailerKey } = useTitleTrailer(item.mediaType, item.tmdbId);

  // Both my-logs hooks are always called; the inactive one stays disabled.
  const filmLogs = useFilmMyLogs(isFilm ? item.tmdbId : undefined);
  const seriesLogs = useSeriesMyLogs(isFilm ? undefined : item.tmdbId);
  const logs = isFilm ? filmLogs.data : seriesLogs.data;
  const userRating = logs && logs.length > 0 ? logs[0]!.value : null;

  const watchlist = useWatchlistToggle(item.tmdbId, item.mediaType);

  useEffect(() => {
    if (!active) setIsReady(false);
  }, [active]);

  const backdropUri = backdropUrl(item.backdropPath, 'w1280');
  const showTrailer = active && Boolean(trailerKey);
  const creditLabel = isFilm ? 'DIRECTED BY' : 'CREATED BY';

  return (
    <View style={styles.card}>
      <View style={[styles.backdropWrapper, { width, height: backdropHeight }]}>
        {backdropUri ? (
          <Image
            source={{ uri: backdropUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.backdropFallback]} />
        )}

        {showTrailer && trailerKey && (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.playerLayer,
              { opacity: isReady ? 1 : 0 },
            ]}
            pointerEvents="none"
          >
            <YoutubeBackgroundPlayer
              videoId={trailerKey}
              width={width}
              height={backdropHeight}
              muted={isMuted}
              onReady={() => setIsReady(true)}
            />
          </View>
        )}

        <Pressable onPress={onPress} style={StyleSheet.absoluteFill} />

        {isRanked && (
          <View style={styles.rankBadge} pointerEvents="none">
            <Text style={styles.rankText}>{item.position}</Text>
          </View>
        )}

        {/* Mute / unmute */}
        {showTrailer && isReady && (
          <Pressable onPress={onMuteToggle} hitSlop={10} style={styles.muteButton}>
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={14}
              color={Colors.white}
            />
          </Pressable>
        )}

        {/* Bottom-left info overlay */}
        <View style={styles.infoOverlay} pointerEvents="none">
          {userRating != null && (
            <View style={styles.ratingRow}>
              <Ionicons
                name="star"
                size={11}
                color={Colors.accentBlue}
                style={styles.ratingIcon}
              />
              <Text style={styles.ratingText}>{userRating.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {(item.year || item.directorOrCreator) && (
              <Text style={styles.creditLine} numberOfLines={2}>
                {item.year && <Text style={styles.year}>{item.year}</Text>}
                {item.year && item.directorOrCreator ? '   ·   ' : ''}
                {item.directorOrCreator && (
                  <>
                    <Text style={styles.creditLabel}>{creditLabel}</Text>
                    {'\n'}
                    <Text style={styles.creditName}>{item.directorOrCreator}</Text>
                  </>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Overview + bookmark row */}
      <View style={styles.bottomRow}>
        <Text style={styles.overview} numberOfLines={3}>
          {item.overview}
        </Text>
        <Pressable
          onPress={watchlist.toggle}
          hitSlop={10}
          style={styles.bookmarkButton}
        >
          <Ionicons
            name={watchlist.inWatchlist ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={Colors.white}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  backdropWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  backdropFallback: {
    backgroundColor: '#1a1a1a',
  },
  playerLayer: {
    backgroundColor: '#000',
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
  },
  muteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    left: 19,
    right: 19,
    bottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -2,
  },
  ratingIcon: {
    marginBottom: 2.5,
    marginRight: -1,
  },
  ratingText: {
    fontFamily: FontFamily.black,
    fontSize: 14,
    color: Colors.accentBlue,
    marginLeft: 4,
    lineHeight: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.white,
    letterSpacing: -1,
    marginRight: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  creditLine: {
    fontFamily: FontFamily.light,
    fontSize: 10,
    color: Colors.white,
    textAlign: 'right',
    lineHeight: 12,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  year: {
    fontFamily: FontFamily.semiBold,
    color: Colors.accentBlue,
  },
  creditLabel: {
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  creditName: {
    fontFamily: FontFamily.light,
    color: Colors.white,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  overview: {
    flex: 1,
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.5,
    lineHeight: 15,
    marginRight: 12,
  },
  bookmarkButton: {
    paddingTop: 2,
  },
});
