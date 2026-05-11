import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { FullStarIcon } from '@/src/components/icons/FullStarIcon';
import { HalfStarIcon } from '@/src/components/icons/HalfStarIcon';
import { Colors } from '@/src/lib/colors';

interface SwipeableStarRatingProps {
  value: number;
  onChange: (next: number) => void;
  starSize?: number;
  gap?: number;
}

const TOTAL_STARS = 5;
const MIN_VALUE = 0.5;
const MAX_VALUE = 5;
const EMPTY_COLOR = '#3a3a3a';

export function SwipeableStarRating({
  value,
  onChange,
  starSize = 42,
  gap = 4,
}: SwipeableStarRatingProps): React.JSX.Element {
  const containerWidthRef = useRef<number>(0);
  const lastValueRef = useRef<number>(value);
  lastValueRef.current = value;

  const totalWidth = starSize * TOTAL_STARS + gap * (TOTAL_STARS - 1);

  const handleLayout = useCallback((e: LayoutChangeEvent): void => {
    containerWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const updateFromX = useCallback(
    (x: number): void => {
      const width = containerWidthRef.current || totalWidth;
      if (width <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / width));
      const raw = ratio * MAX_VALUE;
      let next = Math.round(raw * 2) / 2;
      if (next < MIN_VALUE) next = MIN_VALUE;
      if (next > MAX_VALUE) next = MAX_VALUE;
      if (next !== lastValueRef.current) {
        lastValueRef.current = next;
        onChange(next);
      }
    },
    [onChange, totalWidth],
  );

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      updateFromX(e.x);
    })
    .runOnJS(true);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      updateFromX(e.x);
    })
    .onUpdate((e) => {
      updateFromX(e.x);
    })
    .runOnJS(true);

  const composed = Gesture.Simultaneous(tap, pan);

  return (
    <GestureDetector gesture={composed}>
      <View
        onLayout={handleLayout}
        style={[styles.row, { width: totalWidth }]}
        accessibilityRole="adjustable"
        accessibilityLabel={`Rating ${value} of 5 stars`}
      >
        {Array.from({ length: TOTAL_STARS }).map((_, i) => {
          const position = i + 1;
          const isFull = value >= position;
          const isHalf = !isFull && value >= position - 0.5;
          const isFilled = isFull || isHalf;
          return (
            <View
              key={i}
              style={[
                styles.starSlot,
                {
                  width: starSize,
                  height: starSize,
                  marginRight: i < TOTAL_STARS - 1 ? gap : 0,
                },
              ]}
            >
              {isHalf ? (
                <>
                  {/* Empty star underneath, half-star overlay on top. */}
                  <View style={styles.absoluteFill}>
                    <FullStarIcon size={starSize} color={EMPTY_COLOR} />
                  </View>
                  <View style={styles.absoluteFill}>
                    <HalfStarIcon size={starSize} color={Colors.accentBlue} />
                  </View>
                </>
              ) : (
                <FullStarIcon
                  size={starSize}
                  color={isFilled ? Colors.accentBlue : EMPTY_COLOR}
                />
              )}
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  starSlot: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
