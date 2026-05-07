import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FullStarIcon } from '@/src/components/icons/FullStarIcon';
import { HalfStarIcon } from '@/src/components/icons/HalfStarIcon';
import { Colors } from '@/src/lib/colors';

interface StarRatingProps {
  /** Rating value between 0 and 5, in 0.5 increments. */
  rating: number;
  /** Star icon size in pixels. Defaults to 14. */
  size?: number;
  /** Star fill colour. Defaults to accentBlue. */
  color?: string;
  /** Gap between stars in pixels. Defaults to 0.9. */
  gap?: number;
}

export default function StarRating({
  rating,
  size = 14,
  color = Colors.accentBlue,
  gap = 0.9,
}: StarRatingProps): React.JSX.Element {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <FullStarIcon key={`full-${i}`} size={size} color={color} />
      ))}
      {hasHalf && <HalfStarIcon size={size} color={color} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
