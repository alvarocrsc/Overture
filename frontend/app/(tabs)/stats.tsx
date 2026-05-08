import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';

import SectionHeader from '@/src/components/home/SectionHeader';
import StatsPeriodFilter from '@/src/components/stats/StatsPeriodFilter';
import StatsOverviewGrid from '@/src/components/stats/StatsOverviewGrid';
import ActivityCalendar from '@/src/components/stats/ActivityCalendar';
import StreakDisplay from '@/src/components/stats/StreakDisplay';
import MostWatched from '@/src/components/stats/MostWatched';
import FilmsVsSeriesChart from '@/src/components/stats/FilmsVsSeriesChart';
import TopGenres from '@/src/components/stats/TopGenres';
import TopDecades from '@/src/components/stats/TopDecades';

import { useStats } from '@/src/hooks/useStats';
import type { StatsPeriod } from '@/src/types/stats.types';

/**
 * Stats tab — renders a personal cinema dashboard for the current user.
 * Sections (top to bottom): header + period filter, overview grid,
 * activity calendar, streak, most-watched podiums, films vs series donut,
 * top genres, top decades.
 */
export default function StatsScreen(): React.JSX.Element {
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading } = useStats(period);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Your Stats</Text>
        <Pressable
          onPress={() => {}}
          hitSlop={12}
          style={({ pressed }) => [styles.bell, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.white} />
        </Pressable>
      </View>

      <StatsPeriodFilter active={period} onChange={setPeriod} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 32,
          },
        ]}
      >
        {isLoading || !stats ? (
          <ActivityIndicator color={Colors.accentBlue} style={styles.loader} />
        ) : (
          <>
            <StatsOverviewGrid overview={stats.overview} time={stats.time} />

            <View style={styles.sectionGap} />
            <SectionHeader
              title="Latest Activity"
              subtitle="Your cinema, day by day."
              subtitleAccent="day by day"
            />
            <ActivityCalendar calendar={stats.calendar} />

            <View style={styles.sectionGap} />
            <SectionHeader
              title="Longest streak"
              subtitle="Consistency is a form of taste."
              subtitleAccent="form of taste"
            />
            <StreakDisplay streak={stats.streak} />

            <View style={styles.sectionGap} />
            <SectionHeader
              title="Most watched"
              subtitle="Your personal hall of fame."
              subtitleAccent="hall of fame"
            />
            <MostWatched data={stats.most_watched} />

            <View style={styles.sectionGap} />
            <SectionHeader
              title="Films VS Series"
              subtitle="Where do your loyalties lie?"
              subtitleAccent="loyalties lie"
            />
            <FilmsVsSeriesChart overview={stats.overview} time={stats.time} />

            <View style={styles.sectionGap} />
            <TopGenres genres={stats.top_genres} />

            <View style={styles.sectionGap} />
            <TopDecades decades={stats.top_decades} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 16,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.heading,
    color: Colors.white,
    letterSpacing: -1,
  },
  bell: {
    padding: 4,
  },
  scroll: {
    paddingTop: 4,
  },
  sectionGap: {
    height: 28,
  },
  loader: {
    marginTop: 64,
  },
});
