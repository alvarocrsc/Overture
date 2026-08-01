import React, { useState } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Colors } from '@/src/lib/colors';

interface PinnedHeaderScrollViewProps extends Omit<ScrollViewProps, 'onScroll'> {
  /**
   * The block at the top of the screen — typically a backdrop / banner header.
   * It scrolls away with the content, but is never dragged past the top limit.
   */
  header: React.ReactNode;
  /** The scrolling content. This is what rubber-bands at the limits. */
  children: React.ReactNode;
}

/**
 * A vertical ScrollView whose header scrolls away normally but is physically
 * incapable of being dragged past the top scroll limit.
 *
 * The header is **not inside the scrolling content** — the same property that
 * makes the Stats screen's header immune to this problem. It is an overlay
 * pinned to the top of the screen, and the content is inset beneath it by the
 * header's measured height, so the resting layout is identical to having it
 * inline.
 *
 * Its offset is `-max(scrollY, 0)`, which means:
 *
 * - Scrolling normally (`scrollY > 0`) slides it up and out of view, exactly as
 *   an inline header would.
 * - At or past the top limit (`scrollY <= 0`) the expression is a constant 0, so
 *   the header is not transformed *at all* while the content bounces. It cannot
 *   drift, lag or open a gap above itself, because nothing is animating it.
 *
 * That is the key difference from compensating for the overscroll after the
 * fact: a correction that chases the scroll can only ever be approximately
 * right, and any error shows up as jitter against the fixed screen edge. Here
 * there is nothing to correct — the content moves and the header simply does
 * not.
 *
 * The bounce itself stays entirely native, so it keeps the standard iOS feel at
 * both limits.
 */
export default function PinnedHeaderScrollView({
  header,
  children,
  style,
  contentContainerStyle,
  ...scrollViewProps
}: PinnedHeaderScrollViewProps): React.JSX.Element {
  const scrollY = useSharedValue(0);
  // null until the header has been measured, so a header that legitimately has
  // zero height is not mistaken for "not measured yet".
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    // Clamped at 0: overscrolling past the top leaves this untouched, so the
    // header holds still without being animated.
    transform: [{ translateY: -Math.max(scrollY.value, 0) }],
  }));

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        {...scrollViewProps}
        style={[styles.scroll, style]}
        contentContainerStyle={[
          contentContainerStyle,
          {
            // Reserve the header's space, and stay hidden until it is measured
            // so the content never flashes at the top before being inset.
            paddingTop: headerHeight ?? 0,
            opacity: headerHeight == null ? 0 : 1,
          },
        ]}
        onScroll={handleScroll}
      >
        {children}
      </Animated.ScrollView>

      {/* Rendered after the ScrollView so it paints above the content, and given
          a solid background so content scrolling underneath cannot show through
          headers that are partially transparent. */}
      <Animated.View
        style={[styles.header, headerStyle]}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      >
        {header}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
  },
});
