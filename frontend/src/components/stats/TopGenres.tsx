import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';
import DotGrid from './DotGrid';
import type { GenreEntry } from '@/src/types/stats.types';

interface Props {
  genres: GenreEntry[];
}

const CONTAINER_W = 390;
const CONTAINER_H = 180;
const DOT_ROWS = 15;
const DOT_SPACING = 17;
const BAR_HEIGHT = 25;
const BAR_TOP_FIRST = 5;
const BAR_GAP = 30;

const MAX_ROWS = 5;
const BAR_COLORS = [Colors.accentBlue, '#589ce4', '#87b1df', '#c5d0db', '#ffffff'];

/**
 * Left-aligned horizontal bar chart of the user's top 5 genres.
 * Bar widths are proportional to the count relative to the most-watched
 * genre.
 */
export default function TopGenres({ genres }: Props): React.JSX.Element {
  const top = genres.slice(0, MAX_ROWS);
  const totalCount = genres.reduce((acc, g) => acc + Number(g.count ?? 0), 0);
  const max = Number(top[0]?.count ?? 0);

  return (
    <View style={styles.container}>
      <DotGrid
        width={CONTAINER_W}
        height={CONTAINER_H}
        rows={DOT_ROWS}
        spacing={DOT_SPACING}
        inset={0}
      />

      {top.map((g, i) => {
        const count = Number(g.count ?? 0);
        const widthPct = max > 0 ? (count / max) * 82 : 0;
        const sharePct =
          totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        const rowTop = BAR_TOP_FIRST + i * BAR_GAP;
        const fill = BAR_COLORS[i] ?? BAR_COLORS[BAR_COLORS.length - 1];

        return (
          <View
            key={g.id}
            style={[styles.row, { top: rowTop, width: `${widthPct}%` }]}
          >
            <View style={[styles.bar, { backgroundColor: fill }]}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {g.name}
              </Text>
            </View>
            <Text style={[styles.barPct, { color: fill }]}>{sharePct}%</Text>
          </View>
        );
      })}

      <View style={styles.titleBlock}>
        <Text style={styles.titleSmall}>Your top</Text>
        <Text style={styles.titleLarge}>GENRES</Text>
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
  row: {
    position: 'absolute',
    left: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    flex: 1,
    height: BAR_HEIGHT,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  barLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.background,
    letterSpacing: -0.5,
  },
  barPct: {
    marginLeft: 8,
    fontFamily: FontFamily.black,
    fontSize: 12,
    letterSpacing: -0.5,
  },
  titleBlock: {
    position: 'absolute',
    bottom: 0,
    right: 18,
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
