import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';

import ZoomableImage from '@/src/components/shared/ZoomableImage';
import { originalImageUrl } from '@/src/lib/tmdb';

/** TMDB posters are a consistent 2:3. */
const POSTER_ASPECT_RATIO = 2 / 3;

/** How much of the screen the poster occupies, whichever limit is hit first. */
const POSTER_WIDTH_RATIO = 0.78;
const POSTER_MAX_HEIGHT_RATIO = 0.72;

/** Strength of the blur applied over the screen behind. */
const BLUR_INTENSITY = 60;

/** Opening transition. Critically damped, so it settles without wobbling. */
const OPEN_SPRING = { duration: 340, dampingRatio: 1 } as const;
/** Scale the poster grows from as it fades in. */
const ENTER_SCALE = 0.88;

const EXIT_DURATION = 200;

/** Drag distance (px) or vertical velocity past which a swipe dismisses. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 700;

/** Movement needed before a drag counts as a dismiss rather than a tap. */
const PAN_ACTIVATION_SLOP = 12;

const RELEASE_SPRING = { duration: 320, dampingRatio: 1 } as const;

interface PosterViewerProps {
  /** TMDB poster path; the full-resolution URL is derived from it. */
  posterPath: string;
  onClose: () => void;
  /** Long press on the poster — opens the share sheet. */
  onLongPress: (posterPath: string) => void;
}

/**
 * Enlarged poster presented over a blurred copy of the screen behind it.
 *
 * Dismisses on a swipe in either direction or a tap outside the poster, and the
 * poster itself can be pinched or double-tapped to zoom. Everything fades and
 * scales from one shared progress value, so the blur, the poster and its scale
 * always move together.
 *
 * Mounted only while open — the parent renders it conditionally.
 */
export default function PosterViewer({
  posterPath,
  onClose,
  onLongPress,
}: PosterViewerProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const uri = originalImageUrl(posterPath) ?? undefined;

  /** 0 while hidden, 1 while fully open — drives blur, fade and scale together. */
  const progress = useSharedValue(0);
  /** Vertical offset from the dismiss drag. */
  const dragY = useSharedValue(0);
  /** While zoomed, drags pan the poster instead of dismissing. */
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    progress.value = withSpring(1, OPEN_SPRING);
  }, [progress]);

  /** Fades everything out, then unmounts via the parent. */
  const close = useCallback((): void => {
    progress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [onClose, progress]);

  /** Largest poster that fits both limits, keeping the 2:3 ratio. */
  const poster = useMemo(() => {
    const posterWidth = Math.min(
      width * POSTER_WIDTH_RATIO,
      height * POSTER_MAX_HEIGHT_RATIO * POSTER_ASPECT_RATIO,
    );
    return { width: posterWidth, height: posterWidth / POSTER_ASPECT_RATIO };
  }, [width, height]);

  // Either direction dismisses. Suspended while zoomed, where the poster's own
  // pan takes over, and limited to one finger so a pinch cannot start a drag.
  const dismissGesture = Gesture.Pan()
    .enabled(!isZoomed)
    .maxPointers(1)
    .activeOffsetY([-PAN_ACTIVATION_SLOP, PAN_ACTIVATION_SLOP])
    .onUpdate((event) => {
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      const shouldDismiss =
        Math.abs(event.translationY) > DISMISS_DISTANCE ||
        Math.abs(event.velocityY) > DISMISS_VELOCITY;

      if (shouldDismiss) {
        // Dissolve in place: `dragY` is left alone so the poster fades from
        // where the finger released it.
        progress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
        return;
      }
      dragY.value = withSpring(0, RELEASE_SPRING);
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const posterStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: dragY.value },
      { scale: interpolate(progress.value, [0, 1], [ENTER_SCALE, 1]) },
    ],
  }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      {/* A native Modal renders outside the app's root view, so gesture-handler
          needs its own root here for the dismiss gesture to receive touches. */}
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" />

        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={BLUR_INTENSITY}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Fills the screen beneath the poster, so any tap that misses the
            poster lands here and dismisses. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss poster"
        />

        <Animated.View style={[styles.center, posterStyle]} pointerEvents="box-none">
          <GestureDetector gesture={dismissGesture}>
            <Animated.View style={poster}>
              <ZoomableImage
                uri={uri}
                filePath={posterPath}
                width={poster.width}
                height={poster.height}
                aspectRatio={POSTER_ASPECT_RATIO}
                onZoomChange={setIsZoomed}
                onLongPress={onLongPress}
              />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
