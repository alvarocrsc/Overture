import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import type { PersonSearchResult } from '@/src/types/search.types';

interface Props {
  item: PersonSearchResult;
  onPress: () => void;
  onRemove?: () => void;
}

export default function PersonSearchItem({ item, onPress, onRemove }: Props) {
  const url = resolveProfile(item.profilePath);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        {url ? (
          <Image source={{ uri: url }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <View style={styles.avatarFallback} />
        )}
      </View>

      <View style={styles.textStack}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text>{formatDepartment(item.role)}</Text>
          {item.knownFor ? (
            <>
              <Text>{'   ·   '}</Text>
              <Text style={styles.knownFor}>{item.knownFor}</Text>
            </>
          ) : null}
        </Text>
      </View>

      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="close" size={16} color={Colors.white} />
        </Pressable>
      )}
    </Pressable>
  );
}

function formatDepartment(dept: string): string {
  const map: Record<string, string> = {
    Acting: 'ACTOR',
    Directing: 'DIRECTOR',
  };
  return map[dept] ?? dept.toUpperCase();
}

function resolveProfile(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

const styles = StyleSheet.create({
  row: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: '#222',
  },
  textStack: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  name: {
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
  knownFor: {
    fontFamily: FontFamily.medium,
    color: Colors.accentBlue,
  },
});
