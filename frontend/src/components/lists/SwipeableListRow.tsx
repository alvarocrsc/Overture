import React, { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Colors, FontFamily } from '@/src/lib/colors';

// ---------------------------------------------------------------------------
// Layout — sourced from Figma "Lists list Extended (Dark)" (node 1403:114).
// ---------------------------------------------------------------------------

/** How far the content shifts left when the actions are revealed. */
const REVEAL_LEFT = 49;
/**
 * How far the content shifts right when the Pin pill is revealed.
 * PIN_LEFT (8) + PILL_W (48) + right-gap (8) = 64.
 */
const REVEAL_RIGHT = 64;
/** Pill button width. */
const PILL_W = 48;
/** Pill button height in resting state (Figma: 28px). */
const PILL_H = 28;
/** Full row height — also the maximum pill height during over-drag. */
const ROW_H = 42;
const PILL_H_MAX = ROW_H;
/** Gap between pill bottom and label top. */
const LABEL_MARGIN_TOP = 2;
/** Gap between action pills (Figma: 10px). */
const BTN_GAP = 10;

/** Distance from the container's right edge for each pill (derived from Figma). */
const DELETE_RIGHT = 0;
const MOVE_RIGHT = PILL_W + BTN_GAP;       // 58
const SHARE_RIGHT = (PILL_W + BTN_GAP) * 2; // 116

/** Pill colours from Figma. */
const SHARE_COLOR = '#1a77da';
const MOVE_COLOR  = '#797aff';
const DELETE_COLOR = '#e24b4a';

/** Spring for slide and over-drag snap-back. */
const SPRING = { damping: 40, stiffness: 320 } as const;

// --------------- Left over-drag rubber-band constants ----------------------
/** Dampening factor past a reveal limit (lower = more resistance). */
const RUBBER_BAND = 0.3;
/** Actual (dampened) px of left over-drag at which left pills reach PILL_H_MAX. */
const GROW_THRESHOLD = 18;
/** Extra actual px past GROW_THRESHOLD before left pills reach maximum spread. */
const SEPARATE_EXTRA = 20;
/** Maximum extra gap (px) added between pills during the separation phase. */
const SEPARATE_SPREAD = 26;
/** Maximum icon scale multiplier at full growth. */
const ICON_SCALE_MAX = 1.3;

// --------------- Pin / right-swipe constants -------------------------------
/** Colour for the Pin pill — matches iOS Notes orange. */
const PIN_COLOR = '#f7961d';
/** Left-edge offset of the Pin cell from the container's left edge. */
const PIN_LEFT = 8;
/** Gap kept between the pill's right edge and the list thumbnail. */
const THUMB_GAP = 8;
/**
 * Raw user-input px past REVEAL_RIGHT at which the haptic fires and
 * stronger resistance kicks in.  On release past this point the pin
 * action triggers automatically.
 */
const ELONGATE_RAW_TRIGGER = 100;
/** Heavier resistance factor for phase 2 (past haptic threshold). */
const RUBBER_BAND_ELONGATE = 0.12;
/** Absolute maximum pill width (safety cap — should never be visible). */
const PIN_W_MAX = 300;

// ---------------------------------------------------------------------------
// Custom SVG icons — paths taken verbatim from assets/icons/*.svg
// ---------------------------------------------------------------------------

/** Upload arrow icon (used for the Share action). */
function UploadIcon(): React.JSX.Element {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.00001 11.8125C9.31066 11.8125 9.56251 11.5606 9.56251 11.25V3.02058L10.823 4.49107C11.0251 4.72694 11.3802 4.75426 11.6161 4.55208C11.852 4.34991 11.8793 3.9948 11.6771 3.75893L9.42706 1.13393C9.32026 1.00925 9.16419 0.9375 9.00001 0.9375C8.83584 0.9375 8.67976 1.00925 8.57296 1.13393L6.32293 3.75893C6.12075 3.9948 6.14807 4.34991 6.38394 4.55208C6.61981 4.75426 6.97492 4.72694 7.17709 4.49107L8.43751 3.02058V11.25C8.43751 11.5606 8.68936 11.8125 9.00001 11.8125Z"
        fill="white"
      />
      <Path
        d="M12 6.75C11.4733 6.75 11.21 6.75 11.0209 6.87638C10.939 6.93111 10.8686 7.00144 10.8139 7.08334C10.6875 7.2725 10.6875 7.53585 10.6875 8.0625V11.25C10.6875 12.182 9.93202 12.9375 9 12.9375C8.06805 12.9375 7.31253 12.182 7.31253 11.25V8.0625C7.31253 7.53585 7.31253 7.27248 7.18612 7.0833C7.1314 7.00142 7.06111 6.93112 6.97923 6.87641C6.79006 6.75 6.5267 6.75 6 6.75C3.87868 6.75 2.81802 6.75 2.15901 7.40901C1.5 8.06805 1.5 9.12855 1.5 11.2499V11.9999C1.5 14.1212 1.5 15.1818 2.15901 15.8408C2.81802 16.4999 3.87868 16.4999 6 16.4999H12C14.1213 16.4999 15.1819 16.4999 15.841 15.8408C16.5 15.1818 16.5 14.1212 16.5 11.9999V11.2499C16.5 9.12855 16.5 8.06805 15.841 7.40901C15.1819 6.75 14.1213 6.75 12 6.75Z"
        fill="white"
      />
    </Svg>
  );
}

/** Folder icon (used for the Move action). */
function FolderIcon(): React.JSX.Element {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.55201 3.94379C1.5 4.21946 1.5 4.55042 1.5 5.21231V10.5C1.5 13.3284 1.5 14.7427 2.37868 15.6213C3.25736 16.5 4.67157 16.5 7.5 16.5H10.5C13.3284 16.5 14.7427 16.5 15.6213 15.6213C16.5 14.7427 16.5 13.3284 16.5 10.5V8.84842C16.5 6.87416 16.5 5.88701 15.9229 5.24537C15.8699 5.18636 15.8137 5.13018 15.7547 5.0771C15.113 4.5 14.1259 4.5 12.1516 4.5H11.8713C11.006 4.5 10.5734 4.5 10.1703 4.38508C9.94883 4.32195 9.7353 4.23353 9.53408 4.12157C9.16778 3.91775 8.86185 3.61184 8.25 3L7.83728 2.58731C7.63223 2.38225 7.5297 2.27971 7.42196 2.19038C6.95739 1.80528 6.38749 1.56922 5.78668 1.51303C5.64732 1.5 5.50232 1.5 5.21231 1.5C4.55042 1.5 4.21946 1.5 3.94379 1.55201C2.73023 1.78098 1.78098 2.73023 1.55201 3.94379ZM9.1875 7.5C9.1875 7.18934 9.43935 6.9375 9.75 6.9375H13.5C13.8107 6.9375 14.0625 7.18934 14.0625 7.5C14.0625 7.81065 13.8107 8.0625 13.5 8.0625H9.75C9.43935 8.0625 9.1875 7.81065 9.1875 7.5Z"
        fill="white"
      />
    </Svg>
  );
}

/** Trash-bin icon (used for the Delete action). */
function TrashIcon(): React.JSX.Element {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M2.25 4.78948C2.25 4.42614 2.50903 4.13159 2.82857 4.13159L4.82675 4.13124C5.22376 4.1198 5.57402 3.83275 5.70911 3.40809C5.71266 3.39692 5.71674 3.38315 5.73139 3.33318L5.81749 3.03942C5.87017 2.85931 5.91607 2.70239 5.98031 2.56213C6.23407 2.00802 6.70356 1.62324 7.2461 1.52473C7.38343 1.49979 7.52887 1.4999 7.69582 1.50002H10.3043C10.4713 1.4999 10.6167 1.49979 10.754 1.52473C11.2966 1.62324 11.7661 2.00802 12.0198 2.56213C12.0841 2.70239 12.13 2.85931 12.1826 3.03942L12.2687 3.33318C12.2833 3.38315 12.2875 3.39692 12.291 3.40809C12.4262 3.83275 12.8459 4.12015 13.2428 4.13159H15.1714C15.4909 4.13159 15.75 4.42614 15.75 4.78948C15.75 5.15282 15.4909 5.44737 15.1714 5.44737H2.82857C2.50903 5.44737 2.25 5.15282 2.25 4.78948Z"
        fill="white"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.6967 16.5001H9.3033C11.3903 16.5001 12.4339 16.5001 13.1123 15.8356C13.7909 15.1712 13.8602 14.0813 13.9991 11.9014L14.1991 8.76052C14.2745 7.57777 14.3121 6.98643 13.9717 6.61168C13.6313 6.23694 13.0565 6.23694 11.907 6.23694H6.09303C4.94345 6.23694 4.36866 6.23694 4.02829 6.61168C3.68791 6.98643 3.72558 7.57777 3.80091 8.76052L4.00094 11.9014C4.13977 14.0813 4.20919 15.1712 4.88767 15.8356C5.56615 16.5001 6.60967 16.5001 8.6967 16.5001ZM7.68472 9.14145C7.65382 8.8161 7.37815 8.57865 7.06903 8.6112C6.75991 8.64375 6.53438 8.93392 6.56529 9.25927L6.94029 13.2067C6.9712 13.532 7.24685 13.7695 7.55595 13.7369C7.8651 13.7044 8.09062 13.4142 8.05972 13.0888L7.68472 9.14145ZM10.931 8.6112C11.2401 8.64375 11.4656 8.93392 11.4347 9.25927L11.0597 13.2067C11.0288 13.532 10.7531 13.7695 10.444 13.7369C10.1349 13.7044 9.90938 13.4142 9.94028 13.0888L10.3153 9.14145C10.3462 8.8161 10.6219 8.57865 10.931 8.6112Z"
        fill="white"
      />
    </Svg>
  );
}

/** Pin icon — solid push-pin (used when the list is NOT yet pinned). */
function PinSolidIcon({ color = 'white' }: { color?: string }): React.JSX.Element {
  return (
    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <Path
        d="M12.8875 4.35386L10.664 2.12816C9.14398 0.606676 8.38402 -0.15407 7.56772 0.0260119C6.75151 0.206101 6.38139 1.21616 5.64122 3.23629L5.14025 4.60357C4.94292 5.14212 4.84426 5.41139 4.66674 5.61968C4.5871 5.71314 4.49647 5.79664 4.39684 5.86837C4.17479 6.02826 3.89854 6.10439 3.34605 6.25671C2.10078 6.59999 1.47814 6.77166 1.24352 7.17906C1.14209 7.35516 1.0893 7.55511 1.09058 7.75843C1.09355 8.22861 1.55022 8.68573 2.46354 9.59998L3.52448 10.6622L0.167584 14.0223C-0.0558613 14.2459 -0.0558613 14.6086 0.167584 14.8323C0.391029 15.0559 0.753313 15.0559 0.976759 14.8323L4.33376 11.472L5.43325 12.5726C6.35236 13.4926 6.81196 13.9527 7.28498 13.9533C7.48432 13.9536 7.68022 13.9018 7.8534 13.803C8.26432 13.5685 8.43689 12.9413 8.78204 11.6868C8.93384 11.1354 9.00966 10.8596 9.16896 10.6376C9.23871 10.5405 9.31956 10.4518 9.41 10.3735C9.61648 10.1947 9.884 10.0942 10.419 9.89323L11.802 9.37355C13.7999 8.62296 14.7988 8.24766 14.9749 7.43361C15.1509 6.61949 14.3964 5.86427 12.8875 4.35386Z"
        fill={color}
      />
    </Svg>
  );
}

/** Unpin icon — push-pin with a line through it (used when the list IS pinned). */
function UnpinIcon(): React.JSX.Element {
  return (
    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <Path
        d="M10.0387 10.0377C9.7432 10.1542 9.56031 10.2433 9.40977 10.3737C9.31939 10.4519 9.23827 10.5403 9.16856 10.6374C9.00933 10.8593 8.93356 11.135 8.78184 11.6862C8.43676 12.9404 8.26389 13.5678 7.85313 13.8024C7.68001 13.9011 7.48406 13.9531 7.28477 13.9528C6.81175 13.9521 6.35232 13.4919 5.43321 12.5719L4.3336 11.4713L0.976178 14.8317C0.752752 15.0553 0.391034 15.0553 0.167584 14.8317C-0.0558613 14.608 -0.0558613 14.2458 0.167584 14.0221L3.52403 10.6618L2.46348 9.59927C1.5504 8.68526 1.09362 8.22849 1.09044 7.75845C1.08915 7.55512 1.14135 7.35447 1.24278 7.17837C1.47744 6.77109 2.10041 6.59967 3.34532 6.25649C3.8977 6.1042 4.17407 6.02765 4.3961 5.86782C4.49569 5.79612 4.58698 5.71319 4.66661 5.61977C4.7949 5.46924 4.87985 5.28569 4.99278 4.99282L10.0387 10.0377ZM7.567 0.0260247C8.38327 -0.154053 9.14373 0.606168 10.6637 2.12759L12.8873 4.35317C14.3962 5.86359 15.1502 6.61913 14.9742 7.43325C14.8201 8.14566 14.0361 8.52207 12.5035 9.10806L5.90684 2.51235C6.48186 0.97198 6.85505 0.183378 7.567 0.0260247Z"
        fill="white"
      />
      <Path
        d="M3.76588 1.99969L13.0997 11.3335"
        stroke="white"
        strokeWidth={0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SwipeableListRowProps {
  /**
   * Which side is currently revealed, or null if closed.
   * 'left'  → Share / Move / Delete actions visible.
   * 'right' → Pin action visible.
   */
  openSide: 'left' | 'right' | null;
  /** Called when a left-swipe settles into the open position. */
  onOpenLeft: () => void;
  /** Called when a right-swipe (Pin) settles into the open position. */
  onOpenRight: () => void;
  /** Called when the row snaps closed from either direction. */
  onClose: () => void;
  onSharePress: () => void;
  onMovePress: () => void;
  onDeletePress: () => void;
  onPinPress: () => void;
  /** Whether the list is currently pinned — controls the pill icon and label. */
  isPinned: boolean;
  children: React.ReactNode;
}

/**
 * A swipe-to-reveal row built with the modern Gesture API + Reanimated.
 *
 * • Swipe LEFT  → reveals Share / Move / Delete pills (right side).
 * • Swipe RIGHT → reveals Pin pill (left side).
 * • Both sides share rubber-band resistance past the reveal point, pill
 *   growth up to ROW_H, and label-fade on over-drag.
 * • Left side additionally staggers the three buttons as they appear/disappear.
 * • All visibility is gesture-driven via derived openProgress / pinProgress.
 */
export function SwipeableListRow({
  openSide,
  onOpenLeft,
  onOpenRight,
  onClose,
  onSharePress,
  onMovePress,
  onDeletePress,
  onPinPress,
  isPinned,
  children,
}: SwipeableListRowProps): React.JSX.Element {
  const translateX = useSharedValue(0);
  const startX     = useSharedValue(0);
  /**
   * Set to 1 once the haptic fires during a right over-drag.
   * Reset to 0 when the user pulls back into the normal range or a new gesture begins.
   */
  const hapticFired = useSharedValue(0);

  // ---- Derived progress values ---------------------------------------------

  /** 0 = closed, 1 = fully open-left. Dead zone of -5px prevents the
   * delete pill from flashing during the spring recoil after a right swipe. */
  const openProgress = useDerivedValue(() =>
    interpolate(translateX.value, [-20, -REVEAL_LEFT], [0, 1], Extrapolation.CLAMP),
  );

  /** 0 = closed, 1 = fully open-right (pin revealed). */
  const pinProgress = useDerivedValue(() =>
    interpolate(translateX.value, [0, REVEAL_RIGHT], [0, 1], Extrapolation.CLAMP),
  );

  /** Actual (dampened) px dragged past −REVEAL_LEFT (left over-drag). */
  const overDrag = useDerivedValue(() =>
    Math.max(0, -(translateX.value + REVEAL_LEFT)),
  );

  /** Actual (dampened) px dragged past +REVEAL_RIGHT (right elongation). */
  const rightOverDrag = useDerivedValue(() =>
    Math.max(0, translateX.value - REVEAL_RIGHT),
  );

  // Left-side growth
  const growProgress = useDerivedValue(() =>
    interpolate(overDrag.value, [0, GROW_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  );
  const separateProgress = useDerivedValue(() =>
    interpolate(
      overDrag.value,
      [GROW_THRESHOLD, GROW_THRESHOLD + SEPARATE_EXTRA],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  );

  // Right-side (pin) height growth is no longer needed — width-only elongation.
  // rightGrowProgress is unused; kept derived value removed.

  // ---- External open-state control -----------------------------------------

  useEffect(() => {
    if (openSide === 'left') {
      translateX.value = withSpring(-REVEAL_LEFT, SPRING);
    } else if (openSide === 'right') {
      translateX.value = withSpring(REVEAL_RIGHT, SPRING);
    } else {
      translateX.value = withSpring(0, SPRING);
    }
  }, [openSide, translateX]);

  // ---- Gesture -------------------------------------------------------------

  /** Called on the JS thread to fire a light-impact haptic (subtle, like a long-press tick). */
  const triggerHaptic = (): void => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // silently ignore if haptics not available on this device/build
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      startX.value = translateX.value;
      hapticFired.value = 0;
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      if (raw <= 0) {
        // Left drag — rubber-band past REVEAL_LEFT.
        translateX.value = raw >= -REVEAL_LEFT
          ? raw
          : -REVEAL_LEFT + (raw + REVEAL_LEFT) * RUBBER_BAND;
      } else if (raw <= REVEAL_RIGHT) {
        // Normal right drag — no resistance.
        translateX.value = raw;
        hapticFired.value = 0; // reset if user pulls back into normal range
      } else {
        // Right over-drag — elongation zone with two-phase resistance.
        const rawOver = raw - REVEAL_RIGHT;
        // Fire haptic exactly once when crossing the trigger threshold.
        if (hapticFired.value === 0 && rawOver >= ELONGATE_RAW_TRIGGER) {
          hapticFired.value = 1;
          runOnJS(triggerHaptic)();
        }
        // Phase 1: normal RUBBER_BAND resistance.
        // Phase 2: much heavier RUBBER_BAND_ELONGATE resistance past the trigger.
        translateX.value = rawOver <= ELONGATE_RAW_TRIGGER
          ? REVEAL_RIGHT + rawOver * RUBBER_BAND
          : REVEAL_RIGHT
              + ELONGATE_RAW_TRIGGER * RUBBER_BAND
              + (rawOver - ELONGATE_RAW_TRIGGER) * RUBBER_BAND_ELONGATE;
      }
    })
    .onEnd((e) => {
      const x = translateX.value;
      if (hapticFired.value === 1) {
        // User dragged far enough → auto-pin and snap back to closed.
        hapticFired.value = 0;
        translateX.value = withSpring(0, SPRING);
        runOnJS(onClose)();
        runOnJS(onPinPress)();
      } else if (x <= -REVEAL_LEFT / 2 || e.velocityX < -600) {
        translateX.value = withSpring(-REVEAL_LEFT, SPRING);
        runOnJS(onOpenLeft)();
      } else if (x >= REVEAL_RIGHT / 2 || e.velocityX > 600) {
        translateX.value = withSpring(REVEAL_RIGHT, SPRING);
        runOnJS(onOpenRight)();
      } else {
        translateX.value = withSpring(0, SPRING);
        runOnJS(onClose)();
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // ---- Left-side pill styles (growth + label fade) -------------------------

  const pillGrowStyle = useAnimatedStyle(() => {
    const h = interpolate(growProgress.value, [0, 1], [PILL_H, PILL_H_MAX]);
    return { height: h, borderRadius: h / 2 };
  });
  const iconGrowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(growProgress.value, [0, 1], [1, ICON_SCALE_MAX]) }],
  }));
  const labelGrowStyle = useAnimatedStyle(() => ({
    opacity: 1 - growProgress.value * 0.9,
    transform: [{ scale: interpolate(growProgress.value, [0, 1], [1, 1.25]) }],
  }));

  // ---- Right-side (pin) pill styles ----------------------------------------

  /**
   * Width is derived directly from translateX so the pill always fills exactly
   * the space between PIN_LEFT and the content's left edge (minus THUMB_GAP).
   * This prevents both clipping and overflow at any swipe distance.
   */
  const pinPillStyle = useAnimatedStyle(() => {
    // Available space = how far the content has shifted right, minus margins.
    const available = translateX.value - PIN_LEFT - THUMB_GAP;
    const w = Math.max(PILL_W, Math.min(available, PIN_W_MAX));
    return { width: w };
  });

  // ---- Left-side stagger (per-pill visibility + separation) ----------------
  //   Delete: 0→0.5   (first in / last out)
  //   Move:   0.25→0.75
  //   Share:  0.5→1.0 (last in / first out)

  const deleteCellStyle = useAnimatedStyle(() => {
    const vis = interpolate(openProgress.value, [0, 0.5], [0, 1], Extrapolation.CLAMP);
    return { right: DELETE_RIGHT, opacity: vis, transform: [{ scale: vis }] };
  });
  const moveCellStyle = useAnimatedStyle(() => {
    const vis = interpolate(openProgress.value, [0.25, 0.75], [0, 1], Extrapolation.CLAMP);
    const sep = separateProgress.value * SEPARATE_SPREAD;
    return { right: MOVE_RIGHT + sep, opacity: vis, transform: [{ scale: vis }] };
  });
  const shareCellStyle = useAnimatedStyle(() => {
    const vis = interpolate(openProgress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP);
    const sep = separateProgress.value * SEPARATE_SPREAD;
    return { right: SHARE_RIGHT + sep * 2, opacity: vis, transform: [{ scale: vis }] };
  });

  // ---- Right-side (pin) cell style -----------------------------------------
  // Opacity-only visibility — no scale transform, so the pill never shifts left
  // from its anchor at PIN_LEFT, preventing clipping on the left edge.

  const pinCellStyle = useAnimatedStyle(() => {
    const vis = interpolate(pinProgress.value, [0, 0.6], [0, 1], Extrapolation.CLAMP);
    return { opacity: vis };
  });

  // ---- Pin indicator badge (shown on the row when pinned, fades on any swipe) ----

  const pinIndicatorBadgeStyle = useAnimatedStyle(() => {
    // Fade out quickly as soon as the user starts swiping in either direction.
    const leftFade  = interpolate(openProgress.value, [0, 0.2], [1, 0], Extrapolation.CLAMP);
    const rightFade = interpolate(pinProgress.value,  [0, 0.2], [1, 0], Extrapolation.CLAMP);
    return { opacity: Math.min(leftFade, rightFade) };
  });

  /** Closes the row then fires an action. */
  const runAction = (action: () => void): void => {
    onClose();
    action();
  };

  return (
    <View style={styles.container}>
      {/* Pin container — left side, revealed by swiping right. */}
      <View
        style={styles.pinContainer}
        pointerEvents={openSide === 'right' ? 'box-none' : 'none'}
      >
        <Animated.View style={[styles.pinCell, pinCellStyle]}>
          <Pressable
            onPress={() => runAction(onPinPress)}
            style={({ pressed }) => [styles.pillTouchable, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel={isPinned ? 'Unpin' : 'Pin'}
          >
            <Animated.View style={[styles.pinPill, pinPillStyle]}>
              {isPinned ? <UnpinIcon /> : <PinSolidIcon />}
            </Animated.View>
            <Text style={styles.pillLabel}>{isPinned ? 'Unpin' : 'Pin'}</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Swipeable content — shifts left or right to reveal pills. */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* Pin indicator badge — absolutely positioned at the row's trailing edge.
          Lives outside the sliding content so it stays fixed while fading out. */}
      {isPinned && (
        <Animated.View
          style={[styles.pinIndicatorBadge, pinIndicatorBadgeStyle]}
          pointerEvents="none"
        >
          <PinSolidIcon color={Colors.accentBlue} />
        </Animated.View>
      )}

      {/* Actions container — right side, revealed by swiping left. */}
      <View
        style={styles.actionsContainer}
        pointerEvents={openSide === 'left' ? 'box-none' : 'none'}
      >
        {/* Share (Upload) — leftmost, appears last when opening */}
        <Animated.View style={[styles.actionCell, shareCellStyle]}>
          <Pressable
            onPress={() => runAction(onSharePress)}
            style={({ pressed }) => [styles.pillTouchable, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Animated.View style={[styles.pill, { backgroundColor: SHARE_COLOR }, pillGrowStyle]}>
              <Animated.View style={iconGrowStyle}><UploadIcon /></Animated.View>
            </Animated.View>
            <Animated.Text style={[styles.pillLabel, labelGrowStyle]}>Share</Animated.Text>
          </Pressable>
        </Animated.View>

        {/* Move (Folder) — middle */}
        <Animated.View style={[styles.actionCell, moveCellStyle]}>
          <Pressable
            onPress={() => runAction(onMovePress)}
            style={({ pressed }) => [styles.pillTouchable, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Move"
          >
            <Animated.View style={[styles.pill, { backgroundColor: MOVE_COLOR }, pillGrowStyle]}>
              <Animated.View style={iconGrowStyle}><FolderIcon /></Animated.View>
            </Animated.View>
            <Animated.Text style={[styles.pillLabel, labelGrowStyle]}>Move</Animated.Text>
          </Pressable>
        </Animated.View>

        {/* Delete (Trash) — rightmost, appears first when opening */}
        <Animated.View style={[styles.actionCell, deleteCellStyle]}>
          <Pressable
            onPress={() => runAction(onDeletePress)}
            style={({ pressed }) => [styles.pillTouchable, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Delete"
          >
            <Animated.View style={[styles.pill, { backgroundColor: DELETE_COLOR }, pillGrowStyle]}>
              <Animated.View style={iconGrowStyle}><TrashIcon /></Animated.View>
            </Animated.View>
            <Animated.Text style={[styles.pillLabel, labelGrowStyle]}>Delete</Animated.Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    backgroundColor: Colors.background,
  },
  /** Absolute overlay for the Pin pill — left side. */
  pinContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Absolute overlay for Share/Move/Delete pills — right side. */
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Cell for each right-side action pill. left/right position driven by animated style. */
  actionCell: {
    position: 'absolute',
    top: 0,
    width: PILL_W,
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  /**
   * Pin cell — left-anchored at PIN_LEFT, wide enough for the fully elongated pill.
   * Uses opacity-only animation so the pill's left edge never moves.
   */
  pinCell: {
    position: 'absolute',
    left: PIN_LEFT,
    top: 0,
    width: PIN_W_MAX,
    height: ROW_H,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  /** Pin indicator badge — fixed at the trailing edge of the row, fades on swipe. */
  pinIndicatorBadge: {
    position: 'absolute',
    right: 4,
    top: 0,
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTouchable: {
    alignItems: 'center',
  },
  pillPressed: {
    opacity: 0.75,
  },
  /** Static pill base — height and borderRadius animated via pillGrowStyle on left side. */
  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Pin pill — fixed height/radius; only width is animated via pinPillStyle. */
  pinPill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: PIN_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    marginTop: LABEL_MARGIN_TOP,
    fontFamily: FontFamily.light,
    fontSize: 9,
    color: Colors.white,
    textAlign: 'center',
  },
});
