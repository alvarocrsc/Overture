import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import {
  useSeriesCredits,
  useSeriesDistribution,
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
import LogEpisodeDrawerContent from '@/src/components/series/log-episode-drawer-content';
import BottomDrawer from '@/src/components/drawers/bottom-drawer';
import { useCreateEpisodeRating } from '@/src/hooks/use-episode-ratings';
import { backdropUrl } from '@/src/lib/tmdb';
import type {
  CreateEpisodeRatingPayload,
  EpisodeListRow,
  RatingSource,
} from '@/src/types/episode-ratings.types';

interface SeriesAboutTabProps {
  series: SeriesDetail;
  onPressLogMore: () => void;
  onPressUser: (userId: number) => void;
}

/** The episode the log drawer is currently open for. */
interface EpisodeLogTarget {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  value: number | null;
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

  const [overviewExpanded, setOverviewExpanded] = useState<boolean>(false);

  // `source` is lifted here rather than owned by the ratings section: the switch
  // lives in that section visually, but the seasons carousel reads from it too,
  // so both stay in sync off a single piece of state.
  const [source, setSource] = useState<RatingSource>(user ? 'user' : 'app');
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodeToLog, setEpisodeToLog] = useState<EpisodeLogTarget | null>(null);

  const createEpisodeRating = useCreateEpisodeRating(tmdbId);

  const handleEpisodeCellPress = (
    seasonNumber: number,
    episodeNumber: number,
  ): void => {
    setEpisodeToLog({ seasonNumber, episodeNumber, name: null, value: null });
  };

  const handleEpisodeLogPress = (
    seasonNumber: number,
    episode: EpisodeListRow,
  ): void => {
    setEpisodeToLog({
      seasonNumber,
      episodeNumber: episode.episode_number,
      name: episode.name,
      value: episode.value,
    });
  };

  const handleEpisodePress = (
    seasonNumber: number,
    episode: EpisodeListRow,
  ): void => {
    // TODO(episode-detail): navigate to the episode detail screen once designed.
    // Until it exists, tapping a row opens the same log flow as its button.
    handleEpisodeLogPress(seasonNumber, episode);
  };

  const handleSaveEpisodeLog = (
    payload: Omit<CreateEpisodeRatingPayload, 'tmdb_series_id'>,
  ): void => {
    createEpisodeRating.mutate(
      { ...payload, tmdb_series_id: tmdbId },
      { onSuccess: () => setEpisodeToLog(null) },
    );
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
        <WatchedByCarousel rows={watchedByQ.data} onPressUser={onPressUser} />
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

      <BottomDrawer
        visible={episodeToLog !== null}
        onClose={() => setEpisodeToLog(null)}
        backdropImageUri={backdropUrl(series.backdrop_path, 'w1280')}
        logoUri={null}
        titleFallback={series.title}
        showDoneButton={false}
      >
        {episodeToLog ? (
          <LogEpisodeDrawerContent
            seasonNumber={episodeToLog.seasonNumber}
            episodeNumber={episodeToLog.episodeNumber}
            episodeName={episodeToLog.name}
            initialValue={episodeToLog.value}
            isSaving={createEpisodeRating.isPending}
            onSave={handleSaveEpisodeLog}
          />
        ) : null}
      </BottomDrawer>
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
