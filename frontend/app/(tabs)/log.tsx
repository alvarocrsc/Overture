import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as TextInputType,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  FontFamily,
  Spacing,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import LogSearchBar from '@/src/components/log/LogSearchBar';
import FilterPills, { type FilterType } from '@/src/components/log/FilterPills';
import SearchResultItem from '@/src/components/log/SearchResultItem';
import SearchSkeleton from '@/src/components/log/SearchSkeleton';
import MediaSearchItem from '@/src/components/log/MediaSearchItem';
import { useSearch } from '@/src/hooks/useSearch';
import { useRecentSearches } from '@/src/hooks/useRecentSearches';
import { useTrending, type TrendingFilmRaw } from '@/src/hooks/useTrending';
import { useWatchlistToggle } from '@/src/hooks/useWatchlist';
import { useLoggedStatus } from '@/src/hooks/useLogged';
import type { FilmSearchResult, SearchResult } from '@/src/types/search.types';

/**
 * Log screen — the dedicated search experience for films, series,
 * cast & crew, members and lists. Mirrors the "Add Screen (Dark)"
 * Figma frame: header, search bar, filter pills, recent searches
 * list (or live results when typing).
 */
export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const inputRef = useRef<TextInputType>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('media');

  const { data: results = [], isPending: searchPending } = useSearch(query, filter);
  const { data: recents, removeItem, clearAll, invalidate, recordTap } = useRecentSearches();
  const { data: trending = [] } = useTrending('films');

  // Refresh recent searches whenever the user returns to this screen
  // (e.g. after tapping a result and navigating back).
  useFocusEffect(
    useCallback(() => {
      invalidate();
    }, [invalidate]),
  );

  useEffect(() => {
    if (params.focus === 'true') {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [params.focus]);

  const isSearching = query.trim().length >= 2;

  /**
   * Navigates to the appropriate detail screen for a tapped search result.
   * Only film and series results currently have a destination route.
   */
  const navigateToResult = useCallback(
    (r: SearchResult): void => {
      if (r.type === 'film') {
        router.push({
          pathname: '/film/[tmdbId]',
          params: { tmdbId: r.tmdbId.toString() },
        } as never);
      } else if (r.type === 'series') {
        router.push({
          pathname: '/series/[tmdbId]',
          params: { tmdbId: r.tmdbId.toString() },
        } as never);
      }
    },
    [router],
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 32 },
          ]}
        >
          {/* ── Header ── */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.headerTitle}>Log</Text>
            <Pressable hitSlop={12} style={styles.bellButton}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={Colors.white}
              />
            </Pressable>
          </View>

          {/* ── Search bar ── */}
          <View style={styles.searchWrapper}>
            <LogSearchBar
              inputRef={inputRef}
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              autoFocus={params.focus === 'true'}
            />
          </View>

          {/* ── Filter pills ── */}
          <View style={styles.filtersWrapper}>
            <FilterPills selected={filter} onSelect={setFilter} />
          </View>

          {/* ── Body ── */}
          {isSearching ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Results</Text>
              </View>
              {searchPending ? (
                <SearchSkeleton filter={filter} />
              ) : results.length === 0 ? (
                <Text style={styles.empty}>No results</Text>
              ) : (
                <View style={styles.list}>
                  {results.map((r) => (
                    <SearchResultItem
                      key={`${r.type}-${itemKey(r)}`}
                      result={r}
                      onPress={() => {
                        recordTap(r);
                        navigateToResult(r);
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              {recents.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Recent searches</Text>
                    <Pressable onPress={clearAll} hitSlop={8}>
                      <Text style={styles.clearAll}>Clear</Text>
                    </Pressable>
                  </View>
                  <View style={styles.list}>
                    {recents.map((entry) => (
                      <SearchResultItem
                        key={entry.rowId}
                        result={entry.result}
                        onPress={() => {
                          recordTap(entry.result);
                          navigateToResult(entry.result);
                        }}
                        onRemove={() => removeItem(entry.rowId)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.section, recents.length > 0 ? styles.trendingSection : styles.trendingSectionFirst]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Trending this week</Text>
                </View>
                <View style={styles.list}>
                  {trending.slice(0, 20).map((film) => {
                    const item = trendingToFilmResult(film);
                    return (
                      <TrendingMediaRow
                        key={film.tmdb_id}
                        film={film}
                        item={item}
                        onPress={() => {
                          recordTap(item);
                          router.push({
                            pathname: '/film/[tmdbId]',
                            params: { tmdbId: film.tmdb_id.toString() },
                          } as never);
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Unique inner key for a search result regardless of its variant. */
function itemKey(r: SearchResult): number {
  switch (r.type) {
    case 'film':
    case 'series':
    case 'person':
      return r.tmdbId;
    case 'list':
    case 'member':
      return r.id;
  }
}

/** Adapts a trending-films API row to the FilmSearchResult shape MediaSearchItem expects. */
function trendingToFilmResult(film: TrendingFilmRaw): FilmSearchResult {
  const year = film.release_date ? film.release_date.slice(0, 4) : null;
  return {
    type: 'film',
    tmdbId: film.tmdb_id,
    title: film.title,
    posterPath: film.poster_path,
    year,
    director: film.director ?? null,
  };
}

function TrendingMediaRow({
  film,
  item,
  onPress,
}: {
  film: TrendingFilmRaw;
  item: FilmSearchResult;
  onPress: () => void;
}): React.JSX.Element {
  const watchlist = useWatchlistToggle(film.tmdb_id, 'film');
  const isLogged = useLoggedStatus(film.tmdb_id, 'film');
  const router = useRouter();

  const handleLogPress = (): void => {
    if (isLogged) return;
    router.push({
      pathname: '/log/rating',
      params: {
        tmdbId: String(item.tmdbId),
        mediaType: 'film',
        title: item.title,
        year: item.year ?? '',
        director: item.director ?? '',
        posterPath: item.posterPath ?? '',
        backdrops: JSON.stringify([]),
      },
    });
  };

  return (
    <MediaSearchItem
      item={item}
      isLogged={isLogged}
      isInWatchlist={watchlist.inWatchlist}
      onPress={onPress}
      onLogPress={handleLogPress}
      onWatchlistPress={watchlist.toggle}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
    marginBottom: 12,
  },
  filtersWrapper: {
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: Spacing.screenH,
    marginTop: 8,
  },
  trendingSection: {
    marginTop: 24,
  },
  trendingSectionFirst: {
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.white,
    letterSpacing: -1,
  },
  clearAll: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  list: {
    gap: 14,
  },
  empty: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
