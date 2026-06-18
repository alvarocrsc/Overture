import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import {
  useSeriesCredits,
  useSeriesDetail,
  useSeriesImages,
} from '@/src/hooks/useSeriesDetail';
import { useSeriesActions } from '@/src/hooks/useSeriesActions';
import { useWatchlistToggle } from '@/src/hooks/useWatchlist';
import SeriesHeader from '@/src/components/series/SeriesHeader';
import SeriesAboutTab from '@/src/components/series/SeriesAboutTab';
import SeriesActionDrawer from '@/src/components/series/SeriesActionDrawer';
import SeriesTrailerTab from '@/src/components/series/SeriesTrailerTab';
import PosterBackdropPicker from '@/src/components/film/PosterBackdropPicker';
import PhotosTab from '@/src/components/film/PhotosTab';
import type { FilmTabKey } from '@/src/components/film/TabPills';

interface SeriesDetailScreenProps {
  /** When provided, used instead of the route's `useLocalSearchParams`. */
  tmdbId?: number;
  /** When provided, overrides `router.back()` for the header back chevron. */
  onPressBack?: () => void;
}

/**
 * Series detail screen. Mirrors the film detail screen but pulls from the
 * series endpoints and shows a creator label instead of director.
 *
 * Renders both as a route (`/series/[tmdbId]`) and as an overlay layer on
 * top of presented overlays — in the overlay case `tmdbId` and
 * `onPressBack` are passed in as props.
 */
export default function SeriesDetailScreen(
  { tmdbId: tmdbIdProp, onPressBack }: SeriesDetailScreenProps = {},
): React.JSX.Element {
  const params = useLocalSearchParams<{ tmdbId: string }>();
  const paramTmdbIdNum = Number(params.tmdbId);
  const paramTmdbId = Number.isFinite(paramTmdbIdNum) ? paramTmdbIdNum : undefined;
  const tmdbId = tmdbIdProp ?? paramTmdbId;

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilmTabKey>('about');
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [appearanceVisible, setAppearanceVisible] = useState<boolean>(false);

  const seriesQ = useSeriesDetail(tmdbId);
  const imagesQ = useSeriesImages(tmdbId);
  const creditsQ = useSeriesCredits(tmdbId);
  const actions = useSeriesActions(tmdbId ?? 0);
  const watchlist = useWatchlistToggle(tmdbId ?? 0, 'series', {
    inWatchlist: seriesQ.data?.is_in_watchlist ?? false,
    watchlistId: seriesQ.data?.watchlist_id ?? null,
  });

  if (tmdbId == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Invalid series id.</Text>
      </View>
    );
  }

  if (seriesQ.isLoading || !seriesQ.data) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (seriesQ.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Could not load series.</Text>
      </View>
    );
  }

  const series = seriesQ.data;
  const creator = creditsQ.data?.directors[0]?.person_name ?? null;

  const handleWatchlist = (): void => {
    watchlist.toggle();
  };

  const handleToggleLogged = (): void => {
    if (series.is_logged) {
      return;
    }
    actions.logSeries.mutate({ value: series.user_rating ?? 0 });
  };

  const handleChangeRating = (value: number): void => {
    actions.logSeries.mutate({ value });
  };

  const handleToggleLiked = (): void => {
    if (series.is_liked) {
      actions.unlikeSeries.mutate();
    } else {
      actions.likeSeries.mutate();
    }
  };

  const handleOpenLogFlow = (): void => {
    setDrawerVisible(false);
    const allBackdrops = [
      ...(imagesQ.data?.cleanBackdrops ?? []),
      ...(imagesQ.data?.titledBackdrops ?? []),
    ];
    const backdrops = allBackdrops.slice(0, 10).map((b) => b.file_path);
    router.push({
      pathname: '/log/rating',
      params: {
        tmdbId: String(series.tmdb_id),
        mediaType: 'series',
        title: series.title,
        year: series.first_air_date
          ? series.first_air_date.slice(0, 4)
          : '',
        director: creator ?? '',
        posterPath: series.poster_path ?? '',
        backdrops: JSON.stringify(backdrops),
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SeriesHeader
          series={series}
          images={imagesQ.data}
          creator={creator}
          topInset={insets.top}
          activeTab={activeTab}
          isInWatchlist={watchlist.inWatchlist}
          onPressBack={onPressBack}
          onChangeTab={setActiveTab}
          onPressLog={handleOpenLogFlow}
          onPressWatchlist={handleWatchlist}
          onPressMore={() => setDrawerVisible(true)}
        />

        {activeTab === 'about' ? (
          <SeriesAboutTab
            series={series}
            onPressLogMore={() => setDrawerVisible(true)}
            onPressUser={(_userId) => {
              // Profile navigation will be wired separately.
            }}
          />
        ) : null}

        {activeTab === 'trailer' ? <SeriesTrailerTab /> : null}

        {activeTab === 'photos' ? <PhotosTab images={imagesQ.data} /> : null}
      </ScrollView>

      <SeriesActionDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        series={series}
        images={imagesQ.data}
        onToggleLogged={handleOpenLogFlow}
        onChangeRating={handleChangeRating}
        onToggleLiked={handleToggleLiked}
        onChangeAppearance={() => {
          setDrawerVisible(false);
          setAppearanceVisible(true);
        }}
      />

      <PosterBackdropPicker
        visible={appearanceVisible}
        onClose={() => setAppearanceVisible(false)}
        images={imagesQ.data}
        isLoading={imagesQ.isLoading}
        currentPosterPath={series.custom_poster_path}
        currentBackdropPath={series.custom_backdrop_path}
        onSelectPoster={(path) =>
          actions.updateDisplayPrefs.mutate({ custom_poster_path: path })
        }
        onSelectBackdrop={(path) =>
          actions.updateDisplayPrefs.mutate({ custom_backdrop_path: path })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
});
