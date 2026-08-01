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
          // The embed is hosted inside a local HTML document with an https
          // `baseUrl` rather than loaded as `{ uri }` directly: a top-level
          // embed navigation carries no Referer/origin, which YouTube rejects
          // with "Error 153 — video player configuration error". This mirrors
          // the ambient Discover player, which embeds the same way.
          source={{ html: buildTrailerHtml(trailerKey), baseUrl: EMBED_BASE_URL }}
          style={styles.trailerWebview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          userAgent={EMBED_USER_AGENT}
          startInLoadingState
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

/**
 * Neutral https origin for the hosting document. YouTube only needs a valid
 * http(s) referrer — the page itself is local, so no request is made to it.
 */
const EMBED_BASE_URL = 'https://www.example.com';

/** iOS Safari UA so YouTube serves its mobile-compatible player. */
const EMBED_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/**
 * Builds the HTML document hosting the trailer iframe.
 *
 * `controls` and `fs` expose YouTube's own play and fullscreen buttons;
 * `playsinline` keeps playback in-frame until the user opts into fullscreen.
 * No `autoplay` param is set, so the first frame is YouTube's poster image
 * until the user presses play. `rel`, `modestbranding` and `iv_load_policy`
 * trim related videos, branding and annotations.
 *
 * @param videoId - The YouTube video ID to embed.
 * @returns A self-contained HTML document string.
 */
function buildTrailerHtml(videoId: string): string {
  const params =
    'playsinline=1&controls=1&modestbranding=1&rel=0&fs=1&iv_load_policy=3';
  // Encoded so the id can never break out of the src attribute.
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { display: block; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${src}"
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
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
    backgroundColor: '#000',
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
