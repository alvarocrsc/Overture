import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';

interface Props {
  posterPath: string | null;
  onPress?: () => void;
}

/**
 * Simple 90×135 poster card used in horizontal carousels such as New Films/Series.
 */
export default function FilmPosterCard({ posterPath, onPress }: Props) {
  const uri = posterUrl(posterPath, 'w500');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.posterWrapper}>
        <Image
          source={uri ? { uri } : undefined}
          style={styles.poster}
          contentFit="cover"
          placeholder={Colors.cardBackground}
        />
      </View>
    </Pressable>
  );
}

const CARD_GAP = 6;

const styles = StyleSheet.create({
  card: {
    marginRight: CARD_GAP,
  },
  posterWrapper: {
    width: 90,
    height: 135,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  poster: {
    width: 90,
    height: 135,
    borderRadius: 5,
  },
});
