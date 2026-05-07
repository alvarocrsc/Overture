import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingScreen } from '@/src/components/auth/OnboardingScreen';
import { useRegister } from '@/src/context/RegisterContext';
import { useTopRatedFilms, useSearchFilms } from '@/src/hooks/useFilms';
import type { FilmResult } from '@/src/hooks/useFilms';
import {
  Colors,
  Dimensions,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
  Spacing,
} from '@/src/lib/colors';

const HOME_ROUTE = '/home';

/**
 * Register step 5 — pick 4 favourite films.
 * Shows trending films by default with infinite lazy loading.
 * Typing in the search bar switches to debounced search results.
 * Tap a poster to toggle it in/out of the 4 slots.
 * Skip and Continue both navigate home after clearing register state.
 */
export default function RegisterFavoritesScreen(): React.JSX.Element {
  const { favoriteFilmIds, toggleFavorite, reset } = useRegister();
  const insets = useSafeAreaInsets();

  // Raw query drives the TextInput; debouncedQuery drives the search hook.
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // Starts at 0; updated to the true measured header height as soon as onLayout fires.
  const [headerHeight, setHeaderHeight] = useState(0);
  // Persists film objects for selected favorites across query switches (search ↔ top-rated).
  const [selectedFilms, setSelectedFilms] = useState<Map<number, FilmResult>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  // Shared values and scroll handler for the collapsing header animation.
  const scrollY = useSharedValue(0);
  // titleHeight drives animated styles and is kept in sync with titleHeightRef.
  const titleHeight = useSharedValue(0);
  // collapsedH and expandedH are the measured heights used for the container.
  const collapsedH = useSharedValue(0);
  const expandedH = useSharedValue(0);
  // Guards header height animation until the first scroll event fires, preventing
  // a height-0 flash on mount while expandedH is still being measured.
  const hasScrolled = useSharedValue(false);
  // Drives the Continue button opacity/translation (0 = hidden, 1 = visible).
  const continueVisible = useSharedValue(0);

  useEffect(() => {
    scrollY.value = 0;
    hasScrolled.value = false;
  }, [scrollY, hasScrolled]);

  useEffect(() => {
    continueVisible.value = withSpring(favoriteFilmIds.length === 4 ? 1 : 0, {
      damping: 18,
      stiffness: 180,
    });
  }, [favoriteFilmIds.length, continueVisible]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!hasScrolled.value) hasScrolled.value = true;
      scrollY.value = event.contentOffset.y;
    },
  });

  const titleAnimStyle = useAnimatedStyle(() => {
    const collapseDistance = titleHeight.value * 0.6 || 1;
    const progress = Math.min(scrollY.value / collapseDistance, 1);
    const easing = Easing.out(Easing.quad);
    return {
      opacity: withTiming(1 - progress, { duration: 80, easing }),
      transform: [{ translateY: withTiming(-progress * titleHeight.value, { duration: 80, easing }) }],
    };
  });

  const slotsAndSearchAnimStyle = useAnimatedStyle(() => {
    const collapseDistance = titleHeight.value * 0.6 || 1;
    const progress = Math.min(scrollY.value / collapseDistance, 1);
    const easing = Easing.out(Easing.quad);
    return {
      transform: [{ translateY: withTiming(-progress * titleHeight.value, { duration: 80, easing }) }],
    };
  });

  const headerContainerStyle = useAnimatedStyle(() => {
    if (expandedH.value === 0) {
      return {};
    }
    if (!hasScrolled.value) {
      return { height: expandedH.value };
    }
    const collapseDistance = titleHeight.value * 0.6 || 1;
    const progress = Math.min(scrollY.value / collapseDistance, 1);
    const targetH = interpolate(progress, [0, 1], [expandedH.value, collapsedH.value]);
    return {
      height: withTiming(targetH, { duration: 80, easing: Easing.out(Easing.quad) }),
    };
  });

  const continueAnimStyle = useAnimatedStyle(() => ({
    opacity: continueVisible.value,
    transform: [{ translateY: interpolate(continueVisible.value, [0, 1], [80, 0]) }],
  }));

  const isSearchMode = debouncedQuery.trim().length > 0;

  const topRated = useTopRatedFilms();
  const search = useSearchFilms(debouncedQuery);

  const activeQuery = isSearchMode ? search : topRated;

  // Flatten all loaded pages into a single array.
  const films = useMemo(
    () => activeQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [activeQuery.data],
  );

  const handleSearch = useCallback((text: string): void => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 400);
  }, []);

  const handleLoadMore = useCallback((): void => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      void activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

  const handleSkip = (): void => {
    reset();
    router.replace(HOME_ROUTE);
  };

  const handleContinue = (): void => {
    // TODO: PUT /users/me/favorites with favoriteFilmIds
    reset();
    router.replace(HOME_ROUTE);
  };

  /** Toggles a film in/out of the 4 favorites, keeping selectedFilms in sync. */
  const handleToggle = useCallback(
    (film: FilmResult): void => {
      const isSelected = favoriteFilmIds.includes(film.tmdb_id);
      if (isSelected) {
        setSelectedFilms((prev) => {
          const next = new Map(prev);
          next.delete(film.tmdb_id);
          return next;
        });
      } else {
        setSelectedFilms((prev) => new Map(prev).set(film.tmdb_id, film));
      }
      toggleFavorite(film.tmdb_id);
    },
    [favoriteFilmIds, toggleFavorite],
  );

  // Slots look up film objects from selectedFilms, which persists across query switches.
  const renderSlots = (): React.JSX.Element => (
    <View style={styles.slots}>
      {[1, 2, 3, 4].map((pos) => {
        const filmId = favoriteFilmIds[pos - 1];
        const film = filmId ? selectedFilms.get(filmId) : undefined;

        return (
          <Pressable
            key={pos}
            style={styles.slot}
            onPress={() => {
              if (filmId) {
                setSelectedFilms((prev) => {
                  const next = new Map(prev);
                  next.delete(filmId);
                  return next;
                });
                toggleFavorite(filmId);
              }
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={filmId ? `Remove favourite ${pos}` : `Slot ${pos} empty`}
          >
            {film?.poster_path ? (
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w185${film.poster_path}` }}
                style={styles.slotImage}
              />
            ) : (
              <Text style={styles.slotNumber}>{`#${pos}`}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const renderPoster = ({ item }: { item: FilmResult }): React.JSX.Element => {
    const selected = favoriteFilmIds.includes(item.tmdb_id);
    return (
      <Pressable
        onPress={() => handleToggle(item)}
        style={[styles.poster, selected && styles.posterSelected]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${item.title}`}
      >
        {item.poster_path ? (
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w185${item.poster_path}` }}
            style={styles.posterImage}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        )}
        {selected && <View style={styles.posterOverlay} />}
      </Pressable>
    );
  };

  const renderFooter = (): React.JSX.Element | null => {
    if (!activeQuery.isFetchingNextPage) return null;
    return (
      <View style={styles.footerSpinner}>
        <ActivityIndicator size="small" color={Colors.textMuted} />
      </View>
    );
  };

  return (
    <OnboardingScreen
      currentStep={5}
      totalSteps={5}
      onSkip={handleSkip}
      onContinue={handleContinue}
      hideContinue
      scrollable={false}
      hideTopBar
    >
      <View style={styles.container}>
        {/*
         * Animated fixed header — its height interpolates between the full
         * expanded height and the collapsed height (slots + search only)
         * in sync with the title sliding up. overflow: 'hidden' clips the
         * title as it exits the top of the container.
         */}
        <Animated.View
          style={[styles.fixedHeader, headerContainerStyle]}
          pointerEvents="box-none"
        >
          <View
            onLayout={(e) => {
              const HEADER_PADDING_TOP = 12;
              const HEADER_PADDING_BOTTOM = 20; // matches styles.fixedHeader paddingBottom
              const contentH = e.nativeEvent.layout.height;
              const totalH = HEADER_PADDING_TOP + contentH + HEADER_PADDING_BOTTOM;
              expandedH.value = totalH;
              setHeaderHeight(totalH);
            }}
          >

          <Animated.View
            style={titleAnimStyle}
            onLayout={(e) => {
              titleHeight.value = e.nativeEvent.layout.height;
            }}
          >
            <Text style={styles.heading}>
              {"Let's choose your "}
              <Text style={styles.headingAccent}>{'4'}</Text>
              {'\n'}
              <Text style={styles.headingAccent}>{'favorites'}</Text>
            </Text>
          </Animated.View>

          <Animated.View
            style={slotsAndSearchAnimStyle}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              collapsedH.value = h + Spacing.screenH; 
            }}
          >
            {renderSlots()}

            <View style={styles.searchBarContainer}>
              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="Search films…"
                placeholderTextColor={Colors.textMuted}
                style={styles.searchBar}
                returnKeyType="search"
                keyboardAppearance="dark"
                autoCapitalize="none"
              />
              {activeQuery.isFetching && !activeQuery.isFetchingNextPage && (
                <ActivityIndicator size="small" color={Colors.textMuted} style={styles.searchSpinner} />
              )}
            </View>
          </Animated.View>
          </View>
        </Animated.View>

        {activeQuery.isLoading && films.length === 0 ? (
          <View style={[styles.loadingContainer, { paddingTop: headerHeight + 16 }]}>
            <ActivityIndicator color={Colors.accentBlue} />
          </View>
        ) : (
          <Animated.FlatList<FilmResult>
            style={styles.grid}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            data={films}
            keyExtractor={(item) => String(item.tmdb_id)}
            numColumns={Dimensions.posterGridColumns}
            key={isSearchMode ? 'search' : 'top-rated'}
            ListFooterComponent={renderFooter}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.gridContent, { paddingTop: headerHeight + 16 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            renderItem={renderPoster}
          />
        )}

        <Animated.View
          style={[styles.continueContainer, continueAnimStyle, { paddingBottom: insets.bottom + 12 }]}
          pointerEvents={favoriteFilmIds.length === 4 ? 'auto' : 'none'}
        >
          <Pressable
            onPress={handleContinue}
            style={styles.continueButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueLabel}>{'Continue'}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenH,
    paddingTop: 12,
    paddingBottom: 20,
  },
  heading: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.heading,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
  headingAccent: {
    color: Colors.accentBlue,
  },
  slots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  slot: {
    width: Dimensions.posterWidth,
    height: Dimensions.posterWidth * Dimensions.posterAspect,
    borderRadius: Radius.poster,
    backgroundColor: Colors.skipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotNumber: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.accentBlue,
  },
  searchBarContainer: {
    width: '100%',
    height: Dimensions.searchBarHeight,
    backgroundColor: Colors.searchBackground,
    borderRadius: Radius.searchBar,
    borderWidth: 1,
    borderColor: Colors.progressTrack,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  searchBar: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    height: '100%',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  grid: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 24,
  },
  gridRow: {
    gap: 6,
    marginBottom: 6,
    justifyContent: 'center',
  },
  poster: {
    width: Dimensions.posterWidth,
    height: Dimensions.posterWidth * Dimensions.posterAspect,
    borderRadius: Radius.poster,
    overflow: 'hidden',
  },
  posterSelected: {
    opacity: 0.6,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    backgroundColor: Colors.skipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  posterPlaceholderText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accentBlue,
    opacity: 0.25,
  },
  footerSpinner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  continueButton: {
    width: Dimensions.buttonWidth,
    height: Dimensions.buttonHeight,
    backgroundColor: Colors.white,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.buttonText,
    letterSpacing: LetterSpacing.tight,
  },
});
