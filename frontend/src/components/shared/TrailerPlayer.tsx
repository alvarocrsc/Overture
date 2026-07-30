import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { useTitleTrailer } from '@/src/hooks/useTitleTrailer';
import type { MediaType } from '@/src/types/lists.types';

interface TrailerPlayerProps {
  /** Whether the title is a film or a series. */
  mediaType: MediaType;
  /** The TMDB id of the title whose trailer to play. */
  tmdbId: number;
}

/**
 * Inline YouTube trailer player shared by the film and series Trailer tabs.
 *
 * Renders the resolved trailer as an embedded YouTube iframe inside a WebView,
 * occupying the same 16:9 area the old thumbnail did, so playback happens
 * in-app rather than deep-linking out to YouTube. Playback is not autoplayed —
 * the user taps the player's own play button — and the player's native
 * fullscreen control hands off to the platform's fullscreen video presentation.
 */
export default function TrailerPlayer({
  mediaType,
  tmdbId,
}: TrailerPlayerProps): React.JSX.Element {
  const { data: trailerKey, isLoading } = useTitleTrailer(mediaType, tmdbId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (!trailerKey) {
    return (
      <View style={styles.center}>
        <Ionicons name="film-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.emptyLabel}>No trailer available</Text>
      </View>
    );
  }

  // playsinline keeps playback in-frame until the user opts into fullscreen;
  // controls + fs expose YouTube's own play and fullscreen buttons; rel=0,
  // modestbranding and iv_load_policy trim related videos, branding and
  // annotations.
  const embedUrl = `https://www.youtube.com/embed/${trailerKey}?playsinline=1&controls=1&modestbranding=1&rel=0&fs=1&iv_load_policy=3`;

  // TODO(trailer-fullscreen): verify on a physical iOS device that the player's
  // native fullscreen rotates to landscape. If it does not, the cause is the
  // app's `orientation: "portrait"` lock in app.json — the fix is to set it to
  // "default" app-wide, or to scope landscape support to this screen with
  // expo-screen-orientation. Not implemented preemptively: simulator fullscreen
  // behaviour differs from a physical device.
  return (
    <View style={styles.container}>
      <View style={styles.trailerContainer}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.trailerWebview}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator color={Colors.white} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  trailerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.button,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  trailerWebview: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
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
});
