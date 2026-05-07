import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

interface Props {
  videoId: string;
  width: number;
  height: number;
  muted: boolean;
  onReady?: () => void;
}

/**
 * Chrome-free YouTube player built on top of the YouTube IFrame Player API,
 * hosted inside `react-native-webview`. Uses the `youtube-nocookie.com`
 * embed host and a neutral `baseUrl`
 *
 * Behaviour:
 * - Loads muted 
 * - Waits until the player has buffered ~25% (or 10 seconds) of the video
 *   before signalling `onReady`, so playback doesn't stutter once visible.
 * - Loops automatically by replaying on the `ended` state.
 * - Mute is toggled programmatically via `injectJavaScript` calling the
 *   IFrame API's `mute()` / `unMute()` methods.
 */
function YoutubeBackgroundPlayer({
  videoId,
  width,
  height,
  muted,
  onReady,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(
    () => buildHtml(videoId, width, height),
    [videoId, width, height],
  );

  useEffect(() => {
    if (!webViewRef.current || !ready) return;
    const cmd = muted ? 'mute' : 'unMute';
    webViewRef.current.injectJavaScript(`
      (function() {
        try { if (window.__player && window.__player.${cmd}) window.__player.${cmd}(); } catch (e) {}
        true;
      })();
    `);
  }, [muted, ready]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type: string };
      if (data.type === 'ready' && !ready) {
        setReady(true);
        onReady?.();
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://www.example.com' }}
        style={[styles.webview, { width, height }]}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        onMessage={onMessage}
      />
    </View>
  );
}

/**
 * Builds the HTML payload that hosts the YouTube IFrame Player. 
 */
function buildHtml(videoId: string, width: number, height: number): string {
  const overscan = 1.4;
  const iframeW = Math.round(width * overscan);
  const iframeH = Math.round(height * overscan);
  const offsetX = Math.round((iframeW - width) / 2);
  const offsetY = Math.round((iframeH - height) / 2);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
        background: #000;
        overflow: hidden;
      }
      .stage {
        position: absolute;
        left: -${offsetX}px;
        top: -${offsetY}px;
        width: ${iframeW}px;
        height: ${iframeH}px;
      }
      .stage iframe {
        width: 100%;
        height: 100%;
        border: 0;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="stage"><div id="player"></div></div>
    <script>
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);

      function post(msg) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }

      var notifiedReady = false;
      var bufferTimer = null;

      function checkBuffer() {
        try {
          if (!window.__player || !window.__player.getVideoLoadedFraction) return;
          var fraction = window.__player.getVideoLoadedFraction() || 0;
          var duration = (window.__player.getDuration && window.__player.getDuration()) || 0;
          var bufferedSeconds = fraction * duration;
          // Ready when at least 25% of the video is buffered, or at least
          // 10 seconds of headroom, whichever is smaller. Short trailers
          // hit the fraction first; long ones hit the seconds threshold.
          var enoughFraction = fraction >= 0.25;
          var enoughSeconds = bufferedSeconds >= 10;
          if ((enoughFraction || enoughSeconds) && !notifiedReady) {
            notifiedReady = true;
            if (bufferTimer) { clearInterval(bufferTimer); bufferTimer = null; }
            post({ type: 'ready' });
          }
        } catch (e) {}
      }

      window.onYouTubeIframeAPIReady = function () {
        window.__player = new YT.Player('player', {
          host: 'https://www.youtube-nocookie.com',
          videoId: '${videoId}',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            mute: 1,
            cc_load_policy: 0,
            playlist: '${videoId}',
            loop: 1
          },
          events: {
            onReady: function (e) {
              try { e.target.mute(); } catch (err) {}
              try { e.target.playVideo(); } catch (err) {}
              // Start polling the buffer; resolve once it's healthy enough.
              bufferTimer = setInterval(checkBuffer, 250);
              // Hard fallback so we never hang forever if buffer reporting
              // misbehaves on a particular network.
              setTimeout(function () {
                if (!notifiedReady) {
                  notifiedReady = true;
                  if (bufferTimer) { clearInterval(bufferTimer); bufferTimer = null; }
                  post({ type: 'ready' });
                }
              }, 4000);
            },
            onStateChange: function (e) {
              if (e.data === 0) {
                // Manual loop — playlist+loop is unreliable on iOS WebView.
                try { e.target.seekTo(0); e.target.playVideo(); } catch (err) {}
              }
            }
          }
        });
      };
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

export default YoutubeBackgroundPlayer;
