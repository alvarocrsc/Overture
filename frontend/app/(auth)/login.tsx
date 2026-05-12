import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { AuthSheet } from '@/src/components/auth/AuthSheet';
import { OutlinedInput } from '@/src/components/auth/OutlinedInput';
import { PrimaryButton } from '@/src/components/auth/PrimaryButton';
import { useAuth } from '@/src/context/AuthContext';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
  Spacing,
} from '@/src/lib/colors';

const HAS_VIDEO = true;
const VIDEO_SOURCE = require('@/assets/videos/welcome-bg.mp4');

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login screen — shown when the user taps "Sign in" from Welcome.
 * Top half: same looping muted background video.
 * Bottom half: AuthSheet with email + password inputs and a Sign in CTA.
 */
export default function LoginScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const player = useVideoPlayer(HAS_VIDEO ? VIDEO_SOURCE : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const keyboardBottom = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardBottom.value = withTiming(e.endCoordinates.height, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardBottom.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardBottom]);

  const sheetStyle = useAnimatedStyle(() => ({
    bottom: keyboardBottom.value,
  }));

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong. Please try again.';
      setError('password', { message });
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Background video — tap anywhere here to dismiss keyboard ── */}
      <Pressable
        style={styles.videoContainer}
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        {HAS_VIDEO && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}
      </Pressable>

      {/* ── Bottom sheet — lifts above keyboard when active ──── */}
      <AuthSheet style={sheetStyle}>
        <Text style={styles.heading}>Sign in</Text>
        <Text style={styles.subtitle}>Your watchlist has been waiting.</Text>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <OutlinedInput
                value={value}
                onChangeText={onChange}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email ? (
            <Text style={styles.inputError}>{errors.email.message}</Text>
          ) : null}
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <OutlinedInput
                value={value}
                onChangeText={onChange}
                placeholder="Password"
                secureTextEntry
                showToggle
              />
            )}
          />
          {errors.password ? (
            <Text style={styles.inputError}>{errors.password.message}</Text>
          ) : null}
        </View>

        {/* Submit */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            label="Sign in"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </View>

        {/* Legal / sign-up link */}
        <Text style={[styles.legal, { marginBottom: 4 }]}>
          {'By signing in, you agree to our '}
          <Text style={styles.legalBold}>Terms of Service</Text>
          {' and '}
          <Text style={styles.legalBold}>Privacy Policy</Text>
          {'.'}
        </Text>

        <View style={[styles.registerRow, { paddingBottom: insets.bottom + 4 }]}>
          <Text style={styles.registerGray}>{"Don't have an account? "}</Text>
          <Pressable
            onPress={() =>
              router.push('/(auth)/register/email' as unknown as Href)
            }
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessible
            accessibilityRole="link"
            accessibilityLabel="Register"
          >
            <Text style={styles.registerBlue}>Register</Text>
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
    fontSize: 28,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 28,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.subtitle,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 6,
  },
  inputWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  inputError: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.errorRed,
    letterSpacing: LetterSpacing.tight,
    marginTop: 4,
    alignSelf: 'flex-start',
    marginLeft: Spacing.screenH,
  },
  buttonRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  legal: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 14,
    width: 276,
    alignSelf: 'center',
  },
  legalBold: {
    fontFamily: FontFamily.bold,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  registerGray: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  registerBlue: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.caption,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
  },
});
