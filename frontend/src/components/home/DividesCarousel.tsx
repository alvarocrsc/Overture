import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DividesCard from './DividesCard';
import { posterUrl } from '@/src/lib/tmdb';
import type { DividesRow } from '@/src/hooks/useDivides';

const CARD_WIDTH = 250;      
const CARD_HEIGHT = 169;     
const POSTER_WIDTH = 114;    
const SCREEN_PADDING_LEFT = 20;

const PEEK_1_LEFT_REST = 197;
const PEEK_1_TOP_REST = 7;
const PEEK_1_HEIGHT_REST = 156;

const PEEK_2_LEFT_REST = 256;
const PEEK_2_TOP_REST = 17;
const PEEK_2_HEIGHT_REST = 135;

const PEEK_CARD_WIDTH_REST = POSTER_WIDTH;

const SWIPE_THRESHOLD = 50;
const CARD_BORDER_RADIUS = 10;
const ANIMATION_DURATION = 340;
interface DividesCarouselProps {
  items: DividesRow[];
}

function wrapIndex(i: number, total: number): number {
  return ((i % total) + total) % total;
}

function toCardProps(item: DividesRow) {
  return {
    posterPath: item.poster_path,
    title: item.title,
    negativePercent: item.negative_percent,
    positivePercent: item.positive_percent,
    worstRating: item.worst_rating,
    bestRating: item.best_rating,
    worstAvatarUrl: item.worst_avatar_url,
    bestAvatarUrl: item.best_avatar_url,
    worstUsername: item.worst_username,
    bestUsername: item.best_username,
    friendCount: item.friend_count,
    ratingSpread: item.rating_spread,
  };
}

/**
 * Stacked deck carousel for the "Divides your friends" section.
 *
 * Three cards are always visible: the front card as a full DividesCard, and
 * two poster-only peeks behind it. 
 */
export function DividesCarousel({ items }: DividesCarouselProps): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions();
  const peek2Left = screenWidth - SCREEN_PADDING_LEFT - 20 - PEEK_CARD_WIDTH_REST;

  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useSharedValue(0);
  const total = items.length;

  const frontItem = items[wrapIndex(activeIndex, total)];
  const peek1Item = items[wrapIndex(activeIndex + 1, total)];
  const peek2Item = items[wrapIndex(activeIndex + 2, total)];
  const peek3Item = items[wrapIndex(activeIndex + 3, total)];

  useEffect(() => {
    const urls = items
      .map((it) => posterUrl(it.poster_path, 'w500'))
      .filter((u): u is string => Boolean(u));
    if (urls.length > 0) {
      Image.prefetch(urls, 'memory-disk');
    }
  }, [items]);

  const commitAdvance = (): void => {
    setActiveIndex((prev) => wrapIndex(prev + 1, total));
    progress.value = 0;
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    progress.value = withTiming(1, { duration: ANIMATION_DURATION }, (finished) => {
      if (finished) {
        runOnJS(commitAdvance)();
      }
    });
  });

  const frontStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = interpolate(p, [0, 1], [0, -(CARD_WIDTH + 40)], Extrapolation.CLAMP);
    const width = interpolate(p, [0, 0.6], [CARD_WIDTH, POSTER_WIDTH], Extrapolation.CLAMP);
    return {
      transform: [{ translateX }],
      width,
      opacity: interpolate(p, [0.7, 1], [1, 0], Extrapolation.CLAMP),
    };
  });

  const frontContentMaskStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.25], [0, 1], Extrapolation.CLAMP),
    };
  });

  const peek1Style = useAnimatedStyle(() => {
    const p = progress.value;
    const left = interpolate(p, [0, 1], [PEEK_1_LEFT_REST, 0], Extrapolation.CLAMP);
    const top = interpolate(p, [0, 1], [PEEK_1_TOP_REST, 0], Extrapolation.CLAMP);
    const width = interpolate(p, [0.2, 1], [PEEK_CARD_WIDTH_REST, CARD_WIDTH], Extrapolation.CLAMP);
    const height = interpolate(p, [0, 1], [PEEK_1_HEIGHT_REST, CARD_HEIGHT], Extrapolation.CLAMP);
    return { left, top, width, height };
  });

  const peek2Style = useAnimatedStyle(() => {
    const p = progress.value;
    const left = interpolate(p, [0, 1], [peek2Left, PEEK_1_LEFT_REST], Extrapolation.CLAMP);
    const top = interpolate(p, [0, 1], [PEEK_2_TOP_REST, PEEK_1_TOP_REST], Extrapolation.CLAMP);
    const height = interpolate(p, [0, 1], [PEEK_2_HEIGHT_REST, PEEK_1_HEIGHT_REST], Extrapolation.CLAMP);
    return { left, top, height };
  });

  const peek3Style = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(p, [0.3, 0.8], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(p, [0.3, 1], [0.85, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const peek2DarkStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.22, 0], Extrapolation.CLAMP),
    };
  });
  const peek3DarkStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.4, 0.22], Extrapolation.CLAMP),
    };
  });

  const uri2 = posterUrl(peek2Item.poster_path, 'w500');
  const uri3 = posterUrl(peek3Item.poster_path, 'w500');

  return (
    <View style={styles.container}>

      {/* ── Peek-3 (incoming, fades in at back position) ─────────────── */}
      <Animated.View style={[styles.peek2Wrapper, { left: peek2Left }, peek3Style]}>
        <Image
          source={uri3 ? { uri: uri3 } : undefined}
          style={styles.peekImage}
          contentFit="cover"
          placeholder="#222"
          transition={0}
          recyclingKey={`peek3-${peek3Item.id}`}
          cachePolicy="memory-disk"
        />
        <Animated.View pointerEvents="none" style={[styles.darkOverlay, peek3DarkStyle]} />
      </Animated.View>

      {/* ── Peek-2 (moves to peek-1 slot) ────────────────────────────── */}
      <Animated.View style={[styles.peekWrapper, peek2Style]}>
        <Image
          source={uri2 ? { uri: uri2 } : undefined}
          style={styles.peekImage}
          contentFit="cover"
          placeholder="#222"
          transition={0}
          recyclingKey={`peek2-${peek2Item.id}`}
          cachePolicy="memory-disk"
        />
        <Animated.View pointerEvents="none" style={[styles.darkOverlay, peek2DarkStyle]} />
      </Animated.View>

      {/* ── Peek-1 (tap to advance, expands to become next front card) ── */}
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={[styles.cardWrapper, peek1Style]}>
          <DividesCard {...toCardProps(peek1Item)} onSeeDebate={() => {}} />
        </Animated.View>
      </GestureDetector>

      {/* ── Front card (shrinks to poster and slides left) ───────────── */}
      <Animated.View style={[styles.cardWrapper, styles.frontCard, frontStyle]}>
        <DividesCard {...toCardProps(frontItem)} onSeeDebate={() => {}} />
        <Animated.View
          pointerEvents="none"
          style={[styles.frontMask, frontContentMaskStyle]}
        />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT,
    marginLeft: SCREEN_PADDING_LEFT,
  },

  cardWrapper: {
    position: 'absolute',
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#171717',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  frontCard: {
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    zIndex: 10,
  },

  frontMask: {
    position: 'absolute',
    top: 0,
    left: POSTER_WIDTH,
    right: 0,
    bottom: 0,
    backgroundColor: '#171717',
  },

  peekWrapper: {
    position: 'absolute',
    width: PEEK_CARD_WIDTH_REST,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#171717',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
  },

  peek2Wrapper: {
    position: 'absolute',
    top: PEEK_2_TOP_REST,
    left: PEEK_2_LEFT_REST,
    width: PEEK_CARD_WIDTH_REST,
    height: PEEK_2_HEIGHT_REST,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#171717',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },

  peekImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PEEK_CARD_WIDTH_REST,
    height: CARD_HEIGHT,
  },

  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
