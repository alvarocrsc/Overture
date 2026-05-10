import React, { useCallback, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const EDGE_HIT_SLOP = 30;
const SWIPE_DISTANCE_THRESHOLD = 60;
const SLIDE_OUT_DURATION = 280;
const COMMIT_DURATION = 220;

const PARALLAX_FACTOR = 0.25;

const BACKDROP_COLOR = '#1e1e1e';

export interface SwipeBackScreenHandle {
  /** Plays the slide-out animation then calls onNavigateBack. */
  triggerBack: () => void;
}

interface SwipeBackScreenProps {
  /**
   * Called once the slide-out animation finishes. Perform router.replace,
   * router.back, or any other navigation here.
   */
  onNavigateBack: () => void;
  animateIn?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a screen with an iOS-style swipe-from-left-edge dismissal gesture.
 *
 * Usage:
 *   const ref = useRef<SwipeBackScreenHandle>(null);
 *   <SwipeBackScreen ref={ref} onNavigateBack={navigateBack}>
 *     <Content onPressBack={() => ref.current?.triggerBack()} />
 *   </SwipeBackScreen>
 */
export const SwipeBackScreen = React.forwardRef<
  SwipeBackScreenHandle,
  SwipeBackScreenProps
>(function SwipeBackScreen({ onNavigateBack, animateIn = false, children }, ref) {
  const translateX = useSharedValue(animateIn ? SCREEN_WIDTH : 0);
  const gestureStartX = useSharedValue(0);

  useEffect(() => {
    if (animateIn) {
      translateX.value = withTiming(0, {
        duration: SLIDE_OUT_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerBack = useCallback((): void => {
    translateX.value = withTiming(
      SCREEN_WIDTH,
      { duration: SLIDE_OUT_DURATION, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onNavigateBack)();
      },
    );
  }, [translateX, onNavigateBack]);

  React.useImperativeHandle(ref, () => ({ triggerBack }), [triggerBack]);

  const swipeBack = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-15, 15])
    .onBegin((e) => {
      gestureStartX.value = e.absoluteX;
    })
    .onUpdate((e) => {
      if (gestureStartX.value <= EDGE_HIT_SLOP && e.translationX > 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (
        gestureStartX.value <= EDGE_HIT_SLOP &&
        e.translationX >= SWIPE_DISTANCE_THRESHOLD
      ) {
        translateX.value = withTiming(
          SCREEN_WIDTH,
          { duration: COMMIT_DURATION, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(onNavigateBack)();
          },
        );
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [0, SCREEN_WIDTH],
          [-SCREEN_WIDTH * PARALLAX_FACTOR, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SCREEN_WIDTH],
      [0.6, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    shadowOpacity: interpolate(
      translateX.value,
      [0, SCREEN_WIDTH * 0.5],
      [0, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={swipeBack}>
      <View style={[styles.root, animateIn && styles.rootTransparent]}>
        {animateIn ? (
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
        ) : (
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
          </Animated.View>
        )}

        {/* Main screen content */}
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKDROP_COLOR,
  },
  rootTransparent: {
    backgroundColor: 'transparent',
  },
  backdrop: {
    backgroundColor: BACKDROP_COLOR,
  },
  scrim: {
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowRadius: 12,
  },
});
