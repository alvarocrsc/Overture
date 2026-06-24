import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  FontFamily,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import { useListDetail, useLikeList } from '@/src/hooks/use-lists';
import { normalizeListItems } from '@/src/utils/list-item.utils';
import { ListHeader } from '@/src/components/lists/ListHeader';
import { ListFilters } from '@/src/components/lists/ListFilters';
import { PostersGrid } from '@/src/components/lists/PostersGrid';
import { ExpandedList } from '@/src/components/lists/ExpandedList';
import type { ListViewMode, NormalizedListItem } from '@/src/types/lists.types';

/**
 * List detail screen (`/list/[id]`). Renders a list's header, filter bar and
 * its items in either a posters grid or an expanded trailer feed, toggled by
 * the user and seeded from the list's saved `view_mode`.
 */
export default function ListDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  const listIdNum = Number(params.id);
  const listId = Number.isFinite(listIdNum) ? listIdNum : null;

  const insets = useSafeAreaInsets();
  const listQ = useListDetail(listId);
  const like = useLikeList(listId ?? 0);

  const [viewMode, setViewMode] = useState<ListViewMode>('posters');

  // Seed the view mode from the list's saved preference once it loads.
  useEffect(() => {
    if (listQ.data) setViewMode(listQ.data.view_mode);
  }, [listQ.data]);

  const items = useMemo<NormalizedListItem[]>(
    () => (listQ.data ? normalizeListItems(listQ.data.items) : []),
    [listQ.data],
  );

  const handleItemPress = (item: NormalizedListItem): void => {
    router.push(
      item.mediaType === 'film'
        ? `/film/${item.tmdbId}`
        : `/series/${item.tmdbId}`,
    );
  };

  const handleBack = (): void => router.back();

  const list = listQ.data;

  const headerComponent = useMemo(() => {
    if (!list) return null;
    return (
      <View style={styles.headerWrap}>
        <ListHeader
          list={list}
          items={items}
          onLikePress={() => like.toggle(list.is_liked === 1)}
          // TODO(list-comments): open the list comments screen when it ships.
          onCommentPress={() => undefined}
          // TODO(list-share): wire up native share when implemented.
          onSharePress={() => undefined}
          // TODO(list-owner): navigate to the owner's profile when available.
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
    // `like` is stable enough for this memo; re-run on the values that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, items, viewMode]);

  if (listId == null) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.error}>Invalid list id.</Text>
      </View>
    );
  }

  const contentPadding = {
    paddingTop: insets.top + 8,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 100,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {listQ.isLoading || !list ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : listQ.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>Could not load list.</Text>
        </View>
      ) : viewMode === 'expanded' ? (
        <ExpandedList
          items={items}
          isRanked={list.is_ranked === 1}
          onItemPress={handleItemPress}
          ListHeaderComponent={headerComponent}
          contentContainerStyle={contentPadding}
        />
      ) : (
        <PostersGrid
          items={items}
          isRanked={list.is_ranked === 1}
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
