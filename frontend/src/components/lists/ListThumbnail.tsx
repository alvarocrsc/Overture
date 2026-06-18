import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/src/lib/colors';
import { backdropUrl, posterUrl } from '@/src/lib/tmdb';
import type { NormalizedListItem } from '@/src/types/lists.types';

/** Aspect ratio of the collage container, taken from Figma (174×146). */
const ASPECT = 146 / 174;
/** Number of backdrops shown in the collage grid (2 columns × 3 rows). */
const COLLAGE_COUNT = 6;
const COLLAGE_COLUMNS = 2;
const COLLAGE_ROWS = 3;

/**
 * Resolves the best preview image URI for a list item, preferring the
 * landscape backdrop and falling back to the poster so a cell is never empty.
 */
function itemImageUri(item: NormalizedListItem): string | null {
  return backdropUrl(item.backdropPath, 'w300') ?? posterUrl(item.posterPath, 'w342');
}

interface ListThumbnailProps {
  /** Custom uploaded icon URL. Takes precedence over the collage. */
  iconUrl: string | null;
  /** Normalized list items used to build the collage. */
  items: NormalizedListItem[];
  /** Rendered width in pixels. Height is derived from the Figma aspect ratio. */
  width: number;
  /** Corner radius. Defaults to 5 (Figma). */
  borderRadius?: number;
}

/**
 * Renders a list's visual thumbnail.
 *
 * Resolution order:
 * 1. `iconUrl` set → single uploaded image.
 * 2. ≥ 6 items → a 2×3 collage of the first six items (backdrop, poster fallback).
 * 3. 1–5 items → the first available image, full-bleed.
 * 4. 0 items → a dark placeholder with a list glyph.
 */
export function ListThumbnail({
  iconUrl,
  items,
  width,
  borderRadius = 5,
}: ListThumbnailProps): React.JSX.Element {
  const height = Math.round(width * ASPECT);
  const containerStyle = [styles.container, { width, height, borderRadius }];

  if (iconUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: iconUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
        />
      </View>
    );
  }

  // Build cell images from the first six items, preferring backdrops and
  // falling back to posters so every populated cell renders.
  const cellUris = items
    .slice(0, COLLAGE_COUNT)
    .map(itemImageUri)
    .filter((uri): uri is string => uri != null);

  if (items.length >= COLLAGE_COUNT && cellUris.length === COLLAGE_COUNT) {
    const cellWidth = width / COLLAGE_COLUMNS;
    const cellHeight = height / COLLAGE_ROWS;
    return (
      <View style={[containerStyle, styles.collage]}>
        {cellUris.map((uri, index) => (
          <Image
            key={`${uri}-${index}`}
            source={{ uri }}
            style={{ width: cellWidth, height: cellHeight }}
            contentFit="cover"
            transition={0}
          />
        ))}
      </View>
    );
  }

  if (cellUris.length > 0) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: cellUris[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.placeholder]}>
      <Ionicons name="list" size={Math.round(height * 0.32)} color={Colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
