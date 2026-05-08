import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing } from '@/src/lib/colors';
import type { StatsOverview, StatsTime } from '@/src/types/stats.types';

interface Props {
  overview: StatsOverview;
  time: StatsTime;
}

const SIZE = 150;
const STROKE_WIDTH = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Donut chart comparing films vs series, alongside totals and a
 * "FILM ENTHUSIAST" / "SERIES ENTHUSIAST" badge.
 */
export default function FilmsVsSeriesChart({ overview, time }: Props): React.JSX.Element {
  const filmsCount = Number(overview.films_count ?? 0);
  const seriesCount = Number(overview.series_count ?? 0);
  const totalMinutes = Number(time.total_minutes ?? 0);

  const totalCount = filmsCount + seriesCount;
  const filmsPct = totalCount > 0 ? filmsCount / totalCount : 0;
  const seriesPct = totalCount > 0 ? seriesCount / totalCount : 0;

  const filmsDash = filmsPct * CIRCUMFERENCE;
  const isFilmEnthusiast = filmsCount >= seriesCount;

  const filmsPctLabel = `${Math.round(filmsPct * 100)}%`;
  const seriesPctLabel = `${Math.round(seriesPct * 100)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE}>
          {/* Track (series) */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Films arc */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={Colors.accentBlue}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${filmsDash} ${CIRCUMFERENCE - filmsDash}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.donutLabels} pointerEvents="none">
          <Text style={styles.donutLabel}>
            <Text style={styles.donutLabelKey}>Films </Text>
            {filmsPctLabel}
          </Text>
          <Text style={styles.donutLabel}>
            <Text style={styles.donutLabelKey}>Series </Text>
            {seriesPctLabel}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.minutes}>{totalMinutes.toLocaleString('en-US')}</Text>
        <Text style={styles.minutesCaption}>MINUTES STREAMED</Text>
        <Text style={styles.split}>
          {filmsCount} Films • {seriesCount} Series
        </Text>
        <View style={styles.badge}>
          <Ionicons
            name={isFilmEnthusiast ? 'film-outline' : 'tv-outline'}
            size={12}
            color={Colors.white}
          />
          <Text style={styles.badgeText}>
            {isFilmEnthusiast ? 'FILM ENTHUSIAST' : 'SERIES ENTHUSIAST'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    gap: 16,
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLabels: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.white,
  },
  donutLabelKey: {
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  right: {
    flex: 1,
    alignItems: 'center',
  },
  minutes: {
    fontFamily: FontFamily.black,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -1,
  },
  minutesCaption: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: -2,
  },
  split: {
    marginTop: 8,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: Colors.accentBlue,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
  },
});
