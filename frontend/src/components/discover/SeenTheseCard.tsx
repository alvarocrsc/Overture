import React from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { FontFamily } from '@/src/lib/colors';

const IMG_IPAD = require('@/assets/images/iPad.png') as number;
const IMG_MAC = require('@/assets/images/Mac.png') as number;

interface Props {
  onPress: () => void;
}

export default function SeenTheseCard({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{'You\u2019ve seen\nthese...'}</Text>

      <Image source={IMG_MAC} style={styles.mac} resizeMode="contain" />

      <Image source={IMG_IPAD} style={styles.ipad} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 95,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e7cc5f',
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    position: 'absolute',
    left: 15,
    top: 11,
    fontFamily: FontFamily.black,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: '#000000',
  },
  mac: {
    position: 'absolute',
    left: 94,
    top: 30,
    width: 82,
    height: 60,
  },
  ipad: {
    position: 'absolute',
    left: 39,
    top: 32,
    width: 50,
    height: 80,
  },
});
