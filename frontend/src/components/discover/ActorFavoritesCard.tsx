import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { FontFamily } from '@/src/lib/colors';

// Actor profile images from TMDB.
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';
const IMG_RYAN_GOSLING = `${TMDB_IMG}/8q9lfuv1tdF3JxMm5hEo6Ie0QPY.jpg`;
const IMG_ZENDAYA      = `${TMDB_IMG}/3mBb2craX3adj73FJZpslqV61v7.jpg`;
const IMG_BRAD_PITT    = `${TMDB_IMG}/1k9MVNS9M3Y4KejBHusNdbGJwRw.jpg`;

interface Props {
  onPress: () => void;
}

export default function ActorFavoritesCard({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image
        source={{ uri: IMG_RYAN_GOSLING }}
        style={styles.ryanGosling}
        contentFit="cover"
      />

      <Image
        source={{ uri: IMG_ZENDAYA }}
        style={styles.zendaya}
        contentFit="cover"
      />

      <Image
        source={{ uri: IMG_BRAD_PITT }}
        style={styles.bradPitt}
        contentFit="cover"
      />

      <Text style={styles.title}>{'Your favorite\nactors\u2019 movies'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 95,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1d9e75',
  },
  pressed: {
    opacity: 0.85,
  },

  ryanGosling: {
    position: 'absolute',
    left: -3,
    top: 27,
    width: 47,
    height: 47,
    borderRadius: 23.5,
  },

  zendaya: {
    position: 'absolute',
    left: 44,
    top: -7,
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  bradPitt: {
    position: 'absolute',
    left: 39,
    top: 70,
    width: 33,
    height: 32,
    borderRadius: 25,
  },

  title: {
    position: 'absolute',
    right: 15,
    top: 32,
    fontFamily: FontFamily.black,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: '#FFFFFF',
    textAlign: 'right',
  },
});
