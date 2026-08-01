import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import {
  useLogEntireSeason,
  useSeasonEpisodes,
  useSeasonSummaries,
} from '@/src/hooks/use-episode-ratings';
import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import {
  formatRatingValue,
  getRatingTier,
} from '@/src/utils/episode-rating-color.utils';
import EpisodeListItem from '@/src/components/series/EpisodeListItem';
import type {
  EpisodeListRow,
  RatingSource,
  SeasonSummary,
} from '@/src/types/episode-ratings.types';

const SCREEN_PADDING = 20;
/** Carousel poster size and gap (Figma: 107x160, 117 pitch). */
const CARD_WIDTH = 107;
const CARD_POSTER_HEIGHT = 160;
const CARD_GAP = 10;
/** Poster size in the expanded single-season view. */
const EXPANDED_POSTER_WIDTH = 150;
const EXPANDED_POSTER_HEIGHT = 225;

/** Horizontal travel needed before a swipe changes season. */
const SWIPE_THRESHOLD = 60;

interface SeasonsCarouselProps {
  tmdbId: number;
  /** Shared with the episode ratings section so both show the same averages. */
  source: RatingSource;
  /** The expanded season, or null while the carousel is showing. */
  expandedSeasonNumber: number | null;
  onSeasonExpandedChange: (seasonNumber: number | null) => void;
  /** Opens the log flow for one episode. */
  onEpisodeLogPress: (seasonNumber: number, episode: EpisodeListRow) => void;
  /** Opens an episode's detail. */
  onEpisodePress: (seasonNumber: number, episode: EpisodeListRow) => void;
}

/**
 * The "Seasons" block: a horizontal carousel of season posters that expands
 * in place into a single-season view with that season's episode list.
 *
 * Expanded, the season can be changed by swiping horizontally or via the
 * next-season control, and tapping the poster collapses back to the carousel.
 */
export default function SeasonsCarousel({
  tmdbId,
  source,
  expandedSeasonNumber,
  onSeasonExpandedChange,
  onEpisodeLogPress,
  onEpisodePress,
}: SeasonsCarouselProps): React.JSX.Element | null {
  const seasonsQ = useSeasonSummaries(tmdbId, source);
  const seasons = useMemo<SeasonSummary[]>(() => seasonsQ.data ?? [], [seasonsQ.data]);

  if (seasonsQ.isLoading || seasons.length === 0) return null;

  const expanded =
    expandedSeasonNumber !== null
      ? (seasons.find((s) => s.season_number === expandedSeasonNumber) ?? null)
      : null;

  return (
    <Animated.View style={styles.container} layout={LinearTransition}>
      <Text style={styles.sectionTitle}>
        SEASONS <Text style={styles.sectionCount}>{`·  ${seasons.length}`}</Text>
      </Text>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(180)}
          layout={LinearTransition}
        >
          <ExpandedSeason
            tmdbId={tmdbId}
            season={expanded}
            seasons={seasons}
            source={source}
            onSeasonExpandedChange={onSeasonExpandedChange}
            onEpisodeLogPress={onEpisodeLogPress}
            onEpisodePress={onEpisodePress}
          />
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(180)}
          layout={LinearTransition}
        >
          <FlatList
            data={seasons}
            keyExtractor={(item) => String(item.season_number)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            renderItem={({ item }) => (
              <SeasonCard
                season={item}
                onPress={() => onSeasonExpandedChange(item.season_number)}
              />
            )}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

interface SeasonCardProps {
  season: SeasonSummary;
  onPress: () => void;
}

/** One season in the horizontal carousel. */
function SeasonCard({ season, onPress }: SeasonCardProps): React.JSX.Element {
  const tier = getRatingTier(season.avg_rating);
  const uri = posterUrl(season.poster_path, 'w342');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open season ${season.season_number}`}
    >
      <View style={styles.cardPoster}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>

      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {`Season ${season.season_number}`}
        </Text>
        {season.avg_rating !== null && tier ? (
          <View style={[styles.ratingBadge, { backgroundColor: tier.color }]}>
            <Text style={[styles.ratingValue, { color: tier.textColor }]}>
              {formatRatingValue(season.avg_rating)}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.cardEpisodes}>{`${season.episode_count} Episodes`}</Text>

      {season.watched_count > 0 ? (
        <WatchProgress
          watched={season.watched_count}
          total={season.episode_count}
          width={CARD_WIDTH}
        />
      ) : null}
    </Pressable>
  );
}

interface WatchProgressProps {
  watched: number;
  total: number;
  width: number;
}

/** "4 / 24" pill with a progress bar (Figma: 25pt tall, #1b1b1b). */
function WatchProgress({
  watched,
  total,
  width,
}: WatchProgressProps): React.JSX.Element {
  const ratio = total > 0 ? Math.min(watched / total, 1) : 0;

  return (
    <View style={[styles.progress, { width }]}>
      <Text style={styles.progressLabel}>
        {watched}
        <Text style={styles.progressTotal}>{` / ${total}`}</Text>
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

interface ExpandedSeasonProps {
  tmdbId: number;
  season: SeasonSummary;
  seasons: SeasonSummary[];
  source: RatingSource;
  onSeasonExpandedChange: (seasonNumber: number | null) => void;
  onEpisodeLogPress: (seasonNumber: number, episode: EpisodeListRow) => void;
  onEpisodePress: (seasonNumber: number, episode: EpisodeListRow) => void;
}

/** The single-season view: header, bulk-log control, and the episode list. */
function ExpandedSeason({
  tmdbId,
  season,
  seasons,
  source,
  onSeasonExpandedChange,
  onEpisodeLogPress,
  onEpisodePress,
}: ExpandedSeasonProps): React.JSX.Element {
  const episodesQ = useSeasonEpisodes(tmdbId, season.season_number, source);
  const logSeason = useLogEntireSeason(tmdbId);

  const tier = getRatingTier(season.avg_rating);
  const uri = posterUrl(season.poster_path, 'w500');
  const isFullyWatched =
    season.episode_count > 0 && season.watched_count >= season.episode_count;

  const seasonNumbers = seasons.map((s) => s.season_number);
  const currentIndex = seasonNumbers.indexOf(season.season_number);
  const previousSeason = currentIndex > 0 ? seasonNumbers[currentIndex - 1] : undefined;
  const nextSeason =
    currentIndex >= 0 && currentIndex < seasonNumbers.length - 1
      ? seasonNumbers[currentIndex + 1]
      : undefined;

  /** Horizontal swipe moves between seasons; vertical is left to the page. */
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && nextSeason !== undefined) {
        runOnJS(onSeasonExpandedChange)(nextSeason);
      } else if (
        event.translationX > SWIPE_THRESHOLD &&
        previousSeason !== undefined
      ) {
        runOnJS(onSeasonExpandedChange)(previousSeason);
      }
    });

  const handleLogSeason = (): void => {
    Alert.alert(
      'Log entire season?',
      'This marks every episode in this season as watched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log season',
          onPress: () => logSeason.mutate(season.season_number),
        },
      ],
    );
  };

  return (
    <View>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.expandedHeader}>
          <Pressable
            onPress={() => onSeasonExpandedChange(null)}
            style={({ pressed }) => [styles.expandedPoster, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Collapse season"
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
              />
            ) : null}
          </Pressable>

          <View style={styles.expandedInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.expandedTitle} numberOfLines={1}>
                {`Season ${season.season_number}`}
              </Text>
              {season.avg_rating !== null && tier ? (
                <View style={[styles.ratingBadge, { backgroundColor: tier.color }]}>
                  <Text style={[styles.ratingValue, { color: tier.textColor }]}>
                    {formatRatingValue(season.avg_rating)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={styles.cardEpisodes}
            >{`${season.episode_count} Episodes`}</Text>

            <WatchProgress
              watched={season.watched_count}
              total={season.episode_count}
              width={CARD_WIDTH}
            />

            <Pressable
              onPress={handleLogSeason}
              disabled={logSeason.isPending || isFullyWatched}
              style={({ pressed }) => [
                styles.logSeasonButton,
                isFullyWatched && styles.logSeasonButtonFilled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log entire season"
            >
              {logSeason.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={isFullyWatched ? 'checkmark-circle' : 'eye-outline'}
                    size={14}
                    color={isFullyWatched ? Colors.background : Colors.white}
                  />
                  <Text
                    style={[
                      styles.logSeasonLabel,
                      isFullyWatched && styles.logSeasonLabelFilled,
                    ]}
                  >
                    {isFullyWatched ? 'Season watched' : 'Log entire season'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {nextSeason !== undefined ? (
            <Pressable
              onPress={() => onSeasonExpandedChange(nextSeason)}
              style={({ pressed }) => [styles.nextSeason, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Go to season ${nextSeason}`}
            >
              <Ionicons name="chevron-forward" size={16} color={Colors.white} />
              <Text style={styles.nextSeasonLabel}>Next season</Text>
            </Pressable>
          ) : null}
        </View>
      </GestureDetector>

      {episodesQ.isLoading ? (
        <ActivityIndicator color={Colors.white} style={styles.episodesLoader} />
      ) : (
        <View style={styles.episodeList}>
          {(episodesQ.data ?? []).map((episode) => (
            <EpisodeListItem
              key={episode.id}
              episode={episode}
              onLogPress={(ep) => onEpisodeLogPress(season.season_number, ep)}
              onPress={(ep) => onEpisodePress(season.season_number, ep)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 12,
  },
  sectionCount: {
    fontFamily: FontFamily.black,
    color: Colors.white,
  },
  carouselContent: {
    paddingHorizontal: SCREEN_PADDING,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
  cardPoster: {
    width: CARD_WIDTH,
    height: CARD_POSTER_HEIGHT,
    borderRadius: Radius.poster,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    flexShrink: 1,
  },
  cardEpisodes: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    marginTop: 2,
  },
  ratingBadge: {
    minWidth: 25,
    height: 25,
    borderRadius: Radius.poster,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 8,
  },
  progress: {
    height: 25,
    borderRadius: Radius.poster,
    backgroundColor: '#1b1b1b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
    marginTop: 8,
  },
  progressLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 7,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  progressTotal: {
    color: Colors.textMuted,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 100,
    backgroundColor: '#d9d9d9',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 100,
    backgroundColor: Colors.accentBlue,
  },
  expandedHeader: {
    flexDirection: 'row',
    paddingHorizontal: SCREEN_PADDING,
    gap: 14,
  },
  expandedPoster: {
    width: EXPANDED_POSTER_WIDTH,
    height: EXPANDED_POSTER_HEIGHT,
    borderRadius: Radius.poster,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  expandedInfo: {
    flex: 1,
  },
  expandedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    flexShrink: 1,
  },
  logSeasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  logSeasonButtonFilled: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  logSeasonLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  logSeasonLabelFilled: {
    color: Colors.background,
  },
  nextSeason: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
  },
  nextSeasonLabel: {
    fontFamily: FontFamily.light,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 4,
  },
  episodesLoader: {
    marginTop: 24,
  },
  episodeList: {
    marginTop: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
