import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors, TAB_BAR_BOTTOM_OFFSET, TAB_BAR_HEIGHT } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';

import HomeHeader from '@/src/components/home/HomeHeader';
import SectionHeader from '@/src/components/home/SectionHeader';
import HorizontalCarousel from '@/src/components/home/HorizontalCarousel';
import FriendActivityCard from '@/src/components/home/FriendActivityCard';
import FilmPosterCard from '@/src/components/home/FilmPosterCard';
import { DividesCarousel } from '@/src/components/home/DividesCarousel';

import { useNewFilms, useNewSeries } from '@/src/hooks/useNewReleases';
import { useFriendsActivity } from '@/src/hooks/useFriendsActivity';
import { MOCK_DIVIDES } from '@/src/data/homeMockData';

// Placeholder backdrop from TMDB
const PLACEHOLDER_BACKDROP = backdropUrl('/8EmbaG1ydsmMakFWwD0MeEudAgz.jpg', 'w1280');

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'films' | 'series'>('films');
  const insets = useSafeAreaInsets();
  const overlay = useOverlayNavigator();
  const router = useRouter();

  const { data: newFilms } = useNewFilms();
  const { data: newSeries } = useNewSeries();
  const { data: friendsActivity } = useFriendsActivity(
    activeTab === 'films' ? 'film' : 'series',
  );

  const newItems = activeTab === 'films' ? (newFilms ?? []) : (newSeries ?? []);

  const handlePressTitle = (tmdbId: number): void => {
    router.push({
      pathname: activeTab === 'films' ? '/film/[tmdbId]' : '/series/[tmdbId]',
      params: { tmdbId: tmdbId.toString() },
    } as never);
  };

  const handlePressFriendActivity = (
    tmdbId: number,
    mediaType: 'film' | 'series',
    reviewId: number | null,
  ): void => {
    if (reviewId != null) {
      router.push({ pathname: '/review/[id]', params: { id: String(reviewId) } } as never);
      return;
    }
    router.push({
      pathname: mediaType === 'film' ? '/film/[tmdbId]' : '/series/[tmdbId]',
      params: { tmdbId: tmdbId.toString() },
    } as never);
  };

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
            subtitle={
              activeTab === 'films'
                ? 'Films through the eyes of those you know.'
                : 'Series through the eyes of those you know.'
            }
            subtitleAccent="through the eyes"
            onSeeAll={() => {}}
          />
          <HorizontalCarousel>
            {(friendsActivity ?? []).map((item) => (
              <FriendActivityCard
                key={item.id}
                posterPath={item.poster_path}
                filmTitle={item.title}
                username={item.username}
                userId={item.user_id}
                avatarUrl={item.avatar_url}
                rating={item.rating}
                reviewId={item.review_id}
                onPress={() =>
                  handlePressFriendActivity(item.tmdb_id, item.media_type, item.review_id)
                }
                onAvatarPress={() =>
                  overlay.present('user', { id: item.user_id })
                }
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
              <FilmPosterCard
                key={item.id}
                posterPath={item.poster_path}
                onPress={() => handlePressTitle(item.id)}
              />
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
