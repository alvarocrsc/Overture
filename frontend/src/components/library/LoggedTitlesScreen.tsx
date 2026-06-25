import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  FontFamily,
  LetterSpacing,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import { useAuth } from '@/src/context/AuthContext';
import { useLoggedTitles } from '@/src/hooks/useLoggedTitles';
import { ListFilters } from '@/src/components/lists/ListFilters';
import { LoggedPostersGrid } from '@/src/components/library/LoggedPostersGrid';
import type { LoggedTitle } from '@/src/types/library.types';
import type { ListViewMode, MediaType } from '@/src/types/lists.types';

/** Per-media-type display copy. */
const COPY: Record<MediaType, { title: string; empty: string }> = {
  film: { title: 'Films', empty: 'No films logged yet.' },
  series: { title: 'Series', empty: 'No series logged yet.' },
};

interface LoggedTitlesScreenProps {
  mediaType: MediaType;
}

/**
 * The signed-in user's logged Films / Series library. Shares the list
 * "posters" layout — a filter bar (stubbed) and view-mode toggle (deferred)
 * above a poster grid where each poster shows the rating plus like / review
 * icons. Tapping a title opens the user's review of it when one exists, or the
 * title's page otherwise.
 */
export function LoggedTitlesScreen({
  mediaType,
}: LoggedTitlesScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const copy = COPY[mediaType];

  const query = useLoggedTitles(user?.id, mediaType);
  const items = query.data ?? [];

  // View mode is stubbed at "posters"; the toggle is wired but inert until the
  // expanded view ships. The filter chips are likewise non-functional for now.
  const [viewMode] = useState<ListViewMode>('posters');

  const handleItemPress = useCallback((item: LoggedTitle): void => {
    if (item.reviewId != null) {
      router.push({
        pathname: '/review/[id]',
        params: { id: String(item.reviewId) },
      });
      return;
    }
    router.push({
      pathname: item.mediaType === 'film' ? '/film/[tmdbId]' : '/series/[tmdbId]',
      params: { tmdbId: String(item.tmdbId) },
    } as never);
  }, []);

  const handleEndReached = useCallback((): void => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  // Clear the floating tab bar, which sits at `insets.bottom + offset` and is
  // `TAB_BAR_HEIGHT` tall, plus a little breathing room beneath the last row.
  const contentPadding = {
    paddingTop: 4,
    paddingBottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT + 24,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </Pressable>
        <Text style={styles.title}>{copy.title}</Text>
      </View>

      <View style={styles.filtersWrap}>
        <ListFilters
          viewMode={viewMode}
          // TODO(library-view-mode): switch to the expanded view when it ships.
          onViewModeToggle={() => undefined}
        />
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Could not load your {copy.title.toLowerCase()}.</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{copy.empty}</Text>
        </View>
      ) : (
        <LoggedPostersGrid
          items={items}
          onItemPress={handleItemPress}
          onEndReached={handleEndReached}
          isFetchingNextPage={query.isFetchingNextPage}
          contentContainerStyle={contentPadding}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  filtersWrap: {
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
