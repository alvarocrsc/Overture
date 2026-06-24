import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import {
  useSafeAreaInsets,
  type EdgeInsets,
} from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';
// `expo-file-system`'s top-level export is the new File/Directory API in SDK 55;
// downloadAsync / cacheDirectory / getInfoAsync live under the `/legacy` entry.
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

import { BackButton } from '@/src/components/auth/BackButton';
import { PrimaryButton } from '@/src/components/auth/PrimaryButton';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
  Spacing,
} from '@/src/lib/colors';
import { useUploadImport } from '@/src/hooks/use-import';
import { useImport } from '@/src/context/ImportContext';

/** The Letterboxd sign-in page, redirected to the export page once authenticated. */
const SIGN_IN_URL = 'https://letterboxd.com/sign-in/?next=/data/export/';
/** The page that serves the export ZIP — navigation here means login succeeded. */
const EXPORT_URL = 'https://letterboxd.com/data/export/';
/** Mimic iOS Safari so Letterboxd serves the same response a browser would. */
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** Origin every Letterboxd URL shares; used to classify in-WebView navigations. */
const LETTERBOXD_ORIGIN = 'https://letterboxd.com';
/**
 * Path prefixes that are part of the sign-in flow itself (or Cloudflare's
 * challenge). Landing on any *other* letterboxd.com page means the AJAX login
 * succeeded — Letterboxd ignores `?next=` and bounces to the homepage, so we
 * can't rely on reaching the export URL to know we're authenticated.
 */
const AUTH_PATH_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/create-account',
  '/forgotten-password',
  '/cdn-cgi',
];

/** True once the WebView lands on a logged-in Letterboxd page (not an auth page). */
function isLoggedInLanding(url: string): boolean {
  if (!url.startsWith(LETTERBOXD_ORIGIN)) return false;
  const path = url.slice(LETTERBOXD_ORIGIN.length);
  return !AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

type Phase = 'landing' | 'webview' | 'downloading' | 'error';

/**
 * Import from Letterboxd screen.
 *
 * Walks the user through logging into Letterboxd inside a WebView, then
 * silently extracts the native session cookies, downloads the export ZIP with
 * them, uploads it to the backend, and polls the resulting import job —
 * without the user ever touching a file picker.
 */
export default function LetterboxdImportScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('landing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const uploadImport = useUploadImport();
  const { startTracking } = useImport();

  /**
   * Extracts the WKWebView session cookies, downloads the export ZIP with them,
   * uploads it, then hands the new job to the app-wide tracker and returns the
   * user to the app — progress is shown by the floating banner from there.
   */
  const handleLoginSuccess = useCallback(async (): Promise<void> => {
    setPhase('downloading');
    try {
      // @react-native-cookies/cookies bridges WKWebView cookies so they can be
      // attached to the download request below (the session cookie is httpOnly
      // and so unreachable from injected JavaScript).
      const cookies = await CookieManager.get('https://letterboxd.com', true);
      if (Object.keys(cookies).length === 0) {
        throw new Error('No cookies found after login. Please try again.');
      }
      const cookieString = Object.values(cookies)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        throw new Error('No writable cache directory is available.');
      }
      const destUri = `${cacheDir}letterboxd-${Date.now()}.zip`;

      const downloadResult = await FileSystem.downloadAsync(EXPORT_URL, destUri, {
        headers: {
          Cookie: cookieString,
          'User-Agent': IOS_SAFARI_UA,
          Accept: 'application/zip, application/octet-stream, */*',
        },
      });

      if (downloadResult.status !== 200) {
        throw new Error(
          `Letterboxd returned status ${downloadResult.status}. Your session may have expired — please try again.`,
        );
      }

      // Guard against an HTML error page being saved instead of a ZIP.
      const info = await FileSystem.getInfoAsync(downloadResult.uri);
      if (!info.exists || info.size < 1000) {
        throw new Error('The downloaded file appears to be empty. Please try again.');
      }

      const jobId = await uploadImport.mutateAsync(downloadResult.uri);
      void FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(
        () => {},
      );

      // Track the job app-wide and drop the user onto their profile; the
      // floating ImportProgressBanner shows live progress until it completes.
      startTracking(jobId);
      router.replace('/(tabs)/profile');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
      setPhase('error');
    }
  }, [uploadImport, startTracking]);

  const handleRetry = useCallback((): void => {
    // Clearing cookies also ends the Letterboxd session so a fresh login runs.
    void CookieManager.clearAll();
    setErrorMessage('');
    setPhase('landing');
  }, []);

  if (phase === 'webview') {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <WebViewPhase
          insets={insets}
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setPhase('landing')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {phase === 'landing' && (
        <LandingPhase onConnect={() => setPhase('webview')} />
      )}
      {phase === 'downloading' && (
        <CenteredStatus text="Downloading your Letterboxd data…" />
      )}
      {phase === 'error' && (
        <ErrorPhase
          message={errorMessage}
          insets={insets}
          onRetry={handleRetry}
        />
      )}
    </View>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

/** Intro screen explaining the import and offering the Connect button. */
function LandingPhase({ onConnect }: { onConnect: () => void }): React.JSX.Element {
  return (
    <View style={styles.landing}>
      <View style={styles.header}>
        <View style={styles.backButton}>
          <BackButton />
        </View>
        <Text style={styles.title}>Import from{'\n'}Letterboxd</Text>
      </View>

      <View style={styles.landingBody}>
        <Text style={styles.bodyText}>
          Bring your Letterboxd history into Overture. We&apos;ll import your:
        </Text>
        <View style={styles.bulletList}>
          <Bullet label="Ratings and watch dates" />
          <Bullet label="Watchlist" />
          <Bullet label="Liked films" />
          <Bullet label="Written reviews" />
        </View>
        <Text style={styles.bodyText}>
          You&apos;ll sign in to Letterboxd on the next screen so we can fetch your
          export. Overture never sees or stores your Letterboxd password.
        </Text>
      </View>

      <View style={styles.landingFooter}>
        <PrimaryButton label="Connect Letterboxd" onPress={onConnect} />
      </View>
    </View>
  );
}

/** A single labelled bullet row. */
function Bullet({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={18} color={Colors.accentBlue} />
      <Text style={styles.bulletText}>{label}</Text>
    </View>
  );
}

// ─── WebView ─────────────────────────────────────────────────────────────────

interface WebViewPhaseProps {
  insets: EdgeInsets;
  onLoginSuccess: () => Promise<void>;
  onCancel: () => void;
}

/** Full-screen Letterboxd login with a Cancel overlay and export-URL intercept. */
function WebViewPhase({
  insets,
  onLoginSuccess,
  onCancel,
}: WebViewPhaseProps): React.JSX.Element {
  // The homepage emits several navigation-state updates as it settles, so guard
  // against kicking off the download more than once.
  const handledLogin = useRef(false);

  const triggerLogin = useCallback((): void => {
    if (handledLogin.current) return;
    handledLogin.current = true;
    void onLoginSuccess();
  }, [onLoginSuccess]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation): void => {
      // Letterboxd's AJAX sign-in ignores `?next=` and redirects to the
      // homepage. Leaving the auth pages for any other letterboxd.com page is
      // our signal that the session cookies now exist and we can download.
      if (isLoggedInLanding(navState.url)) {
        triggerLogin();
      }
    },
    [triggerLogin],
  );

  return (
    <View style={[styles.webviewWrap, { paddingTop: insets.top }]}>
      <WebView
        source={{ uri: SIGN_IN_URL }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        userAgent={IOS_SAFARI_UA}
        // Letterboxd's login renders a Cloudflare challenge inside an
        // `about:srcdoc` iframe. The default originWhitelist (http/https only)
        // makes the WebView hand non-matching URLs to Linking.openURL, which
        // fails for `about:srcdoc` and leaves the login hung. Allowing all
        // origins keeps every navigation inside the WebView.
        originWhitelist={['*']}
        // Some sign-in buttons call window.open / target="_blank"; load those
        // in place instead of attempting (and failing) to spawn a new window.
        setSupportMultipleWindows={false}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={(request) => {
          // Safety net: if Letterboxd ever does honour `?next=` and navigates
          // straight to the export endpoint, intercept it so the WebView
          // doesn't try to render the binary ZIP. Login is normally detected by
          // onNavigationStateChange above.
          if (
            request.url === EXPORT_URL ||
            request.url.startsWith('https://letterboxd.com/data/export?')
          ) {
            triggerLogin();
            return false;
          }
          return true;
        }}
      />
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [
          styles.cancelButton,
          { top: insets.top + 8 },
          pressed && styles.pressed,
        ]}
        hitSlop={8}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

// ─── Downloading ─────────────────────────────────────────────────────────────

/** Centered spinner with a status line, used while downloading. */
function CenteredStatus({ text }: { text: string }): React.JSX.Element {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.white} size="large" />
      <Text style={styles.centeredText}>{text}</Text>
    </View>
  );
}

// ─── Error ───────────────────────────────────────────────────────────────────

interface ErrorPhaseProps {
  message: string;
  insets: EdgeInsets;
  onRetry: () => void;
}

/** Error state with the failure message and a retry that forces a fresh login. */
function ErrorPhase({ message, insets, onRetry }: ErrorPhaseProps): React.JSX.Element {
  return (
    <View style={styles.phaseBody}>
      <View style={styles.centered}>
        <Ionicons name="cloud-offline" size={56} color={Colors.errorRed} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          {message || 'An unexpected error occurred.'}
        </Text>
      </View>
      <View style={[styles.phaseFooter, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Try again" onPress={onRetry} />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.heading,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  // Landing
  landing: {
    flex: 1,
  },
  landingBody: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
    gap: 20,
  },
  bodyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 22,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  bulletList: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  landingFooter: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: 16,
    paddingBottom: 100,
    alignItems: 'center',
  },
  // WebView
  webviewWrap: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cancelButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(18,18,18,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.searchBar,
  },
  cancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  // Shared phase layout
  phaseBody: {
    flex: 1,
  },
  phaseFooter: {
    paddingHorizontal: Spacing.screenH,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  centeredText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  // Error
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.inputLarge,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  errorMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.7,
  },
});
