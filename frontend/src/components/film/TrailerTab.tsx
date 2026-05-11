import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { useFilmTrailer } from '@/src/hooks/useFilmTrailer';

interface TrailerTabProps {
  tmdbId: number;
}

export default function TrailerTab({ tmdbId }: TrailerTabProps): React.JSX.Element {
  const { data: youtubeKey, isLoading } = useFilmTrailer(tmdbId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (!youtubeKey) {
    return (
      <View style={styles.center}>
        <Ionicons name="film-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.emptyLabel}>No trailer available</Text>
      </View>
    );
  }

  const thumb = `https://img.youtube.com/vi/${youtubeKey}/maxresdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeKey}`;

  const openTrailer = async (): Promise<void> => {
    await Linking.openURL(watchUrl);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={openTrailer}
        style={({ pressed }) => [styles.thumbWrap, pressed && styles.pressed]}
      >
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={28} color={Colors.white} />
          </View>
        </View>
      </Pressable>
      <Text style={styles.helper}>Tap to play on YouTube</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.button,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    letterSpacing: LetterSpacing.tight,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  pressed: {
    opacity: 0.8,
  },
});
