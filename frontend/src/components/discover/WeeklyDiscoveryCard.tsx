import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';

// Hardcoded posters for the "Weekly discovery" 
const IMG_HER            = posterUrl('/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg', 'w342')!;
const IMG_HOURGLASS      = posterUrl('/wV6LsDuRHPGbQqRsaAAu3xHgflW.jpg', 'w342')!;
const IMG_EYES_WIDE_SHUT = posterUrl('/knEIz1eNGl5MQDbrEAVWA7iRqF9.jpg', 'w342')!;
const IMG_REQUIEM        = posterUrl('/nOd6vjEmzCT0k4VYqsA2hwyi87C.jpg', 'w342')!;
const IMG_AMERICAN_PSYCHO = posterUrl('/9uGHEgsiUXjCNq8wdq4r49YL8A1.jpg', 'w342')!;
const IMG_MULHOLLAND     = posterUrl('/x7A59t6ySylr1L7aubOQEA480vM.jpg', 'w342')!;
const IMG_LOST_HIGHWAY   = posterUrl('/5POhfNeFPIi4VUNwCTaK85sh98r.jpg', 'w342')!;
const IMG_AUTUMN_SONATA  = posterUrl('/6beNbtCXv3GkzHkxkGYf38ib7v8.jpg', 'w342')!;
const IMG_LITTLE_MISS    = posterUrl('/niNdhTpPHSgw22tK0PLjQMV640v.jpg', 'w342')!;
const IMG_SERPENTS_PATH  = posterUrl('/kHUsXCAtjwQCcyCE8uLpksRt40M.jpg', 'w342')!;
const IMG_MORVERN        = posterUrl('/qcX86XKhPH4Q02OcKv4cnbrmFOn.jpg', 'w342')!;
const IMG_VIDEODROME     = posterUrl('/qqqkiZSU9EBGZ1KiDmfn07S7qvv.jpg', 'w342')!;
const IMG_PSYCHO         = posterUrl('/fqKbTHbbH27ulQ16kaReRI71gvY.jpg', 'w342')!;

const POSTERS: Array<{ src: string; left: number; top: number }> = [
  { src: IMG_HER,            left: 87,  top: 91 },
  { src: IMG_HOURGLASS,      left: 156, top: 69 },
  { src: IMG_EYES_WIDE_SHUT, left: 133, top: 63 },
  { src: IMG_REQUIEM,        left: 110, top: 68 },
  { src: IMG_AMERICAN_PSYCHO,left: 87,  top: 58 },
  { src: IMG_MULHOLLAND,     left: 156, top: 36 },
  { src: IMG_LOST_HIGHWAY,   left: 133, top: 30 },
  { src: IMG_AUTUMN_SONATA,  left: 110, top: 35 },
  { src: IMG_LITTLE_MISS,    left: 87,  top: 25 },
  { src: IMG_SERPENTS_PATH,  left: 156, top: 3  },
  { src: IMG_MORVERN,        left: 133, top: -3 },
  { src: IMG_VIDEODROME,     left: 110, top: 2  },
  { src: IMG_PSYCHO,         left: 87,  top: -8 },
];

interface Props {
  onPress: () => void;
}

export default function WeeklyDiscoveryCard({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{'Weekly\ndiscovery'}</Text>

      {POSTERS.map((p, i) => (
        <Image
          key={i}
          source={{ uri: p.src }}
          style={[styles.poster, { left: p.left, top: p.top }]}
          contentFit="cover"
          transition={0}
        />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 95,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a77da',
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 72,
    fontFamily: FontFamily.black,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: '#FFFFFF',
  },
  poster: {
    position: 'absolute',
    width: 20,
    height: 30,
  },
});
