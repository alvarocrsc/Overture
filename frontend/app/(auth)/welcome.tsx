import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthSheet } from '@/src/components/auth/AuthSheet';
import { PrimaryButton } from '@/src/components/auth/PrimaryButton';
import {
  Colors,
  Dimensions,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
  Spacing,
} from '@/src/lib/colors';

const HAS_VIDEO = true;
const VIDEO_SOURCE = require('@/assets/videos/welcome-bg.mp4');

/**
 * Welcome screen — first screen shown to unauthenticated users.
 * Top half: looping muted background video.
 * Bottom half: AuthSheet with Register CTA and sign-in link.
 */
export default function WelcomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const player = useVideoPlayer(HAS_VIDEO ? VIDEO_SOURCE : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.root}>
      {/* ── Background video ──────────────────────────────────── */}
      <View style={styles.videoContainer}>
        {HAS_VIDEO && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}
      </View>

      {/* ── Bottom sheet ─────────────────────────────────────── */}
      <AuthSheet>
        {/* Heading */}
        <Text style={styles.heading}>Welcome!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Please create an account to continue</Text>

        {/* Register button */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            label="Register"
            onPress={() =>
              // Route will exist once email step is created (subsequent task).
              router.push('/(auth)/register/email' as unknown as Href)
            }
          />
        </View>

        {/* Legal */}
        <Text style={[styles.legal, { marginBottom: 4 }]}>
          {'By signing in, you agree to our '}
          <Text style={styles.legalBold}>Terms of Service</Text>
          {' and '}
          <Text style={styles.legalBold}>Privacy Policy</Text>
          {'.'}
        </Text>

        {/* Sign in link */}
        <View style={[styles.signInRow, { paddingBottom: insets.bottom + 4 }]}>
          <Text style={styles.signInGray}>{'Already have an account? '}</Text>
          <Pressable
            onPress={() => router.push('/(auth)/login' as unknown as Href)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessible
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.signInBlue}>Sign in</Text>
          </Pressable>
        </View>
      </AuthSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 441,
    overflow: 'hidden',
  },
  heading: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.heading,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 32,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.subtitle,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 8,
    width: 245,
    alignSelf: 'center',
  },
  buttonRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  legal: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 16,
    width: 276,
    alignSelf: 'center',
  },
  legalBold: {
    fontFamily: FontFamily.bold,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signInGray: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  signInBlue: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.caption,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
  },
});
