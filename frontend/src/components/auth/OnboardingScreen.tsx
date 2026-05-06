import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Dimensions, Spacing } from '@/src/lib/colors';
import { BackButton } from './BackButton';
import { PrimaryButton } from './PrimaryButton';
import { ProgressBar } from './ProgressBar';
import { SkipButton } from './SkipButton';

interface OnboardingScreenProps {
  currentStep: number;
  totalSteps: number;
  /** Called when the skip button is pressed. Not rendered if undefined. */
  onSkip?: () => void;
  /** Called when the continue button is pressed. */
  onContinue: () => void;
  /** Label for the continue button. Defaults to "Continue". */
  continueLabel?: string;
  /** Disables the continue button when true. */
  continueDisabled?: boolean;
  /** Shows a spinner on the continue button when true. */
  continueLoading?: boolean;
  /** Called when the back button is pressed. Defaults to router.back(). */
  onBack?: () => void;
  /**
   * When true, hides the Continue button entirely. The Skip button in the
   * top bar is unaffected. Use when the screen manages its own custom
   * continue affordance (e.g. an animated button that appears after a
   * condition is met).
   * Defaults to false.
   */
  hideContinue?: boolean;
  /**
   * When true, replaces the top bar with a transparent spacer of equal height
   * (insets.top + 10 + 44). Use on screens inside a layout that renders
   * its own persistent top bar overlay so vertical space is preserved without
   * double-rendering the bar elements.
   * Defaults to false.
   */
  hideTopBar?: boolean;
  /**
   * When false, children are rendered in a plain View without a ScrollView
   * or KeyboardAvoidingView. Use this when the screen manages its own
   * scrollable list (e.g. an infinite FlatList).
   * Defaults to true.
   */
  scrollable?: boolean;
  children: React.ReactNode;
}

/**
 * Shared wrapper for every step in the multi-step register flow.
 * Renders a top bar (BackButton, ProgressBar, optional SkipButton),
 * a scrollable content area, and a fixed Continue button at the bottom.
 * Handles SafeAreaView insets and keyboard avoidance.
 *
 * @param currentStep - Active step number (1-based).
 * @param totalSteps - Total number of steps.
 * @param onSkip - Optional skip handler. If omitted the Skip button is hidden.
 * @param onContinue - Continue button press handler.
 * @param continueLabel - Continue button label. Defaults to "Continue".
 * @param continueDisabled - Disables the continue button.
 * @param continueLoading - Shows a loading spinner on the continue button.
 * @param onBack - Custom back handler. Defaults to router.back().
 * @param hideTopBar - When true replaces the top bar with a height-matching spacer.
 * @param children - Screen content (heading, subtitle, input, etc.).
 */
export function OnboardingScreen({
  currentStep,
  totalSteps,
  onSkip,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  continueLoading = false,
  onBack,
  hideContinue = false,
  hideTopBar = false,
  scrollable = true,
  children,
}: OnboardingScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      {hideTopBar ? (
        /*
         * When the parent layout renders a persistent overlay top bar,
         * replace the bar with a spacer of the exact same height so the
         * KeyboardAvoidingView and content area dimensions are unchanged.
         * Height = safe area top + 10 (layout offset) + 44 (bar height).
         */
        <View style={{ height: insets.top + 10 + 44 }} />
      ) : (
        <View style={[styles.topBar, { marginTop: insets.top + 10 }]}>
          {/* Fixed-width wrapper keeps ProgressBar truly centred */}
          <View style={styles.backButtonWrapper}>
            <BackButton onPress={onBack} />
          </View>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          {onSkip ? (
            <SkipButton onPress={onSkip} />
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      )}

      {/* ── Content area ────────────────────────────────────── */}
      {scrollable ? (
        /*
         * KeyboardAvoidingView (behavior="padding") shrinks the container in
         * sync with the keyboard via Reanimated on the UI thread (Fabric).
         * justifyContent:"center" recenters within the smaller space —
         * content shifts up/down animated, matching the button's motion.
         */
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /*
         * Non-scrollable mode: children are responsible for their own
         * scrolling (e.g. an infinite FlatList). Rendered in a plain
         * flex View so the FlatList fills the available space.
         */
        <View style={styles.flex}>{children}</View>
      )}

      {/* ── Continue button — sticks to keyboard top ─────────── */}
      {/*
       * KeyboardStickyView translates the button up/down using the same
       * native animation channel as KeyboardAvoidingView — perfectly synced.
       */}
      {!hideContinue && (
        <KeyboardStickyView offset={{ closed: 0, opened: 8 }}>
          <View style={[styles.bottom, { paddingBottom: insets.bottom }]}>
            <PrimaryButton
              label={continueLabel}
              onPress={onContinue}
              disabled={continueDisabled}
              loading={continueLoading}
            />
          </View>
        </KeyboardStickyView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    height: 44,
  },
  backButtonWrapper: {
    width: Dimensions.skipButtonWidth,
    alignItems: 'flex-start',
  },
  skipPlaceholder: {
    width: Dimensions.skipButtonWidth,
    height: Dimensions.skipButtonHeight,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 24,
  },
  bottom: {
    alignItems: 'center',
    paddingTop: 12,
  },
});
