import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import type { ListFolder } from '@/src/types/lists.types';

// ---------------------------------------------------------------------------
// Layout — matches the list-row dimensions ("Lists list (Dark)").
// ---------------------------------------------------------------------------
const ROW_HEIGHT = 42;
const THUMB_W = 50;
const THUMB_TEXT_GAP = 12;
const THUMB_RADIUS = 3;

interface FolderRowItemProps {
  folder: ListFolder;
  onPress: () => void;
}

/**
 * A folder row inside the lists overview. Mirrors {@link ListRowItem}'s
 * dimensions but shows a filled folder glyph and a "{n} LISTS" subtitle.
 * Folders are not swipeable.
 */
export function FolderRowItem({
  folder,
  onPress,
}: FolderRowItemProps): React.JSX.Element {
  const listsLabel =
    folder.lists_count === 1 ? '1 LIST' : `${folder.lists_count} LISTS`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.thumb}>
        <Ionicons name="folder" size={22} color={Colors.textMuted} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {listsLabel}
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
    borderRadius: THUMB_RADIUS,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    marginLeft: THUMB_TEXT_GAP,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 17,
  },
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 12,
  },
});
