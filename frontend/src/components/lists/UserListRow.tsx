import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import type { ListSummary } from '@/src/types/lists.types';

// ---------------------------------------------------------------------------
// Figma measurements (node 1394:221 "Fav Posters" row, "Lists list (Dark)")
// ---------------------------------------------------------------------------
/** Row total height from Figma. */
const ROW_HEIGHT = 42;
/** Thumbnail width from Figma. */
const THUMB_W = 50;
/** Horizontal gap between thumbnail right edge and text left edge (62 - 50 = 12). */
const THUMB_TEXT_GAP = 12;
/** Thumbnail corner radius from Figma. */
const THUMB_RADIUS = 3;

interface UserListRowProps {
  list: ListSummary;
  onPress: () => void;
}

/**
 * A single row in the user's lists screen, showing the list's thumbnail,
 * title, item count + "LIST BY" meta line, and owner name.
 *
 * Layout matches the Figma frame "Lists list (Dark)" (node 1394:221).
 */
export function UserListRow({ list, onPress }: UserListRowProps): React.JSX.Element {
  const thumbUri = list.icon_url
    ? list.icon_url
    : backdropUrl(list.cover_backdrop_path, 'w300');

  // Format count label — prefer "N FILMS" style if there's only one
  // media type. The exact split is not available in the summary, so we
  // show the total count as "N TITLES" which is safe for mixed lists.
  const countLabel =
    list.items_count === 0
      ? '0 TITLES'
      : `${list.items_count} ${list.items_count === 1 ? 'TITLE' : 'TITLES'}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        ) : (
          <View style={styles.thumbFallback} />
        )}
      </View>

      {/* Text column */}
      <View style={styles.textCol}>
        {/* Title — Geist ExtraBold 17px white tracking -1, centered at top ~7px */}
        <Text style={styles.title} numberOfLines={1}>
          {list.title}
        </Text>

        {/* Meta line — count (accentBlue) + " · LIST BY" (white) */}
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.metaCount}>{countLabel}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.metaLabel}>LIST BY</Text>
        </Text>

        {/* Owner name — Geist Light 10.5px white */}
        <Text style={styles.owner} numberOfLines={1}>
          {list.owner_username}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    // Left offset of 4px matches Figma (rows at x=4 within 350px content area).
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: THUMB_W,
    height: ROW_HEIGHT,
    borderRadius: THUMB_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    flexShrink: 0,
  },
  thumbFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2a2a2a',
  },
  textCol: {
    flex: 1,
    marginLeft: THUMB_TEXT_GAP,
    // 42px tall container — distribute text vertically to match Figma positions.
    // Title centre at 7px, meta centre at 21.5px, owner centre at 36.5px.
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 17,
  },
  meta: {
    fontSize: 10.5,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 12,
  },
  metaCount: {
    fontFamily: FontFamily.semiBold,
    color: Colors.accentBlue,
  },
  metaDot: {
    fontFamily: FontFamily.regular,
    color: Colors.white,
  },
  metaLabel: {
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  owner: {
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    lineHeight: 12,
  },
});
