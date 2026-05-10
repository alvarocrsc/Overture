import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import LogSearchBar from '@/src/components/log/LogSearchBar';
import MediaSearchItem from '@/src/components/log/MediaSearchItem';
import { Colors, FontFamily, Spacing } from '@/src/lib/colors';
import { useSearchFilms, useTopRatedFilms, type FilmResult } from '@/src/hooks/useFilms';
import type { FilmSearchResult } from '@/src/types/search.types';

interface FavoritesEditorDrawerProps {
  visible: boolean;
  targetPosition: number;
  onClose: () => void;
  onFilmSelected: (film: FilmResult, position: number) => void;
}

/**
 * Bottom-sheet drawer that lets the profile owner pick a film for one
 * of the 4 favorite slots. Defaults to top-rated films; switches to
 * search results when the user types 2+ characters.
 */
export default function FavoritesEditorDrawer({
  visible,
  targetPosition,
  onClose,
  onFilmSelected,
}: FavoritesEditorDrawerProps): React.JSX.Element {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.82;

  const translateY = useSharedValue(DRAWER_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearching = debouncedQuery.trim().length >= 2;
  const topRated = useTopRatedFilms();
  const search = useSearchFilms(isSearching ? debouncedQuery : '');
  const activeQuery = isSearching ? search : topRated;

  const films = useMemo<FilmResult[]>(
    () => activeQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [activeQuery.data],
  );

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = DRAWER_HEIGHT;
      backdropOpacity.value = 0;
      setQuery('');
      setDebouncedQuery('');
    }
  }, [visible, DRAWER_HEIGHT, translateY, backdropOpacity]);

  const closeDrawer = useCallback(() => {
    translateY.value = withSpring(DRAWER_HEIGHT, { damping: 20, stiffness: 200 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [DRAWER_HEIGHT, translateY, backdropOpacity, onClose]);

  const handleSearch = useCallback((text: string): void => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 400);
  }, []);

  const handleClear = useCallback((): void => {
    setQuery('');
    setDebouncedQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleLoadMore = useCallback((): void => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      void activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

  const handleFilmPress = useCallback(
    (film: FilmResult): void => {
      onFilmSelected(film, targetPosition);
      closeDrawer();
    },
    [onFilmSelected, targetPosition, closeDrawer],
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DRAWER_HEIGHT * 0.25 || e.velocityY > 800) {
        runOnJS(closeDrawer)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={closeDrawer}>
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.drawer, { height: DRAWER_HEIGHT }, drawerStyle]}>
          <View style={styles.dragHandle} />

          <Text style={styles.title}>
            {'Add to slot '}
            <Text style={styles.titleAccent}>{`#${targetPosition}`}</Text>
          </Text>

          <View style={styles.searchWrap}>
            <LogSearchBar
              value={query}
              onChangeText={handleSearch}
              onClear={handleClear}
              autoFocus
            />
          </View>

          <FlatList
            data={films}
            keyExtractor={(item) => String(item.tmdb_id)}
            renderItem={({ item }) => {
              const adapted: FilmSearchResult = {
                type: 'film',
                tmdbId: item.tmdb_id,
                title: item.title,
                posterPath: item.poster_path,
                year: null,
                director: null,
              };
              return (
                <MediaSearchItem
                  item={adapted}
                  onPress={() => handleFilmPress(item)}
                  onLogPress={() => handleFilmPress(item)}
                  onWatchlistPress={() => handleFilmPress(item)}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              activeQuery.isFetchingNextPage ? (
                <ActivityIndicator color={Colors.accentBlue} style={styles.footer} />
              ) : null
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
          />
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: Spacing.screenH,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.progressTrack,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  titleAccent: {
    fontFamily: FontFamily.extraBold,
    color: Colors.accentBlue,
  },
  searchWrap: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
  separator: {
    height: 12,
  },
  footer: {
    paddingVertical: 16,
  },
});
