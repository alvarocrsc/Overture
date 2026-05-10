import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import DotGrid from '@/src/components/stats/DotGrid';
import StarRating from '@/src/components/home/StarRating';
import { Colors, FontFamily } from '@/src/lib/colors';
import type { RatingDistributionEntry } from '@/src/types/stats.types';

interface RatingDistributionChartProps {
  distribution: RatingDistributionEntry[];
}

const CHART_WIDTH = 390;
const CHART_HEIGHT = 116;

const BARS_LEFT = 50;
const BARS_TOP = 41;
const BARS_WIDTH = 245;
const BARS_HEIGHT = 75;

const BAR_WIDTH = 23;
const BAR_GAP = (BARS_WIDTH - BAR_WIDTH * 10) / 9;
const MAX_BAR_HEIGHT = 60;
const MIN_BAR_HEIGHT = 1;

const DOT_ROWS = 11;
const DOT_SPACING = 17;

/**
 * Vertical bar chart of the user's full rating distribution
 * (10 buckets, 0.5–5.0). Drag horizontally to highlight a bucket
 * and reveal the exact count above the bar.
 */
export default function RatingDistributionChart({
  distribution,
}: RatingDistributionChartProps): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = useMemo<number>(
    () => Math.max(1, ...distribution.map((d) => d.count)),
    [distribution],
  );

  const updateActive = (x: number): void => {
    const local = x - BARS_LEFT;
    if (local < 0 || local > BARS_WIDTH) {
      setActiveIndex(null);
      return;
    }
    const idx = Math.floor(local / (BAR_WIDTH + BAR_GAP));
    if (idx >= 0 && idx < 10) setActiveIndex(idx);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      updateActive(e.x);
    })
    .onUpdate((e) => {
      updateActive(e.x);
    })
    .onEnd(() => {
      setActiveIndex(null);
    });

  return (
    <View style={styles.outer}>
      <View style={styles.topDivider} />
      <GestureDetector gesture={pan}>
        <View style={styles.chart}>
          <DotGrid
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            rows={DOT_ROWS}
            spacing={DOT_SPACING}
            inset={6}
          />

          {/* Header text top-right */}
          <View style={styles.header} pointerEvents="none">
            <Text style={styles.headerSmall}>Rating</Text>
            <Text style={styles.headerLarge}>DISTRIBUTION</Text>
          </View>

          {/* Bars */}
          <View style={styles.bars} pointerEvents="none">
            {distribution.slice(0, 10).map((d, i) => {
              const ratio = d.count / max;
              const barH = Math.max(
                MIN_BAR_HEIGHT,
                Math.round(ratio * MAX_BAR_HEIGHT),
              );
              const isActive = activeIndex === i;
              return (
                <View key={d.value} style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: BAR_WIDTH,
                        height: barH,
                        backgroundColor: isActive ? Colors.accentBlue : '#EEEEEE',
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          {/* Star scale below */}
          <View style={styles.scaleLeft} pointerEvents="none">
            <StarRating rating={1} size={10} color={Colors.accentBlue} />
          </View>

          {/* Right scale: stars fixed at baseline; count floats above them */}
          <View style={styles.scaleRight} pointerEvents="none">
            {activeIndex !== null && distribution[activeIndex] != null ? (
              <Text style={styles.activeCount}>
                {distribution[activeIndex]!.count}
              </Text>
            ) : null}
            <StarRating
              rating={
                activeIndex !== null && distribution[activeIndex] != null
                  ? distribution[activeIndex]!.value
                  : 5
              }
              size={10}
              color={Colors.accentBlue}
            />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  topDivider: {
    width: 350,
    height: 1,
    backgroundColor: '#3A3A3A',
    marginBottom: 12,
  },
  chart: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  },
  header: {
    position: 'absolute',
    top: 8,
    right: 20,
    alignItems: 'flex-end',
  },
  headerSmall: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: -1,
  },
  headerLarge: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: -1,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  bars: {
    position: 'absolute',
    left: BARS_LEFT,
    top: BARS_TOP,
    width: BARS_WIDTH,
    height: BARS_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    width: BAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  scaleLeft: {
    position: 'absolute',
    left: 20,
    top: BARS_TOP + BARS_HEIGHT - 10,
  },
  scaleRight: {
    position: 'absolute',
    left: CHART_WIDTH - 20 - 54,
    top: BARS_TOP + BARS_HEIGHT - 10,
    width: 54,
    alignItems: 'flex-start',
  },
  activeCount: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.accentBlue,
    letterSpacing: -0.5,
  },
});
