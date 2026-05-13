import React, { useCallback, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CARD_GAP, SCREEN_PADDING_H, useLayout } from '@/src/lib/layout';
import TrendingCard, { type TrendingFilm } from './TrendingCard';

interface Props {
  films: TrendingFilm[];
  loading?: boolean;
  onCardPress: (film: TrendingFilm) => void;
}

const SKELETON_COUNT = 3;

export default function TrendingCarousel({
  films,
  loading = false,
  onCardPress,
}: Props) {
  const { fullCarouselCardWidth } = useLayout();
  const cardWidth = fullCarouselCardWidth;
  const snapInterval = cardWidth + CARD_GAP;
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  const showSkeletons = loading || films.length === 0;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const index = Math.round(x / snapInterval);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, snapInterval],
  );

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  if (showSkeletons) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        contentContainerStyle={styles.content}
      >
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <View
            key={`skeleton-${i}`}
            style={[
              { width: cardWidth },
              i < SKELETON_COUNT - 1 && styles.cardGap,
            ]}
          >
            <TrendingCard film={null} cardWidth={cardWidth} />
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
      snapToInterval={snapInterval}
      snapToAlignment="start"
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {films.map((film, i) => (
        <View
          key={film.tmdb_id}
          style={[
            { width: cardWidth },
            i < films.length - 1 && styles.cardGap,
          ]}
        >
          <TrendingCard
            film={film}
            cardWidth={cardWidth}
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
    paddingHorizontal: SCREEN_PADDING_H,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
