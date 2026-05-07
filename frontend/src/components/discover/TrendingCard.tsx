import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import { useFilmTrailer } from '@/src/hooks/useFilmTrailer';
import YoutubeBackgroundPlayer from './YoutubeBackgroundPlayer';

export interface TrendingFilm {
  tmdb_id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string | null;
  tmdb_rating: number | null;
  /** Director name. Requires a per-film credits call to populate; null if unknown. */
  director: string | null;
}

interface Props {
  film: TrendingFilm | null;
  active?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onPress?: () => void;
  onWatchlistPress?: () => void;
}

const CARD_WIDTH = 350;
const BACKDROP_HEIGHT = 186;

/**
 * Single trending-film card on the Discover screen. The static TMDB
 * backdrop is shown until the embedded YouTube player has buffered enough
 * to play smoothly.
 */
export default function TrendingCard({
  film,
  active = false,
  muted = true,
  onToggleMute,
  onPress,
  onWatchlistPress,
}: Props) {
  const [isReady, setIsReady] = useState(false);
  const { data: trailerKey } = useFilmTrailer(film?.tmdb_id);

  useEffect(() => {
    if (!active) setIsReady(false);
  }, [active]);

  if (!film) {
    return (
      <View style={styles.card}>
        <View style={[styles.backdropWrapper, styles.skeleton]} />
        <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
        <View style={[styles.skeletonLine, styles.skeletonLineNarrow]} />
      </View>
    );
  }

  const year = film.release_date ? film.release_date.slice(0, 4) : null;
  const ratingDisplay =
    film.tmdb_rating != null ? (film.tmdb_rating / 2).toFixed(1) : null;
  const backdropUri = backdropUrl(film.backdrop_path, 'w780');
  const showTrailer = active && Boolean(trailerKey);

  return (
    <View style={styles.card}>
      <View style={styles.backdropWrapper}>
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
              width={CARD_WIDTH}
              height={BACKDROP_HEIGHT}
              muted={muted}
              onReady={() => setIsReady(true)}
            />
          </View>
        )}

        <Pressable onPress={onPress} style={StyleSheet.absoluteFill} />

        {/* Mute / unmute */}
        {showTrailer && isReady && onToggleMute && (
          <Pressable
            onPress={onToggleMute}
            hitSlop={10}
            style={styles.muteButton}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={14}
              color={Colors.white}
            />
          </Pressable>
        )}

        {/* Bottom-left film info overlay */}
        <View style={styles.infoOverlay} pointerEvents="none">
          {ratingDisplay && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color={Colors.accentBlue} style={styles.ratingIcon} />
              <Text style={styles.ratingText}>{ratingDisplay}</Text>
            </View>
          )}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {film.title}
            </Text>
            {(year || film.director) && (
              <Text style={styles.directorLine} numberOfLines={2}>
                {year && <Text style={styles.year}>{year}</Text>}
                {year && film.director ? '   ·   ' : ''}
                {film.director && (
                  <>
                    <Text style={styles.directedBy}>DIRECTED BY</Text>
                    {'\n'}
                    <Text style={styles.directorName}>{film.director}</Text>
                  </>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Overview + bookmark row below backdrop */}
      <View style={styles.bottomRow}>
        <Text style={styles.overview} numberOfLines={3}>
          {film.overview}
        </Text>
        <Pressable
          onPress={onWatchlistPress}
          hitSlop={10}
          style={styles.bookmarkButton}
        >
          <Ionicons name="bookmark-outline" size={20} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  backdropWrapper: {
    width: CARD_WIDTH,
    height: BACKDROP_HEIGHT,
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
  skeleton: {
    backgroundColor: '#1a1a1a',
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
    marginTop: 12,
  },
  skeletonLineWide: {
    width: '90%',
  },
  skeletonLineNarrow: {
    width: '60%',
    marginTop: 8,
  },
  muteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
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
  directorLine: {
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
  directedBy: {
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  directorName: {
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
    color: Colors.white,
    letterSpacing: -0.5,
    lineHeight: 15,
    marginRight: 12,
  },
  bookmarkButton: {
    paddingTop: 2,
  },
});
