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
import { useFilmDetail, useFilmImages } from '@/src/hooks/useFilmDetail';
import { useFilmActions } from '@/src/hooks/useFilmActions';
import { useWatchlistToggle } from '@/src/hooks/useWatchlist';
import FilmHeader from '@/src/components/film/FilmHeader';
import FilmAboutTab from '@/src/components/film/FilmAboutTab';
import FilmActionDrawer from '@/src/components/film/FilmActionDrawer';
import PosterBackdropPicker from '@/src/components/film/PosterBackdropPicker';
import TrailerTab from '@/src/components/film/TrailerTab';
import PhotosTab from '@/src/components/film/PhotosTab';
import type { FilmTabKey } from '@/src/components/film/TabPills';

interface FilmDetailScreenProps {
  /** When provided, used instead of the route's `useLocalSearchParams`. */
  tmdbId?: number;
  /** When provided, overrides `router.back()` for the header back chevron. */
  onPressBack?: () => void;
}

/**
 * Film detail screen. Composes the header, the active sub-tab (About /
 * Trailer / Photos), and the action drawer.
 *
 * Renders both as a route (`/film/[tmdbId]`) and as an overlay layer on top
 * of presented overlays — in the overlay case `tmdbId` and `onPressBack`
 * are passed in as props.
 */
export default function FilmDetailScreen(
  { tmdbId: tmdbIdProp, onPressBack }: FilmDetailScreenProps = {},
): React.JSX.Element {
  const params = useLocalSearchParams<{ tmdbId: string }>();
  const paramTmdbIdNum = Number(params.tmdbId);
  const paramTmdbId = Number.isFinite(paramTmdbIdNum) ? paramTmdbIdNum : undefined;
  const tmdbId = tmdbIdProp ?? paramTmdbId;

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilmTabKey>('about');
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [appearanceVisible, setAppearanceVisible] = useState<boolean>(false);

  const filmQ = useFilmDetail(tmdbId);
  const imagesQ = useFilmImages(tmdbId);
  const actions = useFilmActions(tmdbId ?? 0);
  const watchlist = useWatchlistToggle(tmdbId ?? 0, 'film', {
    inWatchlist: filmQ.data?.is_in_watchlist ?? false,
    watchlistId: filmQ.data?.watchlist_id ?? null,
  });

  if (tmdbId == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Invalid film id.</Text>
      </View>
    );
  }

  if (filmQ.isLoading || !filmQ.data) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (filmQ.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Could not load film.</Text>
      </View>
    );
  }

  const film = filmQ.data;

  const handleWatchlist = (): void => {
    watchlist.toggle();
  };

  const handleToggleLogged = (): void => {
    if (film.is_logged) {
      return;
    }
    actions.logFilm.mutate({ value: film.user_rating ?? 0 });
  };

  const handleChangeRating = (value: number): void => {
    actions.logFilm.mutate({ value });
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
        tmdbId: String(film.tmdb_id),
        mediaType: 'film',
        title: film.title,
        year: film.release_date ? film.release_date.slice(0, 4) : '',
        director: film.director ?? '',
        posterPath: film.poster_path ?? '',
        backdrops: JSON.stringify(backdrops),
      },
    });
  };

  const handleToggleLiked = (): void => {
    if (film.is_liked) {
      actions.unlikeFilm.mutate();
    } else {
      actions.likeFilm.mutate();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FilmHeader
          film={film}
          images={imagesQ.data}
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
          <FilmAboutTab
            film={film}
            onPressLogMore={() => setDrawerVisible(true)}
            onPressUser={(_userId) => {
              // Profile navigation will be wired in stage 3.
            }}
          />
        ) : null}

        {activeTab === 'trailer' ? <TrailerTab tmdbId={tmdbId} /> : null}

        {activeTab === 'photos' ? <PhotosTab images={imagesQ.data} /> : null}
      </ScrollView>

      <FilmActionDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        film={film}
        images={imagesQ.data}
        onToggleLogged={handleOpenLogFlow}
        onChangeRating={handleChangeRating}
        onToggleLiked={handleToggleLiked}
        onAddToList={() => {
          // Add-to-list flow yet to implement
        }}
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
        currentPosterPath={film.custom_poster_path}
        currentBackdropPath={film.custom_backdrop_path}
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
