import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';

interface Props {
  title: string;
  backgroundColor: string;
  titleColor?: string;
  posterPaths: Array<string | null>;
  onPress: () => void;
}

const CARD_HEIGHT = 95;

export default function SuggestionCard({
  title,
  backgroundColor,
  titleColor = '#FFFFFF',
  posterPaths,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={3}>
        {title}
      </Text>
      <View style={styles.collage} pointerEvents="none">
        {posterPaths.slice(0, 12).map((path, i) => {
          const url = posterUrl(path, 'w500');
          if (!url) return null;
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <Image
              key={`${path ?? 'p'}-${i}`}
              source={{ uri: url }}
              style={[
                styles.thumb,
                {
                  left: 4 + col * 22,
                  top: -4 + row * 28,
                },
              ]}
              contentFit="cover"
              transition={0}
            />
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    paddingLeft: 15,
    paddingTop: 14,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.black,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  collage: {
    width: 80,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 30,
    borderRadius: 2,
  },
});
