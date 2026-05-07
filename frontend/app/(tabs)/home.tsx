import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, TAB_BAR_BOTTOM_OFFSET, TAB_BAR_HEIGHT } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';

import HomeHeader from '@/src/components/home/HomeHeader';
import SectionHeader from '@/src/components/home/SectionHeader';
import HorizontalCarousel from '@/src/components/home/HorizontalCarousel';
import FriendActivityCard from '@/src/components/home/FriendActivityCard';
import FilmPosterCard from '@/src/components/home/FilmPosterCard';
import { DividesCarousel } from '@/src/components/home/DividesCarousel';

import { useNewFilms, useNewSeries } from '@/src/hooks/useNewReleases';
import { MOCK_FRIENDS_ACTIVITY, MOCK_DIVIDES } from '@/src/data/homeMockData';

// Placeholder backdrop from TMDB
const PLACEHOLDER_BACKDROP = backdropUrl('/8EmbaG1ydsmMakFWwD0MeEudAgz.jpg', 'w1280');

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'films' | 'series'>('films');
  const insets = useSafeAreaInsets();

  const { data: newFilms } = useNewFilms();
  const { data: newSeries } = useNewSeries();

  const newItems = activeTab === 'films' ? (newFilms ?? []) : (newSeries ?? []);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 32 },
        ]}
      >
        {/* ── Header ── */}
        <HomeHeader
          backdropUri={PLACEHOLDER_BACKDROP}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* ── Friends' Activity ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Friends' activity"
            subtitle="Films through the eyes of those you know."
            subtitleAccent="through the eyes"
            onSeeAll={() => {}}
          />
          <HorizontalCarousel>
            {MOCK_FRIENDS_ACTIVITY.map((item) => (
              <FriendActivityCard
                key={item.id}
                posterPath={item.posterPath}
                filmTitle={item.filmTitle}
                username={item.username}
                avatarUrl={item.avatarUrl}
                rating={item.rating}
              />
            ))}
          </HorizontalCarousel>
        </View>

        {/* ── New Films / Series ── */}
        <View style={styles.section}>
          <SectionHeader
            title={activeTab === 'films' ? 'New films' : 'New series'}
            titleAccent="New"
            subtitle={
              activeTab === 'films'
                ? 'Just arrived on the big screen.'
                : 'Fresh episodes and new seasons.'
            }
            onSeeAll={() => {}}
          />
          <HorizontalCarousel>
            {newItems.map((item) => (
              <FilmPosterCard key={item.id} posterPath={item.poster_path} />
            ))}
          </HorizontalCarousel>
        </View>

        {/* ── Divides Your Friends ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Divides your friends"
            titleAccent="your friends"
            subtitle="Films your circle can't agree on."
            onSeeAll={() => {}}
          />
          <DividesCarousel items={MOCK_DIVIDES} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    marginTop: 24,
  },
});
