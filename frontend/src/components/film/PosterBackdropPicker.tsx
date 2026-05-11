import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { backdropUrl, posterUrl } from '@/src/lib/tmdb';
import type { FilmImages, TmdbImage } from '@/src/types/film.types';

type Tab = 'poster' | 'backdrop';

interface PosterBackdropPickerProps {
  visible: boolean;
  onClose: () => void;
  images: FilmImages | undefined;
  isLoading: boolean;
  /** Currently selected custom poster path, or null for the default. */
  currentPosterPath: string | null;
  currentBackdropPath: string | null;
  /** Save the picked path. Pass null to clear back to TMDB default. */
  onSelectPoster: (path: string | null) => void;
  onSelectBackdrop: (path: string | null) => void;
}

const POSTER_COLUMNS = 3;
const BACKDROP_COLUMNS = 2;
const POSTER_GAP = 10;
const SCREEN_PADDING = 16;

/**
 * Full-screen modal letting the user pick a custom poster or backdrop
 * sourced from the TMDB images endpoint. Selection saves immediately and
 * closes the picker.
 */
export default function PosterBackdropPicker({
  visible,
  onClose,
  images,
  isLoading,
  currentPosterPath,
  currentBackdropPath,
  onSelectPoster,
  onSelectBackdrop,
}: PosterBackdropPickerProps): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('poster');

  const posters = images?.posters ?? [];
  const backdrops = [
    ...(images?.cleanBackdrops ?? []),
    ...(images?.titledBackdrops ?? []),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-down" size={22} color={Colors.white} />
            </Pressable>
            <Text style={styles.title}>Change appearance</Text>
            <View style={styles.closeBtn} />
          </View>

          <View style={styles.tabs}>
            {(['poster', 'backdrop'] as const).map((t) => {
              const active = t === tab;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={styles.tabLabel}>
                    {t === 'poster' ? 'POSTERS' : 'BACKDROPS'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.white} />
            </View>
          ) : tab === 'poster' ? (
            <PosterGrid
              key="posters"
              items={posters}
              selectedPath={currentPosterPath}
              onSelect={(p) => {
                onSelectPoster(p);
                onClose();
              }}
            />
          ) : (
            <BackdropGrid
              key="backdrops"
              items={backdrops}
              selectedPath={currentBackdropPath}
              onSelect={(p) => {
                onSelectBackdrop(p);
                onClose();
              }}
            />
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

interface GridProps {
  items: TmdbImage[];
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
}

function PosterGrid({ items, selectedPath, onSelect }: GridProps): React.JSX.Element {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.file_path}
      numColumns={POSTER_COLUMNS}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <Pressable
          onPress={() => onSelect(null)}
          style={({ pressed }) => [styles.resetRow, pressed && styles.pressed]}
        >
          <Text style={styles.resetLabel}>Reset to default</Text>
        </Pressable>
      }
      renderItem={({ item }) => {
        const isSelected = item.file_path === selectedPath;
        return (
          <Pressable
            onPress={() => onSelect(item.file_path)}
            style={({ pressed }) => [
              styles.posterWrap,
              pressed && styles.pressed,
              isSelected && styles.selected,
            ]}
          >
            <Image
              source={{ uri: posterUrl(item.file_path, 'w342') ?? undefined }}
              style={styles.poster}
            />
          </Pressable>
        );
      }}
    />
  );
}

function BackdropGrid({ items, selectedPath, onSelect }: GridProps): React.JSX.Element {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.file_path}
      numColumns={BACKDROP_COLUMNS}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <Pressable
          onPress={() => onSelect(null)}
          style={({ pressed }) => [styles.resetRow, pressed && styles.pressed]}
        >
          <Text style={styles.resetLabel}>Reset to default</Text>
        </Pressable>
      }
      renderItem={({ item }) => {
        const isSelected = item.file_path === selectedPath;
        return (
          <Pressable
            onPress={() => onSelect(item.file_path)}
            style={({ pressed }) => [
              styles.backdropWrap,
              pressed && styles.pressed,
              isSelected && styles.selected,
            ]}
          >
            <Image
              source={{ uri: backdropUrl(item.file_path, 'w780') ?? undefined }}
              style={styles.backdrop}
            />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: 64,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#292929',
    borderRadius: 7,
    padding: 6,
    marginHorizontal: SCREEN_PADDING,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    borderRadius: 7,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(126,126,126,0.25)',
  },
  tabLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 60,
    gap: POSTER_GAP,
  },
  row: {
    gap: POSTER_GAP,
  },
  resetRow: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#1f1f1f',
    borderRadius: Radius.button,
  },
  resetLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  posterWrap: {
    flex: 1 / POSTER_COLUMNS,
    aspectRatio: 2 / 3,
    borderRadius: Radius.poster,
    overflow: 'hidden',
    backgroundColor: '#1f1f1f',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  backdropWrap: {
    flex: 1 / BACKDROP_COLUMNS,
    aspectRatio: 16 / 9,
    borderRadius: Radius.poster,
    overflow: 'hidden',
    backgroundColor: '#1f1f1f',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  selected: {
    borderWidth: 2,
    borderColor: Colors.accentBlue,
  },
});
