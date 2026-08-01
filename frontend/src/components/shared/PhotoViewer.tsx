import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ZoomableImage from '@/src/components/shared/ZoomableImage';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { backdropUrl, type BackdropSize } from '@/src/lib/tmdb';
import type { TmdbImage } from '@/src/types/film.types';

/**
 * Full resolution, so zooming reveals real detail and the shared copy is the
 * best available. The share service reuses whatever this downloads rather than
 * fetching the image a second time.
 */
const VIEWER_IMAGE_SIZE: BackdropSize = 'original';

/**
 * Shown until the full-resolution image arrives. Deliberately the same size the
 * photos grid renders, so it is already in cache and the viewer opens on a
 * picture rather than on nothing.
 */
const PREVIEW_IMAGE_SIZE: BackdropSize = 'w780';

/** Fade timings for opening and dissolving the viewer. */
const ENTER_DURATION = 220;
const EXIT_DURATION = 200;

/** Scale the viewer grows from as it fades in. */
const ENTER_SCALE = 0.94;

/** Drag distance (px) or downward velocity past which a swipe dismisses. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/** Movement needed before the dismiss drag takes over from horizontal paging. */
const PAN_ACTIVATION_SLOP = 12;

/** Resistance applied to upward drags, which do not dismiss. */
const UPWARD_DRAG_RESISTANCE = 0.3;

const PRESS_SPRING = { damping: 15, stiffness: 400 } as const;
const RELEASE_SPRING = { damping: 20, stiffness: 260 } as const;

interface PhotoViewerProps {
  /** Every image for the title, in the same order as the grid. */
  images: TmdbImage[];
  /** Index of the image that was tapped; the carousel opens on it. */
  initialIndex: number;
  onClose: () => void;
  /** Opens the share sheet for an image (share / save to gallery). */
  onShare: (tmdbFilePath: string) => void;
}

/**
 * Full-screen image viewer: a paged horizontal carousel across all of a title's
 * images, opened from the photos grid.
 *
 * Swipe horizontally to move between images, swipe down to dismiss, and
 * long-press (or use the share button) to share or save one.
 *
 * The viewer fades in and grows slightly on open. During a dismiss drag only the
 * image follows the finger — the top controls and the backdrop stay exactly
 * where they are — and on release everything dissolves together to reveal the
 * photos grid behind it. Exiting is a pure fade, so the image dissolves from
 * wherever it was dragged to rather than snapping or sliding away.
 *
 * Mounted only while open — the parent renders it conditionally — so it always
 * opens on the tapped image.
 */
export default function PhotoViewer({
  images,
  initialIndex,
  onClose,
  onShare,
}: PhotoViewerProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  /**
   * True while the current image is pinched in. Paging and swipe-to-dismiss are
   * suspended so drags pan the image instead of moving the carousel.
   */
  const [isZoomed, setIsZoomed] = useState(false);

  /** 0 while hidden, 1 while fully open — drives the fade in and the dissolve. */
  const progress = useSharedValue(0);
  /** Grows to 1 on open and stays there, so exiting is a pure fade. */
  const enterScale = useSharedValue(ENTER_SCALE);
  /** Vertical offset from the dismiss drag. Applies to the image only. */
  const dragY = useSharedValue(0);

  // Kept in a ref so the momentum handler never closes over a stale width.
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    progress.value = withTiming(1, { duration: ENTER_DURATION });
    enterScale.value = withTiming(1, { duration: ENTER_DURATION });
  }, [progress, enterScale]);

  /** Dissolves the viewer, then unmounts it via the parent. */
  const close = useCallback((): void => {
    progress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [onClose, progress]);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / widthRef.current));
    },
    [],
  );

  // Stable, so flipping zoom state does not hand the list a new renderer and
  // re-render every page mid-pinch. Paired with ZoomableImage being memoised,
  // the pages stay untouched while zooming.
  const renderItem = useCallback(
    ({ item }: { item: TmdbImage }): React.JSX.Element => (
      <ZoomableImage
        uri={backdropUrl(item.file_path, VIEWER_IMAGE_SIZE) ?? undefined}
        previewUri={backdropUrl(item.file_path, PREVIEW_IMAGE_SIZE) ?? undefined}
        filePath={item.file_path}
        width={width}
        height={height}
        // TMDB reports each image's intrinsic size; the ratio is what bounds
        // panning to the picture's own edges.
        aspectRatio={item.width / item.height}
        onZoomChange={setIsZoomed}
        onLongPress={onShare}
      />
    ),
    [width, height, onShare],
  );

  // Uniform, full-width pages: the offset maths is exact, so the carousel can
  // jump straight to the tapped image without measuring.
  const getItemLayout = useCallback(
    (_data: ArrayLike<TmdbImage> | null | undefined, itemIndex: number) => ({
      length: width,
      offset: width * itemIndex,
      index: itemIndex,
    }),
    [width],
  );

  // Vertical drags dismiss; horizontal ones are left to the carousel's paging.
  // Suspended while zoomed, where drags belong to panning the image. Limited to
  // one finger so the vertical component of a two-finger pinch cannot start a
  // dismiss while the user is zooming in from fit scale.
  const dismissGesture = Gesture.Pan()
    .enabled(!isZoomed)
    .maxPointers(1)
    .activeOffsetY([-PAN_ACTIVATION_SLOP, PAN_ACTIVATION_SLOP])
    .failOffsetX([-PAN_ACTIVATION_SLOP, PAN_ACTIVATION_SLOP])
    .onUpdate((event) => {
      dragY.value =
        event.translationY < 0
          ? event.translationY * UPWARD_DRAG_RESISTANCE
          : event.translationY;
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        // Dissolve in place: `dragY` is deliberately left alone so the image
        // fades from where the finger released it.
        progress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
        return;
      }
      dragY.value = withSpring(0, RELEASE_SPRING);
    });

  /** Backdrop and chrome: fade only, so a drag never moves them. */
  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  /** The image alone follows the finger. */
  const imageStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: dragY.value }, { scale: enterScale.value }],
  }));

  const current = images[index];

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
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, fadeStyle]}
        />

        <GestureDetector gesture={dismissGesture}>
          <Animated.View style={styles.root}>
            <Animated.View style={[styles.root, imageStyle]}>
              <FlatList
                data={images}
                keyExtractor={(item) => item.file_path}
                horizontal
                pagingEnabled
                scrollEnabled={!isZoomed}
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={getItemLayout}
                onMomentumScrollEnd={handleMomentumEnd}
                renderItem={renderItem}
              />
            </Animated.View>

            {/* Outside the dragging container: the controls hold their position
                while the image is pulled, and dissolve with everything else. */}
            <Animated.View
              style={[styles.topBar, { top: insets.top + 8 }, fadeStyle]}
            >
              <Pressable
                onPress={close}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={Colors.white} />
              </Pressable>

              <Text style={styles.counter}>
                {`${index + 1} / ${images.length}`}
              </Text>

              <ShareButton
                onPress={() => {
                  if (current) onShare(current.file_path);
                }}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface ShareButtonProps {
  onPress: () => void;
}

/**
 * Share control for the viewer. It stays live while the share sheet is open —
 * the only feedback is the icon swelling under the finger and settling back on
 * release, so a slow download never leaves the button looking disabled.
 */
function ShareButton({ onPress }: ShareButtonProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(1.25, PRESS_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, RELEASE_SPRING);
      }}
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Share or save image"
    >
      <Animated.View style={[styles.iconButton, animatedStyle]}>
        <Ionicons name="share-outline" size={22} color={Colors.white} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pressed: {
    opacity: 0.7,
  },
  counter: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
});
