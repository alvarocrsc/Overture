import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import {
  useFilmCredits,
  useFilmDistribution,
  useWantToWatch,
  useWatchedBy,
} from '@/src/hooks/useFilmDetail';
import type { FilmDetail } from '@/src/types/film.types';
import FilmDistributionChart from './FilmDistributionChart';
import FilmLogRow from './FilmLogRow';
import WatchedByCarousel from './WatchedByCarousel';
import WantToWatchCarousel from './WantToWatchCarousel';
import CastCrewGenresTabs from './CastCrewGenresTabs';

interface FilmAboutTabProps {
  film: FilmDetail;
  onPressLogMore: () => void;
  onPressUser: (userId: number) => void;
}

const OVERVIEW_PREVIEW_LINES = 4;

/**
 * Composition of the "About" tab content: tagline + expandable overview,
 * distribution chart, the user's own log row (if logged), the watched-by /
 * want-to-watch carousels, and the cast/crew/genres switcher.
 */
export default function FilmAboutTab({
  film,
  onPressLogMore,
  onPressUser,
}: FilmAboutTabProps): React.JSX.Element {
  const { user } = useAuth();
  const tmdbId = film.tmdb_id;

  const distributionQ = useFilmDistribution(tmdbId);
  const creditsQ = useFilmCredits(tmdbId);
  const watchedByQ = useWatchedBy(tmdbId);
  const wantToWatchQ = useWantToWatch(tmdbId);

  const [overviewExpanded, setOverviewExpanded] = useState<boolean>(false);

  return (
    <View style={styles.container}>
      {film.tagline ? (
        <Text style={styles.tagline} numberOfLines={2}>
          {film.tagline}
        </Text>
      ) : null}

      {film.overview ? (
        <Pressable
          onPress={() => setOverviewExpanded((v) => !v)}
          style={styles.overviewWrap}
        >
          <Text
            style={styles.overview}
            numberOfLines={overviewExpanded ? undefined : OVERVIEW_PREVIEW_LINES}
          >
            {film.overview}
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

      {film.is_logged && user ? (
        <FilmLogRow
          logCount={film.user_log_count}
          latestRating={film.user_rating}
          avatarUrl={user.avatar_url}
          username={user.username}
          kind="film"
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
        genres={film.genres}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
  tagline: {
    marginTop: 16,
    paddingHorizontal: 20,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  overviewWrap: {
    paddingHorizontal: 20,
    marginTop: 12,
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
