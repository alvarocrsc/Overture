import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { LONG_PRESS_DELAY } from '@/src/lib/colors';

/** Zoom bounds. 1 is "fit to screen". */
const MIN_SCALE = 1;
const MAX_SCALE = 4;

/** Scale a double tap zooms to. */
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Scale above which the image counts as zoomed. Slightly above 1 so a stray
 * pinch that barely moves settles back to exactly fit rather than leaving the
 * image imperceptibly scaled and paging disabled.
 */
const ZOOMED_THRESHOLD = 1.01;

/**
 * How much of a pinch beyond the zoom bounds is actually applied. Keeping some
 * response past the limit means the image goes on growing under the fingers
 * instead of freezing — and, crucially, that easing back off a hard-clamped
 * pinch does not immediately shrink the image.
 */
const OVERSHOOT_RESISTANCE = 0.25;

/**
 * Settle animation for zoom and for snapping back inside the bounds.
 *
 * `dampingRatio: 1` is critically damped — the fastest settle that never
 * overshoots, so the image glides to rest instead of wobbling past it. Scale
 * and translation share the config so they always finish together, however far
 * each has to travel.
 */
const ZOOM_SPRING = { duration: 300, dampingRatio: 1 } as const;

/** Fallback aspect ratio when TMDB reports unusable dimensions. */
const FALLBACK_ASPECT_RATIO = 16 / 9;

interface ZoomableImageProps {
  /** Full-resolution image URL, or undefined when the path could not be resolved. */
  uri: string | undefined;
  /**
   * Lower-resolution URL shown until the full-resolution one arrives. Passing
   * the size the grid already displayed means it is served from cache, so the
   * image appears instantly and then sharpens rather than starting blank.
   * Omit when the full-resolution image is already cached.
   */
  previewUri?: string | undefined;
  /**
   * Identifier for this image, handed straight back to `onLongPress`. Passing it
   * through means the carousel can supply one shared callback instead of a fresh
   * closure per page, which is what lets this component stay memoised.
   */
  filePath?: string;
  /** Page size; the image is contain-fitted inside it. */
  width: number;
  height: number;
  /** The image's intrinsic aspect ratio (width / height). */
  aspectRatio: number;
  /**
   * Called when the image becomes zoomed or returns to fit. The carousel uses
   * this to suspend paging and swipe-to-dismiss while zoomed, so drags pan the
   * image instead.
   */
  onZoomChange: (isZoomed: boolean) => void;
  /** Long press on the image — opens the share sheet. Omit to disable. */
  onLongPress?: (filePath: string) => void;
}

/**
 * Furthest the image can be moved from centre on one axis before its edge would
 * come inside the frame.
 *
 * Measured against the *rendered* image, not the page. A contain-fitted image
 * is usually letterboxed on one axis, and measuring against the page there
 * would allow dragging the picture clean out of view.
 */
function offsetLimit(rendered: number, container: number, scale: number): number {
  'worklet';
  return Math.max((rendered * scale - container) / 2, 0);
}

/** Applies resistance to a pinch that has gone past the zoom bounds. */
function resistPastBounds(value: number): number {
  'worklet';
  if (value > MAX_SCALE) {
    return MAX_SCALE + (value - MAX_SCALE) * OVERSHOOT_RESISTANCE;
  }
  if (value < MIN_SCALE) {
    return MIN_SCALE - (MIN_SCALE - value) * OVERSHOOT_RESISTANCE;
  }
  return value;
}

/**
 * A single carousel page: an image that can be pinched to zoom, double-tapped
 * to zoom in on a point (or back out when already zoomed), and dragged around
 * once zoomed.
 *
 * Pinching past the zoom limits stretches with resistance and springs back on
 * release, so the limit is felt rather than hit as a wall. Panning is clamped
 * to the rendered image's own edges, so it can never be dragged out of view,
 * and is only enabled while zoomed — which is what keeps the gestures from
 * competing: at fit scale a drag belongs to the carousel (sideways to page,
 * down to dismiss), and only a zoomed image takes drags over for itself.
 */
function ZoomableImage({
  uri,
  previewUri,
  filePath,
  width,
  height,
  aspectRatio,
  onZoomChange,
  onLongPress,
}: ZoomableImageProps): React.JSX.Element {
  const scale = useSharedValue(MIN_SCALE);
  const savedScale = useSharedValue(MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  /** Mirrors `isZoomed` on the UI thread so transitions are only reported once. */
  const zoomedShared = useSharedValue(false);

  const [isZoomed, setIsZoomed] = useState(false);

  /** The contain-fitted size the image actually occupies at scale 1. */
  const rendered = useMemo(() => {
    const ratio =
      Number.isFinite(aspectRatio) && aspectRatio > 0
        ? aspectRatio
        : FALLBACK_ASPECT_RATIO;
    return ratio > width / height
      ? { width, height: width / ratio }
      : { width: height * ratio, height };
  }, [aspectRatio, width, height]);

  const handleZoomChange = useCallback(
    (zoomed: boolean): void => {
      setIsZoomed(zoomed);
      onZoomChange(zoomed);
    },
    [onZoomChange],
  );

  /** Reports a zoom transition to JS, but only when the state actually flips. */
  const setZoomed = (zoomed: boolean): void => {
    'worklet';
    if (zoomed === zoomedShared.value) return;
    zoomedShared.value = zoomed;
    runOnJS(handleZoomChange)(zoomed);
  };

  /** Pan limits for a given scale, in the image's own terms. */
  const limitsFor = (
    value: number,
  ): { x: number; y: number } => {
    'worklet';
    return {
      x: offsetLimit(rendered.width, width, value),
      y: offsetLimit(rendered.height, height, value),
    };
  };

  /** Animates back to a centred, screen-fitting image. */
  const resetZoom = (): void => {
    'worklet';
    scale.value = withSpring(MIN_SCALE, ZOOM_SPRING);
    translateX.value = withSpring(0, ZOOM_SPRING);
    translateY.value = withSpring(0, ZOOM_SPRING);
    savedScale.value = MIN_SCALE;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setZoomed(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = resistPastBounds(savedScale.value * event.scale);
      // Bounds shrink as the image does, so keep it inside them continuously
      // rather than letting an edge drift in and snap back at the end.
      const limits = limitsFor(scale.value);
      translateX.value = clamp(translateX.value, -limits.x, limits.x);
      translateY.value = clamp(translateY.value, -limits.y, limits.y);
      setZoomed(scale.value > ZOOMED_THRESHOLD);
    })
    .onEnd(() => {
      // Spring back from any overshoot to a scale that is actually allowed.
      const settled = clamp(scale.value, MIN_SCALE, MAX_SCALE);
      if (settled < ZOOMED_THRESHOLD) {
        resetZoom();
        return;
      }
      const limits = limitsFor(settled);
      const nextX = clamp(translateX.value, -limits.x, limits.x);
      const nextY = clamp(translateY.value, -limits.y, limits.y);
      scale.value = withSpring(settled, ZOOM_SPRING);
      translateX.value = withSpring(nextX, ZOOM_SPRING);
      translateY.value = withSpring(nextY, ZOOM_SPRING);
      savedScale.value = settled;
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
      setZoomed(true);
    });

  const pan = Gesture.Pan()
    // Only while zoomed, so the carousel keeps its paging and dismiss drags.
    .enabled(isZoomed)
    .onUpdate((event) => {
      const limits = limitsFor(scale.value);
      translateX.value = clamp(
        savedTranslateX.value + event.translationX,
        -limits.x,
        limits.x,
      );
      translateY.value = clamp(
        savedTranslateY.value + event.translationY,
        -limits.y,
        limits.y,
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (zoomedShared.value) {
        resetZoom();
        return;
      }
      // Keep the tapped point under the finger as the image grows.
      const limits = limitsFor(DOUBLE_TAP_SCALE);
      const nextX = clamp(
        (width / 2 - event.x) * (DOUBLE_TAP_SCALE - 1),
        -limits.x,
        limits.x,
      );
      const nextY = clamp(
        (height / 2 - event.y) * (DOUBLE_TAP_SCALE - 1),
        -limits.y,
        limits.y,
      );
      scale.value = withSpring(DOUBLE_TAP_SCALE, ZOOM_SPRING);
      translateX.value = withSpring(nextX, ZOOM_SPRING);
      translateY.value = withSpring(nextY, ZOOM_SPRING);
      savedScale.value = DOUBLE_TAP_SCALE;
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
      setZoomed(true);
    });

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_DELAY)
    .onStart(() => {
      // Guarded rather than omitted from the composition, so the gesture set
      // stays identical whether or not a handler was supplied.
      if (onLongPress && filePath !== undefined) {
        runOnJS(onLongPress)(filePath);
      }
    });

  // Pinch and pan run together. The two discrete gestures race rather than being
  // exclusive: under `Exclusive` the long press may only activate once the
  // double tap has *failed*, and a held finger does not fail a tap until its own
  // 500ms timeout — so the long press could never fire before then, however
  // short its duration. Racing lets each win on its own terms, and they cannot
  // both trigger: a double tap releases long before the hold threshold, while a
  // hold that reaches it cancels the tap.
  const gesture = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Race(doubleTap, longPress),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ width, height }, animatedStyle]}
        accessibilityRole="image"
        accessibilityLabel="Title image. Double tap to zoom, long press to share or save."
      >
        <Image
          source={{ uri }}
          placeholder={previewUri ? { uri: previewUri } : null}
          // Matched to contentFit: a placeholder fitted differently to the final
          // image visibly jumps as one replaces the other.
          placeholderContentFit="contain"
          style={styles.image}
          contentFit="contain"
          transition={150}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});

/**
 * Memoised: zooming flips state in the carousel above, and without this every
 * page would re-render mid-pinch — a stutter exactly as the zoom begins.
 */
export default React.memo(ZoomableImage);
