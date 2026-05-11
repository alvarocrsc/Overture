import React, { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import type { FilmImages, TmdbImage } from '@/src/types/film.types';

interface PhotosTabProps {
  images: FilmImages | undefined;
}

const COLUMNS = 2;
const GAP = 8;

export default function PhotosTab({ images }: PhotosTabProps): React.JSX.Element {
  const items: TmdbImage[] = useMemo(() => {
    if (!images) return [];
    const seen = new Set<string>();
    const merged = [...images.cleanBackdrops, ...images.titledBackdrops];
    return merged.filter((img) => {
      if (seen.has(img.file_path)) return false;
      seen.add(img.file_path);
      return true;
    });
  }, [images]);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyLabel}>No photos available</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.file_path}
      numColumns={COLUMNS}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <View style={styles.tile}>
          <Image
            source={{ uri: backdropUrl(item.file_path, 'w780') ?? undefined }}
            style={styles.image}
          />
        </View>
      )}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: GAP,
  },
  row: {
    gap: GAP,
  },
  tile: {
    flex: 1 / COLUMNS,
    aspectRatio: 16 / 9,
    borderRadius: Radius.poster,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
});
