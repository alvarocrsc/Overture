import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import {
  useSeriesCredits,
  useSeriesDistribution,
  useSeriesImages,
  useSeriesWantToWatch,
  useSeriesWatchedBy,
} from '@/src/hooks/useSeriesDetail';
import type { SeriesDetail } from '@/src/types/series.types';
import FilmDistributionChart from '@/src/components/film/FilmDistributionChart';
import FilmLogRow from '@/src/components/film/FilmLogRow';
import WatchedByCarousel from '@/src/components/film/WatchedByCarousel';
import WantToWatchCarousel from '@/src/components/film/WantToWatchCarousel';
import CastCrewGenresTabs from '@/src/components/film/CastCrewGenresTabs';
import EpisodeRatingsSection from '@/src/components/series/EpisodeRatingsSection';
import SeasonsCarousel from '@/src/components/series/SeasonsCarousel';
import type {
  EpisodeListRow,
  RatingSource,
} from '@/src/types/episode-ratings.types';

interface SeriesAboutTabProps {
  series: SeriesDetail;
  onPressLogMore: () => void;
  onPressUser: (userId: number) => void;
}

const OVERVIEW_PREVIEW_LINES = 4;

export default function SeriesAboutTab({
  series,
  onPressLogMore,
  onPressUser,
}: SeriesAboutTabProps): React.JSX.Element {
  const { user } = useAuth();
  const tmdbId = series.tmdb_id;

  const distributionQ = useSeriesDistribution(tmdbId);
  const creditsQ = useSeriesCredits(tmdbId);
  const watchedByQ = useSeriesWatchedBy(tmdbId);
  const wantToWatchQ = useSeriesWantToWatch(tmdbId);
  // Same query key the series screen already uses, so this is served from cache
  // rather than costing a second request.
  const imagesQ = useSeriesImages(tmdbId);

  const [overviewExpanded, setOverviewExpanded] = useState<boolean>(false);

  // `source` is lifted here rather than owned by the ratings section: the switch
  // lives in that section visually, but the seasons carousel reads from it too,
  // so both stay in sync off a single piece of state.
  const [source, setSource] = useState<RatingSource>(user ? 'user' : 'app');
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);

  /**
   * Opens the shared rating flow for one episode. Episodes go through the same
   * two screens as films and whole series — rating, then review — with the
   * season and episode carried along so the details screen knows to log an
   * episode rather than the series itself.
   */
  const openEpisodeLog = (
    seasonNumber: number,
    episodeNumber: number,
    episodeName: string | null,
    stillPath: string | null,
  ): void => {
    // The episode's own still leads, since it is the image most likely to be
    // wanted for that review, followed by the series' backdrops.
    const seriesBackdrops = [
      ...(imagesQ.data?.cleanBackdrops ?? []),
      ...(imagesQ.data?.titledBackdrops ?? []),
    ].map((image) => image.file_path);
    const backdrops = [...(stillPath ? [stillPath] : []), ...seriesBackdrops]
      .slice(0, 10);

    router.push({
      pathname: '/log/rating',
      params: {
        tmdbId: String(series.tmdb_id),
        mediaType: 'series',
        title: episodeName ?? `Episode ${episodeNumber}`,
        year: `S${seasonNumber} · E${episodeNumber}`,
        director: series.title,
        posterPath: series.poster_path ?? '',
        seasonNumber: String(seasonNumber),
        episodeNumber: String(episodeNumber),
        backdrops: JSON.stringify(backdrops),
      },
    });
  };

  const handleEpisodeCellPress = (
    seasonNumber: number,
    episodeNumber: number,
  ): void => {
    openEpisodeLog(seasonNumber, episodeNumber, null, null);
  };

  const handleEpisodeLogPress = (
    seasonNumber: number,
    episode: EpisodeListRow,
  ): void => {
    openEpisodeLog(
      seasonNumber,
      episode.episode_number,
      episode.name,
      episode.still_path,
    );
  };

  const handleEpisodePress = (
    seasonNumber: number,
    episode: EpisodeListRow,
  ): void => {
    // TODO(episode-detail): navigate to the episode detail screen once designed.
    // Until it exists, tapping a row opens the same log flow as its button.
    handleEpisodeLogPress(seasonNumber, episode);
  };

  return (
    <View style={styles.container}>
      {series.overview ? (
        <Pressable
          onPress={() => setOverviewExpanded((v) => !v)}
          style={styles.overviewWrap}
        >
          <Text
            style={styles.overview}
            numberOfLines={overviewExpanded ? undefined : OVERVIEW_PREVIEW_LINES}
          >
            {series.overview}
            {!overviewExpanded ? (
              <Text style={styles.moreLink}> ...more</Text>
            ) : null}
          </Text>
        </Pressable>
      ) : null}

      <EpisodeRatingsSection
        tmdbId={tmdbId}
        source={source}
        onSourceChange={setSource}
        onEpisodeCellPress={handleEpisodeCellPress}
      />

      <SeasonsCarousel
        tmdbId={tmdbId}
        source={source}
        expandedSeasonNumber={expandedSeason}
        onSeasonExpandedChange={setExpandedSeason}
        onEpisodeLogPress={handleEpisodeLogPress}
        onEpisodePress={handleEpisodePress}
      />

      <View style={styles.chartWrap}>
        {distributionQ.isLoading ? (
          <ActivityIndicator color={Colors.white} />
        ) : distributionQ.data ? (
          <FilmDistributionChart
            distribution={distributionQ.data.distribution}
            average={distributionQ.data.average}
            mediaType="series"
          />
        ) : null}
      </View>

      {series.is_logged && user ? (
        <FilmLogRow
          logCount={series.user_log_count}
          latestRating={series.user_rating}
          avatarUrl={user.avatar_url}
          username={user.username}
          kind="series"
          onPressMore={onPressLogMore}
        />
      ) : null}

      {watchedByQ.data ? (
        <WatchedByCarousel
          rows={watchedByQ.data}
          mediaType="series"
          onPressUser={onPressUser}
        />
      ) : null}

      {wantToWatchQ.data ? (
        <WantToWatchCarousel
          rows={wantToWatchQ.data}
          onPressUser={onPressUser}
        />
      ) : null}

      <CastCrewGenresTabs
        cast={creditsQ.data?.cast ?? []}
        crew={creditsQ.data?.crew ?? []}
        genres={series.genres}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 60,
  },
  overviewWrap: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  overview: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'justify',
  },
  moreLink: {
    color: Colors.accentBlue,
    fontFamily: FontFamily.medium,
  },
  chartWrap: {
    marginTop: 24,
  },
});
