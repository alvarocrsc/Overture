import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { Spacing } from '@/src/lib/colors';

interface Props {
  /** Cards to render in the horizontal scroll. */
  children: React.ReactNode;
  /** Override default content container styles. */
  contentStyle?: ViewStyle;
}

/**
 * Horizontal scrollable container for card carousels on the Home screen.
 * Applies standard left screen padding so cards align with section headers.
 */
export default function HorizontalCarousel({ children, contentStyle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingLeft: Spacing.screenH,
    paddingRight: Spacing.screenH / 2,
  },
});
