import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import {
  Colors,
  FontFamily,
  LetterSpacing,
  LONG_PRESS_DELAY,
  Radius,
} from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import { useImageShare } from '@/src/hooks/useImageShare';
import PhotoViewer from '@/src/components/shared/PhotoViewer';
import type { FilmImages, TmdbImage } from '@/src/types/film.types';

interface PhotosTabProps {
  images: FilmImages | undefined;
}

const COLUMNS = 2;
const GAP = 8;

/**
 * A title's images as a two-column grid. Tapping a tile opens a full-screen
 * carousel across every image; long-pressing one opens the share sheet, from
 * which it can be saved to the photo library or sent on.
 */
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

  // Index of the image the viewer is open on, or null when it is closed.
  // Rendering the viewer only while open guarantees it opens on the tapped
  // image rather than wherever it was last left.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const share = useImageShare();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyLabel}>No photos available</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(it) => it.file_path}
        numColumns={COLUMNS}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <Pressable
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            onPress={() => setViewerIndex(index)}
            onLongPress={() => share(item.file_path)}
            delayLongPress={LONG_PRESS_DELAY}
            accessibilityRole="imagebutton"
            accessibilityLabel="Open image. Long press to share or save."
          >
            <Image
              source={{ uri: backdropUrl(item.file_path, 'w780') ?? undefined }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
        )}
        scrollEnabled={false}
      />

      {viewerIndex !== null ? (
        <PhotoViewer
          images={items}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onShare={share}
        />
      ) : null}
    </>
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
  pressed: {
    opacity: 0.7,
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
