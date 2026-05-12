import React, { useCallback, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Spacing } from '@/src/lib/colors';
import TrendingCard, { type TrendingFilm } from './TrendingCard';

interface Props {
  films: TrendingFilm[];
  loading?: boolean;
  onCardPress: (film: TrendingFilm) => void;
}

const CARD_WIDTH = 350;
const GAP = 10;
const SNAP_INTERVAL = CARD_WIDTH + GAP;
const SKELETON_COUNT = 3;

export default function TrendingCarousel({
  films,
  loading = false,
  onCardPress,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  const showSkeletons = loading || films.length === 0;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const index = Math.round(x / SNAP_INTERVAL);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex],
  );

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  if (showSkeletons) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        contentContainerStyle={styles.content}
      >
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <View
            key={`skeleton-${i}`}
            style={[
              styles.cardWrapper,
              i < SKELETON_COUNT - 1 && styles.cardGap,
            ]}
          >
            <TrendingCard film={null} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {films.map((film, i) => (
        <View
          key={film.tmdb_id}
          style={[styles.cardWrapper, i < films.length - 1 && styles.cardGap]}
        >
          <TrendingCard
            film={film}
            active={i === activeIndex}
            muted={muted}
            onToggleMute={toggleMute}
            onPress={() => onCardPress(film)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.screenH,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  cardGap: {
    marginRight: GAP,
  },
});
