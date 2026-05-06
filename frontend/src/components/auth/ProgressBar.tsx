import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Colors,
  Dimensions,
  Radius,
} from '@/src/lib/colors';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Pill-shaped progress indicator for the multi-step register flow.
 * The filled portion animates with a spring transition whenever
 * currentStep changes.
 *
 * @param currentStep - The current step (1-based).
 * @param totalSteps - Total number of steps.
 */
export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps): React.JSX.Element {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    const target = ((currentStep - 1) / totalSteps) * Dimensions.progressBarWidth;

    if (currentStep === 1) {
      fillWidth.value = withTiming(target, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      fillWidth.value = withSpring(target, { damping: 20, stiffness: 200 });
    }
  }, [currentStep, totalSteps, fillWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: Dimensions.progressBarWidth,
    height: Dimensions.progressBarHeight,
    borderRadius: Radius.progress,
    backgroundColor: Colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: Dimensions.progressBarHeight,
    borderRadius: Radius.progress,
    backgroundColor: Colors.progressFill,
  },
});
