import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/auth/BackButton';
import LogSearchBar from '@/src/components/log/LogSearchBar';
import BackdropPickerGrid, {
  backdropOptionKey,
} from '@/src/components/profile/BackdropPickerGrid';
import { useBackdropOptions } from '@/src/hooks/use-backdrop-options';
import { useMyProfile } from '@/src/hooks/useProfile';
import { useUpdateProfileBackdrop } from '@/src/hooks/use-update-profile-backdrop';
import {
  Colors,
  FontFamily,
  LetterSpacing,
  Spacing,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import type { BackdropOption } from '@/src/types/profile.types';

/** Characters required before a search replaces the rated-titles list. */
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Profile banner picker.
 *
 * Opens on the user's own titles ordered by how highly they rated them, and
 * switches to a TMDB title search once they type. Choosing a backdrop saves
 * immediately — there is no confirm step, so the profile reflects the change
 * as soon as the tick lands.
 *
 * Reached from Settings for now; it belongs in Edit profile once that exists.
 */
export default function ProfileBackdropScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileQ = useMyProfile();
  const optionsQ = useBackdropOptions(debouncedSearch);
  const updateBackdrop = useUpdateProfileBackdrop();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((text: string): void => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = text.trim();
      // Below the threshold the query resets to '', which is the rated list —
      // so backspacing out of a search returns there rather than searching "a".
      setDebouncedSearch(trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '');
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const handleClearSearch = useCallback((): void => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  const handleSelect = useCallback(
    (option: BackdropOption): void => {
      updateBackdrop.mutate(
        { tmdb_id: option.tmdb_id, media_type: option.media_type },
        {
          onError: (e: Error) =>
            Alert.alert('Could not update banner', e.message),
        },
      );
    },
    [updateBackdrop],
  );

  const handleRemove = useCallback((): void => {
    updateBackdrop.mutate(null, {
      onError: (e: Error) => Alert.alert('Could not remove banner', e.message),
    });
  }, [updateBackdrop]);

  const handleLoadMore = useCallback((): void => {
    void optionsQ.fetchNextPage();
  }, [optionsQ]);

  const items = useMemo(() => optionsQ.data?.items ?? [], [optionsQ.data]);
  const isSearching = debouncedSearch.length > 0;

  const selectedTmdbId = profileQ.data?.profile_backdrop_tmdb_id ?? null;
  const selectedKey =
    selectedTmdbId != null
      ? backdropOptionKey(
          profileQ.data?.profile_backdrop_media_type ?? null,
          selectedTmdbId,
        )
      : null;

  // Null while removing — variables is null then, and no cell should spin.
  const pending = updateBackdrop.isPending ? updateBackdrop.variables : null;
  const pendingKey = pending
    ? backdropOptionKey(pending.media_type, pending.tmdb_id)
    : null;

  const listHeader = (
    <View style={styles.listHeader}>
      <LogSearchBar
        value={searchText}
        onChangeText={handleSearchChange}
        onClear={handleClearSearch}
      />
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {isSearching ? 'Search results' : 'Your highest rated'}
        </Text>
        {selectedKey != null && !isSearching ? (
          <Pressable
            onPress={handleRemove}
            disabled={updateBackdrop.isPending}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel="Remove profile banner"
          >
            <Text style={styles.removeLabel}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const listEmpty = optionsQ.isLoading ? (
    <ActivityIndicator color={Colors.accentBlue} style={styles.loader} />
  ) : (
    <Text style={styles.emptyText}>
      {isSearching
        ? 'No titles with a banner image matched that search.'
        : 'Log and rate a few titles and their backdrops will show up here.'}
    </Text>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.backButton}>
          <BackButton />
        </View>
        <Text style={styles.title}>Profile banner</Text>
        <Text style={styles.subtitle}>
          Pick the backdrop shown behind your profile.
        </Text>
      </View>

      <BackdropPickerGrid
        items={items}
        selectedKey={selectedKey}
        pendingKey={pendingKey}
        hasNextPage={optionsQ.hasNextPage}
        isFetchingNextPage={optionsQ.isFetchingNextPage}
        onLoadMore={handleLoadMore}
        onSelect={handleSelect}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 24,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    marginBottom: 6,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  listContent: {
    paddingHorizontal: Spacing.screenH,
  },
  listHeader: {
    paddingBottom: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  removeLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.errorRed,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.7,
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    marginTop: 32,
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
