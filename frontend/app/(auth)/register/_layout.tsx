import { StyleSheet, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/src/components/auth/BackButton';
import { ProgressBar } from '@/src/components/auth/ProgressBar';
import { SkipButton } from '@/src/components/auth/SkipButton';
import { RegisterProvider, useRegister } from '@/src/context/RegisterContext';
import { Colors, Dimensions, Spacing } from '@/src/lib/colors';

const TABS_ROUTE = '/(tabs)' as unknown as Href;
const FAVORITES_ROUTE = '/(auth)/register/favorites' as unknown as Href;

const STEP_MAP: Record<string, number> = {
  email: 1,
  password: 2,
  username: 3,
  'profile-picture': 4,
  favorites: 5,
};

/**
 * Inner layout content — rendered inside RegisterProvider so it can
 * access the register context (useRegister must be inside the provider).
 */
function RegisterLayoutContent(): React.JSX.Element {
  const { reset } = useRegister();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  const lastSegment = String(segments[segments.length - 1] ?? '');
  const currentStep = STEP_MAP[lastSegment] ?? 1;
  const showSkip = currentStep >= 4;

  const handleBack = (): void => router.back();

  const handleSkip = (): void => {
    if (currentStep === 4) {
      router.push(FAVORITES_ROUTE);
    } else {
      reset();
      router.replace(TABS_ROUTE);
    }
  };

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
          keyboardHandlingEnabled: false,
        }}
      >
        <Stack.Screen name="email" />
        <Stack.Screen name="password" />
        <Stack.Screen name="username" />
        <Stack.Screen name="profile-picture" />
        <Stack.Screen name="favorites" />
      </Stack>

      <View
        pointerEvents="box-none"
        style={[styles.topBarOverlay, { top: insets.top + 10 }]}
      >
        <View style={styles.backButtonWrapper}>
          <BackButton onPress={handleBack} />
        </View>
        <ProgressBar currentStep={currentStep} totalSteps={5} />
        {showSkip ? (
          <SkipButton onPress={handleSkip} />
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>
    </View>
  );
}

/**
 * Stack layout for the register sub-group.
 * Wraps all 5 register steps in RegisterProvider so they share state.
 * Renders a persistent top bar overlay above the Stack so the back button
 * and progress bar never animate with screen transitions.
 */
export default function RegisterLayout(): React.JSX.Element {
  return (
    <RegisterProvider>
      <RegisterLayoutContent />
    </RegisterProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    zIndex: 100,
  },
  backButtonWrapper: {
    width: Dimensions.skipButtonWidth,
    alignItems: 'flex-start',
  },
  skipPlaceholder: {
    width: Dimensions.skipButtonWidth,
    height: Dimensions.skipButtonHeight,
  },
});

