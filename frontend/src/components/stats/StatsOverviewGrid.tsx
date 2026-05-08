import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/src/lib/colors';
import StatCard from './StatCard';
import { STAT_CARD_BACKDROPS } from '@/src/data/statCardBackdrops';
import type { StatsOverview, StatsTime } from '@/src/types/stats.types';

interface Props {
  overview: StatsOverview;
  time: StatsTime;
}

function formatNumber(n: number | string | null | undefined): string {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString('en-US') : '0';
}

function formatDecimal(n: number | string | null | undefined, digits: number): string {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toFixed(digits) : (0).toFixed(digits);
}

export default function StatsOverviewGrid({ overview, time }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        <StatCard
          label="FILMS LOGGED"
          value={formatNumber(overview.films_count)}
          tag={{ text: overview.percentile, bg: '#1d9e75', color: '#96ffac' }}
          backdropPath={STAT_CARD_BACKDROPS.filmsLogged}
        />
        <StatCard
          label="SERIES LOGGED"
          value={formatNumber(overview.series_count)}
          tag={{ text: overview.percentile, bg: '#e9c46a', color: '#e76f51' }}
          backdropPath={STAT_CARD_BACKDROPS.seriesLogged}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <StatCard
          label="MINUTES WATCHED"
          value={formatNumber(time.total_minutes)}
          tag={{ text: `That's ${time.total_days} days`, bg: Colors.accentBlue, color: '#bfd5ec' }}
          backdropPath={STAT_CARD_BACKDROPS.minutesWatched}
        />
        <StatCard
          label="AVG PER WEEK"
          value={formatDecimal(overview.avg_per_week, 1)}
          footer="Films & Series"
          backdropPath={STAT_CARD_BACKDROPS.avgPerWeek}
        />
      </View>

      {/* Row 3 */}
      <View style={styles.row}>
        <StatCard
          compact
          height={65}
          label="AVG RATING"
          value={formatDecimal(overview.avg_rating, 1)}
          backdropPath={STAT_CARD_BACKDROPS.avgRating}
          adornment={
            <Ionicons
              name="star"
              size={16}
              color={Colors.white}
              style={{ marginLeft: 4 }}
            />
          }
        />
        <StatCard
          compact
          height={65}
          label="REVIEWS"
          value={formatNumber(overview.review_count)}
          backdropPath={STAT_CARD_BACKDROPS.reviews}
        />
        <StatCard
          compact
          height={65}
          label="REWATCHES"
          value={formatNumber(overview.rewatch_count)}
          backdropPath={STAT_CARD_BACKDROPS.rewatches}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
