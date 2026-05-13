import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import type { ListSearchResultItem } from '@/src/types/search.types';

interface Props {
  item: ListSearchResultItem;
  isSaved?: boolean;
  onPress: () => void;
  onSavePress: () => void;
  onRemove?: () => void;
}

export default function ListSearchItem({
  item,
  isSaved,
  onPress,
  onSavePress,
  onRemove,
}: Props) {
  const cells: (string | null)[] = [...item.posterPaths];
  while (cells.length < 6) cells.push(null);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.collage}>
        {cells.slice(0, 6).map((p, idx) => {
          const url = p ? (p.startsWith('http') ? p : posterUrl(p, 'w500')) : null;
          return (
            <View key={idx} style={styles.cell}>
              {url ? (
                <Image source={{ uri: url }} style={styles.cellImage} contentFit="cover" />
              ) : (
                <View style={styles.cellFallback} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.textStack}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.count}>{`${item.itemsCount} FILMS`}</Text>
          <Text>{'   ·   LIST BY'}</Text>
        </Text>
        <Text style={styles.owner} numberOfLines={1}>
          {item.ownerUsername}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onSavePress}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={Colors.white}
          />
        </Pressable>
        {onRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close" size={16} color={Colors.white} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  collage: {
    width: 50,
    height: 42,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#222',
  },
  cell: {
    width: 25,
    height: 14,
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellFallback: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  textStack: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 19,
  },
  meta: {
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    letterSpacing: -0.5,
    marginTop: -2,
  },
  count: {
    fontFamily: FontFamily.semiBold,
    color: Colors.accentBlue,
  },
  owner: {
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 12,
  },
});
