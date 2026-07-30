import React, { useMemo, useState } from 'react';
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
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import { useAuth } from '@/src/context/AuthContext';
import { useWatchlistItems } from '@/src/hooks/useWatchlist';
import { normalizeWatchlistItems } from '@/src/utils/watchlist-item.utils';
import { ListHeader } from '@/src/components/lists/ListHeader';
import { ListFilters } from '@/src/components/lists/ListFilters';
import { PostersGrid } from '@/src/components/lists/PostersGrid';
import { ExpandedList } from '@/src/components/lists/ExpandedList';
import type {
  ListDetail,
  ListViewMode,
  NormalizedListItem,
} from '@/src/types/lists.types';

/**
 * Watchlist screen (`/watchlist`). Renders the signed-in user's watchlist with
 * the exact same layout, styling and functionality as the list detail screen
 * (`/list/[id]`): the shared header (collage, title, count, creator card and
 * interactions bar), the filter bar, and the posters / expanded view toggle.
 *
 * The watchlist has no list row of its own, so a `ListDetail` is synthesized
 * from the current user — the watchlist reads as a normal list they own.
 */
export default function WatchlistScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const watchlistQ = useWatchlistItems();

  const [viewMode, setViewMode] = useState<ListViewMode>('posters');

  const items = useMemo<NormalizedListItem[]>(
    () => (watchlistQ.data ? normalizeWatchlistItems(watchlistQ.data) : []),
    [watchlistQ.data],
  );

  // Present the watchlist as a list owned by the current user so the shared
  // ListHeader can render it unchanged. It cannot be liked, commented on or
  // shared, so those counts are zero and their actions are inert.
  const list = useMemo<ListDetail | null>(() => {
    if (!user) return null;
    return {
      id: -1,
      title: 'Watchlist',
      description: null,
      icon_url: null,
      view_mode: 'posters',
      is_public: 0,
      is_ranked: 0,
      items_count: items.length,
      created_at: '',
      updated_at: '',
      owner_id: user.id,
      owner_username: user.username,
      owner_name: null,
      owner_avatar: user.avatar_url,
      likes_count: 0,
      is_liked: 0,
      comments_count: 0,
      items: [],
    };
  }, [user, items.length]);

  const handleItemPress = (item: NormalizedListItem): void => {
    router.push(
      item.mediaType === 'film'
        ? `/film/${item.tmdbId}`
        : `/series/${item.tmdbId}`,
    );
  };

  const handleBack = (): void => router.back();

  const headerComponent = useMemo(() => {
    if (!list) return null;
    return (
      <View style={styles.headerWrap}>
        <ListHeader
          list={list}
          items={items}
          // A watchlist has no social actions — render the bar identically to a
          // list, but leave every control inert.
          onLikePress={() => undefined}
          onCommentPress={() => undefined}
          onSharePress={() => undefined}
          onOwnerPress={() => undefined}
        />
        <ListFilters
          viewMode={viewMode}
          onViewModeToggle={() =>
            setViewMode((m) => (m === 'posters' ? 'expanded' : 'posters'))
          }
        />
      </View>
    );
  }, [list, items, viewMode]);

  const contentPadding = {
    paddingTop: insets.top + 8,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 100,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {watchlistQ.isLoading || !list ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : watchlistQ.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>Could not load your watchlist.</Text>
        </View>
      ) : viewMode === 'expanded' ? (
        <ExpandedList
          items={items}
          isRanked={false}
          onItemPress={handleItemPress}
          ListHeaderComponent={headerComponent}
          contentContainerStyle={contentPadding}
        />
      ) : (
        <PostersGrid
          items={items}
          isRanked={false}
          onItemPress={handleItemPress}
          ListHeaderComponent={headerComponent}
          contentContainerStyle={contentPadding}
        />
      )}

      <Pressable
        onPress={handleBack}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 6 }]}
      >
        <Ionicons name="chevron-back" size={26} color={Colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  error: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  headerWrap: {
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
});
