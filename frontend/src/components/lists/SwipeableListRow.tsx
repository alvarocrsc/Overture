import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Colors, FontFamily } from '@/src/lib/colors';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
/** Width of a single revealed action button. */
const ACTION_WIDTH = 68;
/** Number of action buttons (Share / Move / Delete). */
const ACTION_COUNT = 3;
/** Total width revealed when the row is fully open. */
const ACTIONS_WIDTH = ACTION_WIDTH * ACTION_COUNT;

/** Per-action accent colors. Move uses an indigo not present in the tokens. */
const SHARE_COLOR = Colors.accentBlue;
const MOVE_COLOR = '#5b5bd6';
const DELETE_COLOR = Colors.errorRed;

const SPRING = { damping: 40, stiffness: 320 } as const;

interface SwipeableListRowProps {
  /** Whether this row is the currently-open row (only one opens at a time). */
  isOpen: boolean;
  /** Called when a left-swipe settles into the open position. */
  onOpen: () => void;
  /** Called when the row settles back closed. */
  onClose: () => void;
  onSharePress: () => void;
  onMovePress: () => void;
  onDeletePress: () => void;
  children: React.ReactNode;
}

/**
 * A swipe-to-reveal row built with the modern Gesture API + Reanimated.
 *
 * Swiping left reveals three actions (Share, Move, Delete) anchored to the
 * right edge. The row's horizontal offset is clamped to
 * `[-ACTIONS_WIDTH, 0]`. The open/closed state is owned by the parent so it
 * can guarantee only a single row is open at any time — when `isOpen` flips
 * to false the row springs shut.
 */
export function SwipeableListRow({
  isOpen,
  onOpen,
  onClose,
  onSharePress,
  onMovePress,
  onDeletePress,
  children,
}: SwipeableListRowProps): React.JSX.Element {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  // When the parent closes this row (e.g. another row opened), spring shut.
  useEffect(() => {
    if (!isOpen) {
      translateX.value = withSpring(0, SPRING);
    }
  }, [isOpen, translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = Math.min(0, Math.max(-ACTIONS_WIDTH, next));
    })
    .onEnd((e) => {
      const shouldOpen =
        translateX.value < -ACTIONS_WIDTH / 2 || e.velocityX < -600;
      if (shouldOpen) {
        translateX.value = withSpring(-ACTIONS_WIDTH, SPRING);
        runOnJS(onOpen)();
      } else {
        translateX.value = withSpring(0, SPRING);
        runOnJS(onClose)();
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  /** Closes the row before running an action so the row resets afterwards. */
  const runAction = (action: () => void): void => {
    onClose();
    action();
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.actions}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <ActionButton
          color={SHARE_COLOR}
          icon="share-outline"
          label="Share"
          onPress={() => runAction(onSharePress)}
        />
        <ActionButton
          color={MOVE_COLOR}
          icon="folder-outline"
          label="Move"
          onPress={() => runAction(onMovePress)}
        />
        <ActionButton
          color={DELETE_COLOR}
          icon="trash-outline"
          label="Delete"
          onPress={() => runAction(onDeletePress)}
        />
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

interface ActionButtonProps {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function ActionButton({
  color,
  icon,
  label,
  onPress,
}: ActionButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: color },
        pressed && styles.actionPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={Colors.white} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  actions: {
    ...StyleSheet.absoluteFillObject,
    left: undefined,
    width: ACTIONS_WIDTH,
    flexDirection: 'row',
    alignSelf: 'flex-end',
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.white,
  },
  row: {
    backgroundColor: Colors.background,
  },
});
