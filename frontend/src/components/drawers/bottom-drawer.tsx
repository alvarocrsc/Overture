import React, { useCallback, useEffect } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

interface BottomDrawerProps {
  visible: boolean;
  /** Called when the drawer should fully close (Done / backdrop / drag-down). */
  onClose: () => void;
  /** Backdrop image (typically film/series backdrop) for the blurred bg. */
  backdropImageUri: string | null | undefined;
  /** Title logo PNG (transparent) that floats above the drawer. */
  logoUri: string | null | undefined;
  /** Fallback text rendered when no logo is available. */
  titleFallback: string;
  /** Optional smaller subtitle rendered under the logo / title. */
  tagline?: string | null;
  /** Defaults to "Done". */
  doneLabel?: string;
  /** Defaults to `onClose` if not provided. */
  onDone?: () => void;
  /** Hides the bottom Done button if explicitly false. Defaults to true. */
  showDoneButton?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable bottom-sheet drawer used by every Overture surface that
 * needs the "logo above sheet" look — film / series action drawer,
 * Add-to-list flow, etc.
 *
 * The drawer:
 * - Renders inside a transparent modal that lets a blurred backdrop
 *   image fill the screen.
 * - Floats the title (logo or fallback text) above the sheet.
 * - Sizes itself to the children's natural height and animates the
 *   change smoothly via `withSpring`, so the same shell can host
 *   multi-step content (More Options → Add to List).
 * - Slides up on open and down on close via a Reanimated shared
 *   value driven both by an `onUpdate` pan gesture and the
 *   `visible` prop.
 */
export default function BottomDrawer({
  visible,
  onClose,
  backdropImageUri,
  logoUri,
  titleFallback,
  tagline,
  doneLabel = 'Done',
  onDone,
  showDoneButton = true,
  children,
}: BottomDrawerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Distance to translate the drawer (and logo) downwards.  0 = open.
  const translateY = useSharedValue(SCREEN_HEIGHT);
  // Backdrop dim/blur opacity, animated independently for a softer
  // fade compared to the spring-driven sheet.
  const backdropOpacity = useSharedValue(0);
  // Measured height of the drawer; animated so multi-step contents
  // transition smoothly.
  const drawerHeight = useSharedValue(0);

  // Distance from sheet top to the logo's bottom edge.
  const LOGO_BOTTOM_GAP = 28;

  const handleClose = useCallback((): void => {
    onClose();
  }, [onClose]);

  const handleDone = useCallback((): void => {
    if (onDone) {
      onDone();
    } else {
      onClose();
    }
  }, [onDone, onClose]);

  // Animate open / close in reaction to the `visible` prop.
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 38, stiffness: 180 });
      backdropOpacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible, SCREEN_HEIGHT, translateY, backdropOpacity]);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent): void => {
      const next = e.nativeEvent.layout.height;
      if (next > 0) {
        if (drawerHeight.value === 0) {
          // First measurement — snap, don't animate.
          drawerHeight.value = next;
        } else {
          drawerHeight.value = withSpring(next, {
            damping: 38,
            stiffness: 220,
          });
        }
      }
    },
    [drawerHeight],
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      const shouldClose =
        e.translationY > drawerHeight.value * 0.25 || e.velocityY > 800;
      if (shouldClose) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
        backdropOpacity.value = withTiming(0, { duration: 220 });
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 38, stiffness: 180 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    height: drawerHeight.value > 0 ? drawerHeight.value : undefined,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    bottom: drawerHeight.value + LOGO_BOTTOM_GAP,
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        {/* Blurred backdrop image */}
        {backdropImageUri ? (
          <ImageBackground
            source={{ uri: backdropImageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          >
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          </ImageBackground>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
        )}

        {/* Dim overlay (animated) */}
        <Animated.View style={[styles.dim, backdropStyle]} pointerEvents="none" />

        {/* Tap-outside-to-dismiss area covers everything above the drawer. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        {/* Floating logo + tagline */}
        <Animated.View
          style={[styles.logoWrap, logoAnimatedStyle]}
          pointerEvents="none"
        >
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.titleFallback} numberOfLines={2}>
              {titleFallback}
            </Text>
          )}
          {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
        </Animated.View>

        {/* The drawer itself */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
            <View
              onLayout={onContentLayout}
              style={[styles.drawerInner, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
              <View style={styles.dragHandle} />
              <View style={styles.childrenWrap}>{children}</View>
              {showDoneButton ? (
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => [
                    styles.doneButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={doneLabel}
                >
                  <Text style={styles.doneLabel}>{doneLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const SHEET_BG = '#121212';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fallbackBg: {
    backgroundColor: Colors.background,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
  },
  logo: {
    width: 240,
    height: 64,
  },
  titleFallback: {
    fontFamily: FontFamily.black,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tagline: {
    marginTop: 4,
    fontFamily: FontFamily.extraBold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  drawerInner: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  childrenWrap: {
    marginTop: 4,
  },
  dragHandle: {
    width: 70,
    height: 3,
    borderRadius: 25,
    backgroundColor: Colors.white,
    alignSelf: 'center',
  },
  doneButton: {
    marginTop: 16,
    height: 43,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.buttonText,
    letterSpacing: LetterSpacing.tight,
  },
  pressed: {
    opacity: 0.7,
  },
});
