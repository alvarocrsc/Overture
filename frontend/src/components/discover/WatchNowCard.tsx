import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';

// Hardcoded posters for the "What should I watch right now?" card.
const IMG_ANGELS_EGG = posterUrl('/dcEUGvckbePFzPKhGXnS9T3kZMG.jpg', 'w185')!;
const IMG_2001 = posterUrl('/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg', 'w185')!;
const IMG_PERSONA = posterUrl('/yPTntWP9Wvew8vHN0jB7Z1EvEUN.jpg', 'w185')!;

const POSTERS = [
  {
    src: IMG_ANGELS_EGG,
    left: 85,
    top: 53,
    containerW: 56.759,
    containerH: 67.588,
    posterW: 38.36,
    posterH: 57.54,
    rotate: '-21.47deg',
  },
  {
    src: IMG_2001,
    left: 113,
    top: 38,
    containerW: 47.584,
    containerH: 64.763,
    posterW: 40,
    posterH: 60,
    rotate: '-7.6deg',
  },
  {
    src: IMG_PERSONA,
    left: 141.43,
    top: 28.91,
    containerW: 55.238,
    containerH: 75.283,
    posterW: 46.546,
    posterH: 69.819,
    rotate: '7.48deg',
  },
] as const;

interface Props {
  onPress: () => void;
}

export default function WatchNowCard({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{'What should I\nwatch right\nnow?'}</Text>

      {POSTERS.map((p) => (
        <View
          key={p.src}
          style={[
            styles.posterContainer,
            {
              left: p.left,
              top: p.top,
              width: p.containerW,
              height: p.containerH,
            },
          ]}
        >
          <Image
            source={{ uri: p.src }}
            style={[
              styles.poster,
              {
                width: p.posterW,
                height: p.posterH,
                transform: [{ rotate: p.rotate }],
              },
            ]}
            contentFit="cover"
            transition={0}
          />
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 95,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e24b4a',
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    position: 'absolute',
    left: 15,
    top: 15,
    width: 94,
    fontFamily: FontFamily.black,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: '#FFFFFF',
  },
  posterContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    borderRadius: 5,
  },
});
