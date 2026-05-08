import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';
import DotGrid from './DotGrid';
import type { DecadeEntry } from '@/src/types/stats.types';

interface Props {
  decades: DecadeEntry[];
}

// Container dimensions — same width as every full-bleed stats section.
const CONTAINER_W = 390;
// Tallest bar (77) + decade label (~20) + bottom padding (18) + title row (~32)
const CONTAINER_H = 150;

// Static bar dimensions per Figma node 729:201 (most-watched → smallest last).
const BAR_DIMENSIONS = [
  { width: 118, height: 77 },
  { width: 97, height: 56 },
  { width: 79, height: 40 },
];

const BAR_COLORS = [Colors.accentBlue, '#4D9EE8', '#80BBEF'];

// Dot grid — same spec as TopGenres.
const DOT_ROWS = 9;
const DOT_SPACING = 17;

/**
 * Stepped bar chart of the user's top 3 decades.
 * Decade labels sit above each bar in the bar's own color.
 * The percentage is centered inside the bar.
 * Bar dimensions are fixed (Figma) — never derived from data.
 * A dotted grid spans the background.
 */
export default function TopDecades({ decades }: Props): React.JSX.Element {
  const top = decades.slice(0, 3);
  const total = decades.reduce((acc, d) => acc + Number(d.count ?? 0), 0);

  return (
    <View style={styles.container}>
      <DotGrid
        width={CONTAINER_W}
        height={CONTAINER_H}
        rows={DOT_ROWS}
        spacing={DOT_SPACING}
        inset={0}
      />

      <View style={styles.barsRow}>
        {top.map((d, i) => {
          const dim = BAR_DIMENSIONS[i] ?? BAR_DIMENSIONS[2];
          const barColor = BAR_COLORS[i] ?? BAR_COLORS[2];
          const pct = total > 0 ? Math.round((Number(d.count ?? 0) / total) * 100) : 0;
          return (
            <View key={d.decade} style={styles.barWrapper}>
              {/* Decade label above the bar, colored to match bar */}
              <Text style={[styles.decadeLabel, { color: barColor }]}>
                {d.decade}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    width: dim.width,
                    height: dim.height,
                    backgroundColor: barColor,
                  },
                ]}
              >
                <Text style={styles.pctLabel}>{pct}%</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Title — identical style to TopGenres "Your top GENRES" */}
      <View style={styles.titleBlock}>
        <Text style={styles.titleSmall}>Your top</Text>
        <Text style={styles.titleLarge}>DECADES</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_W,
    height: CONTAINER_H,
    alignSelf: 'center',
  },
  barsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  barWrapper: {
    alignItems: 'center',
  },
  decadeLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  bar: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctLabel: {
    fontFamily: FontFamily.black,
    fontSize: 14,
    color: Colors.background,
    textAlign: 'center',
  },
  titleBlock: {
    position: 'absolute',
    top: 10,
    right: 55,
    alignItems: 'flex-end',
  },
  titleSmall: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
});
