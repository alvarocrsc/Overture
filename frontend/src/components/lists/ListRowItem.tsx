import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { ListThumbnail } from '@/src/components/lists/ListThumbnail';
import type { ListSummary, NormalizedListItem } from '@/src/types/lists.types';

// ---------------------------------------------------------------------------
// Figma measurements — shared with UserListRow ("Lists list (Dark)").
// ---------------------------------------------------------------------------
const ROW_HEIGHT = 42;
const THUMB_W = 50;
const THUMB_TEXT_GAP = 12;
const THUMB_RADIUS = 3;

interface ListRowItemProps {
  list: ListSummary;
  onPress: () => void;
}

/**
 * A single list row inside the folder-aware lists overview.
 *
 * Reuses {@link ListThumbnail} for the cover image. Folder-contents lists
 * arrive as summaries (no `items` array), so a one-item collage source is
 * synthesised from `cover_backdrop_path` to keep the thumbnail populated.
 */
export function ListRowItem({
  list,
  onPress,
}: ListRowItemProps): React.JSX.Element {
  // Synthesize a single normalized item from the cover backdrop so the
  // shared ListThumbnail can render a real image rather than a placeholder.
  const thumbItems: NormalizedListItem[] = list.cover_backdrop_path
    ? [
        {
          itemId: -1,
          position: 1,
          mediaType: 'film',
          tmdbId: -1,
          title: list.title,
          posterPath: null,
          backdropPath: list.cover_backdrop_path,
          overview: null,
          year: null,
          directorOrCreator: null,
          runtimeOrSeasons: null,
        },
      ]
    : [];

  const countLabel =
    list.items_count === 1
      ? '1 TITLE'
      : `${list.items_count} TITLES`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.thumb}>
        <ListThumbnail
          iconUrl={list.icon_url}
          items={thumbItems}
          width={THUMB_W}
          borderRadius={THUMB_RADIUS}
        />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {list.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.metaCount}>{countLabel}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.metaLabel}>LIST BY</Text>
        </Text>
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
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: THUMB_W,
    height: ROW_HEIGHT,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    marginLeft: THUMB_TEXT_GAP,
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
