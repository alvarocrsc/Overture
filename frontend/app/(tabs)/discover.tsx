import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  FontFamily,
  Spacing,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import SectionHeader from '@/src/components/home/SectionHeader';
import DiscoverSearchBar from '@/src/components/discover/DiscoverSearchBar';
import SuggestionGrid from '@/src/components/discover/SuggestionGrid';
import TrendingCarousel from '@/src/components/discover/TrendingCarousel';
import type { TrendingFilm } from '@/src/components/discover/TrendingCard';
import { useTrending } from '@/src/hooks/useTrending';

/**
 * Discover screen — entry point for finding new content. Top section hosts
 * a tap-to-navigate search bar and four "Some suggestions" recommendation
 * cards; below that is a horizontally-scrolling "Trending this week"
 * carousel sourced from TMDB via the backend.
 */
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { data: trendingRaw, isLoading: trendingLoading } = useTrending('films');

  // Tapping the search bar must NOT open a keyboard — it routes to the
  // dedicated Search (Log) tab where the actual TextInput lives.
  function handleSearchPress() {
    router.push('/(tabs)/log');
  }

  function handleNotificationPress() {
    // TODO: route to a notifications screen once implemented.
  }

  function handleCardPress(_film: TrendingFilm) {
    // TODO: route to a film detail screen once implemented.
  }

  function handleWatchlistPress(_film: TrendingFilm) {
    // TODO: wire to POST /watchlist once watchlist mutations are implemented.
  }

  // Director requires an additional per-film credits call — leave null for
  // now so TrendingCard skips the director line. The trailer key is fetched
  // per card by `useFilmTrailer`, so we don't need to thread it through here.
  const trendingFilms: TrendingFilm[] = (trendingRaw ?? []).map((f) => ({
    tmdb_id: f.tmdb_id,
    title: f.title,
    overview: f.overview,
    backdrop_path: f.backdrop_path,
    poster_path: f.poster_path,
    release_date: f.release_date,
    tmdb_rating: f.tmdb_rating,
    director: null,
  }));

  // Reuse the trending poster_paths to populate the suggestion-card collages.
  const suggestionPosters = trendingFilms
    .map((f) => f.poster_path)
    .filter((p): p is string => Boolean(p));

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 32 },
        ]}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Pressable
            onPress={handleNotificationPress}
            hitSlop={12}
            style={styles.bellButton}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.white}
            />
          </Pressable>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchWrapper}>
          <DiscoverSearchBar onPress={handleSearchPress} />
        </View>

        {/* ── Some suggestions ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Some suggestions"
            titleAccent="suggestions"
            subtitle="A few films we think you'll like"
          />
          <SuggestionGrid posterPaths={suggestionPosters} />
        </View>

        {/* ── Trending this week ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending this week"
            titleAccent="Trending"
            subtitle="What everyone is watching right now"
            onSeeAll={() => {}}
          />
          <TrendingCarousel
            films={trendingFilms}
            loading={trendingLoading}
            onCardPress={handleCardPress}
            onWatchlistPress={handleWatchlistPress}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: -2,
    lineHeight: 36,
  },
  bellButton: {
    padding: 4,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.screenH,
    marginBottom: 4,
  },
  section: {
    marginTop: 16,
  },
});
