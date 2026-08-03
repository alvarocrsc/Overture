import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInputProps,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { RATING_COLOR_TIERS } from '@/src/utils/episode-rating-color.utils';

/** Ratings run 0.0-10.0 in 0.1 steps — the canonical scale. */
const MAX_RATING = 10;
const STEPS_PER_UNIT = 10;
const TOTAL_STEPS = MAX_RATING * STEPS_PER_UNIT;

const TICK_SPACING = 18;
const UNIT_SPACING = TICK_SPACING * STEPS_PER_UNIT;
const TICK_WIDTH = 2;
const BAND_HEIGHT = 27;


const BAND_PADDING_TOP = 16;
const BAND_TOTAL_HEIGHT = BAND_PADDING_TOP + BAND_HEIGHT;

const TOUCH_EXTENSION = 200;

const DECIMAL_TICK_HEIGHTS = [15, 12, 10, 9, 20, 9, 10, 12, 15];

const INTEGER_TICK_HEIGHT = 10;
const INTEGER_TICK_TOP = 17;

const LABEL_FONT_SIZE = 16;
const LABEL_ACTIVE_SCALE = 24 / LABEL_FONT_SIZE;
const LABEL_BOX_WIDTH = 32;
const LABEL_BOX_HEIGHT = 32;
const LABEL_CENTER_Y = 5.5;
const LABEL_BOX_TOP = BAND_PADDING_TOP + LABEL_CENTER_Y - LABEL_BOX_HEIGHT / 2;

const POINTER_WIDTH = 23.8723;
const POINTER_HEIGHT = 26.9668;
const POINTER_PATH =
  'M9.05469 3.62122C9.93431 1.58984 10.3741 0.574143 10.9778 0.244574C11.5751 -0.0815248 12.2972 -0.0815248 12.8945 0.244574C13.4982 0.574143 13.938 1.58984 14.8176 3.62123L23.0266 22.5791C23.64 23.9956 23.9467 24.7039 23.8569 25.2765C23.7677 25.8457 23.4373 26.3488 22.9504 26.6569C22.4606 26.9668 21.6888 26.9668 20.1451 26.9668H3.72716C2.18349 26.9668 1.41165 26.9668 0.921867 26.6569C0.434983 26.3488 0.104608 25.8457 0.0153756 25.2765C-0.0743888 24.7039 0.232308 23.9956 0.845703 22.5791L9.05469 3.62122Z';

/**
 * Colour stops built from the shared rating tiers, as two points per tier so
 * each tier renders flat and only shifts across its 0.1-wide boundary. Derived
 * rather than duplicated, so retuning the tiers retunes the slider with them.
 */
const { COLOR_INPUTS, COLOR_OUTPUTS } = (() => {
  const tiers = [...RATING_COLOR_TIERS].sort((a, b) => a.min - b.min);
  const inputs: number[] = [];
  const outputs: string[] = [];
  for (const tier of tiers) {
    inputs.push(tier.min, tier.max);
    outputs.push(tier.color, tier.color);
  }
  return { COLOR_INPUTS: inputs, COLOR_OUTPUTS: outputs };
})();

interface UiThreadTextProps extends TextInputProps {
  text?: string;
}

const AnimatedTextInput = Animated.createAnimatedComponent(
  TextInput as React.ComponentType<UiThreadTextProps>,
);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface NumericRatingSliderProps {
  /** Current rating on the canonical 0.0-10.0 scale. */
  value: number;
  /** Fired when the user settles on a value — not on every frame of a scroll. */
  onChange: (value: number) => void;
}

/**
 * Ruler-style rating picker for the 0.0-10.0 scale.
 *
 * The ruler itself is the slider: it scrolls horizontally under a fixed
 * pointer, snapping to each 0.1 mark with a haptic tick, while the whole
 * numbers swell as they approach the pointer and settle back as they leave.
 *
 * The read-out and every colour are driven straight from the scroll offset on
 * the UI thread — the value is rendered into an uneditable `TextInput` via
 * `animatedProps`, which is what lets the number, its colour and the pointer
 * track the finger without a single React re-render. `onChange` is therefore
 * only called once the scroll settles.
 */
export default function NumericRatingSlider({
  value,
  onChange,
}: NumericRatingSliderProps): React.JSX.Element {
  const [viewportWidth, setViewportWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent): void => {
    setViewportWidth(event.nativeEvent.layout.width);
  }, []);

  // Offset that puts `value` under the pointer. Deliberately mount-only: after
  // that the scroll view owns the position, and re-deriving it from `value`
  // would fight the user's finger.
  const initialOffset = useMemo(
    () => clampNumber(value, 0, MAX_RATING) * UNIT_SPACING,
    [],
  );

  const scrollX = useSharedValue(initialOffset);
  /** Last step a haptic fired for, so each mark ticks exactly once. */
  const lastStep = useSharedValue(Math.round(initialOffset / TICK_SPACING));

  const tick = useCallback((): void => {
    void Haptics.selectionAsync().catch(() => undefined);
  }, []);

  const commit = useCallback(
    (offset: number): void => {
      const steps = Math.round(offset / TICK_SPACING);
      const clamped = Math.min(Math.max(steps, 0), TOTAL_STEPS);
      onChange(Number((clamped / STEPS_PER_UNIT).toFixed(1)));
    },
    [onChange],
  );

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;

      // One tick per mark crossed. Rate-limits itself: there are only 100
      // marks across the whole scale, however fast the fling.
      const step = Math.round(event.contentOffset.x / TICK_SPACING);
      if (step !== lastStep.value) {
        lastStep.value = step;
        runOnJS(tick)();
      }
    },
  });

  const handleSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      commit(event.nativeEvent.contentOffset.x);
    },
    [commit],
  );

  /** The live value, written straight into the read-out from the UI thread. */
  const valueProps = useAnimatedProps(() => {
    const rating = clampWorklet(scrollX.value / UNIT_SPACING, 0, MAX_RATING);
    return { text: rating.toFixed(1) };
  });

  const valueColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      clampWorklet(scrollX.value / UNIT_SPACING, 0, MAX_RATING),
      COLOR_INPUTS,
      COLOR_OUTPUTS,
    ),
  }));

  const pointerProps = useAnimatedProps(() => ({
    fill: interpolateColor(
      clampWorklet(scrollX.value / UNIT_SPACING, 0, MAX_RATING),
      COLOR_INPUTS,
      COLOR_OUTPUTS,
    ),
  }));

  const ticks = useMemo(
    () => Array.from({ length: TOTAL_STEPS + 1 }, (_, step) => step),
    [],
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Reserves the marks' place in the column; the scroll below draws them. */}
      <View style={styles.bandSpacer} />

      <Svg
        width={POINTER_WIDTH}
        height={POINTER_HEIGHT}
        viewBox={`0 0 ${POINTER_WIDTH} ${POINTER_HEIGHT}`}
        style={styles.pointer}
      >
        <AnimatedPath d={POINTER_PATH} animatedProps={pointerProps} />
      </Svg>

      {/* A TextInput purely so its content can be written from the UI thread —
          uneditable, and styled to read as text. */}
      <AnimatedTextInput
        editable={false}
        defaultValue={(initialOffset / UNIT_SPACING).toFixed(1)}
        style={[styles.value, valueColorStyle]}
        animatedProps={valueProps}
        accessibilityLabel="Selected rating"
      />

      {/* Fills the container — touch extension included — so the ruler responds
          anywhere in the block, not just on the marks. Rendered last so it sits
          above the read-out; it draws nothing of its own, and the pointer and
          read-out take no touches. */}
      {viewportWidth > 0 ? (
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Snapping to the mark spacing is what makes every stop land on a
        // clean 0.1, and `fast` deceleration keeps the ruler from drifting.
        snapToInterval={TICK_SPACING}
        decelerationRate="fast"
        contentOffset={{ x: initialOffset, y: 0 }}
        // Half the viewport each side lets the first and last mark reach the
        // centre, and makes a mark's scroll offset exactly index * spacing.
        contentContainerStyle={{ paddingHorizontal: viewportWidth / 2 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={handleSettled}
        onMomentumScrollEnd={handleSettled}
        style={styles.scrollOverlay}
      >
        <View style={styles.band}>
          {ticks.map((step) => {
            const decimal = step % STEPS_PER_UNIT;
            const left = step * TICK_SPACING - TICK_WIDTH / 2;

            if (decimal !== 0) {
              return (
                <View
                  key={step}
                  style={[
                    styles.tick,
                    {
                      left,
                      top: BAND_PADDING_TOP,
                      height: DECIMAL_TICK_HEIGHTS[decimal - 1],
                    },
                  ]}
                />
              );
            }

            return (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.tick,
                    {
                      left,
                      top: BAND_PADDING_TOP + INTEGER_TICK_TOP,
                      height: INTEGER_TICK_HEIGHT,
                    },
                  ]}
                />
                <IntegerLabel
                  unit={step / STEPS_PER_UNIT}
                  scrollX={scrollX}
                />
              </React.Fragment>
            );
          })}
        </View>
      </Animated.ScrollView>
      ) : null}
    </View>
  );
}

interface IntegerLabelProps {
  /** The whole number this label marks, 0 through 10. */
  unit: number;
  scrollX: SharedValue<number>;
}

/**
 * A whole-number label on the ruler. Swells towards the pointer and settles
 * back as it moves away; its colour is the tier that number falls in.
 */
function IntegerLabel({ unit, scrollX }: IntegerLabelProps): React.JSX.Element {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(unit * UNIT_SPACING - scrollX.value);
    return {
      transform: [
        {
          scale: interpolate(
            distance,
            [0, UNIT_SPACING],
            [LABEL_ACTIVE_SCALE, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const color = useMemo(() => tierColorFor(unit), [unit]);

  return (
    <Animated.View
      style={[
        styles.labelBox,
        { left: unit * UNIT_SPACING - LABEL_BOX_WIDTH / 2 },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Animated.Text style={[styles.label, { color }]}>{unit}</Animated.Text>
    </Animated.View>
  );
}

/** The tier colour for a whole number, falling back for values below the scale. */
function tierColorFor(unit: number): string {
  const tier = RATING_COLOR_TIERS.find(
    (t) => unit >= t.min && unit <= t.max + 1e-9,
  );
  return tier?.color ?? Colors.textMuted;
}

/** Worklet-safe clamp for the animated readouts. */
function clampWorklet(input: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(input, min), max);
}

/** Plain clamp for the mount-time offset. */
function clampNumber(input: number, min: number, max: number): number {
  return Math.min(Math.max(input, min), max);
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    // Real height for the drag area, cancelled out of the parent's flow so
    // nothing below it moves.
    paddingBottom: TOUCH_EXTENSION,
    marginBottom: -TOUCH_EXTENSION,
  },
  bandSpacer: {
    width: '100%',
    height: BAND_TOTAL_HEIGHT,
  },
  scrollOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  band: {
    height: BAND_TOTAL_HEIGHT,
    width: TOTAL_STEPS * TICK_SPACING,
  },
  tick: {
    position: 'absolute',
    width: TICK_WIDTH,
    borderRadius: TICK_WIDTH / 2,
    backgroundColor: Colors.rulerTick,
  },
  labelBox: {
    position: 'absolute',
    top: LABEL_BOX_TOP,
    width: LABEL_BOX_WIDTH,
    height: LABEL_BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.black,
    fontSize: LABEL_FONT_SIZE,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pointer: {
    marginTop: 15,
  },
  value: {
    fontFamily: FontFamily.bold,
    fontSize: 48,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    padding: 0,
    marginTop: 4,
    minWidth: 140,
    includeFontPadding: false,
  },
});
