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

  const [overviewExpanded, setOverviewExpanded] = useState<boolean>(false);

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
