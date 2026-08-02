import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import StarRating from '@/src/components/home/StarRating';
import { useRatingFormat } from '@/src/hooks/use-rating-format';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { formatRating, toStarValue } from '@/src/utils/rating-format.utils';
import type { MediaType } from '@/src/types/lists.types';

interface RatingDisplayProps {
  /** The rating on the canonical 0.0-10.0 scale, or null when unrated. */
  value: number | null;
  /** Which media type's format preference applies. Episodes pass 'series'. */
  mediaType: MediaType;
  /** Star size / numeric font size in pixels. Defaults to 14. */
  size?: number;
  /** Colour for the stars, or the numeric text. Defaults to accentBlue. */
  color?: string;
  /** Gap between stars. Forwarded to StarRating. */
  gap?: number;
}

/**
 * Renders a canonical rating in whichever scale the viewer prefers — five
 * stars, or the 0.0-10.0 number.
 *
 * This is the only place a stored rating becomes a star value. `StarRating`
 * itself is untouched and still speaks 0-5 in half steps; it just receives a
 * converted value. Routing every read through one component is what stops the
 * app ending up half in stars and half in numbers.
 */
export default function RatingDisplay({
  value,
  mediaType,
  size = 14,
  color = Colors.accentBlue,
  gap,
}: RatingDisplayProps): React.JSX.Element | null {
  const format = useRatingFormat(mediaType);

  if (value === null) return null;

  if (format === 'numeric') {
    return (
      <View style={styles.numericWrap}>
        <Text style={[styles.numeric, { fontSize: size, color }]}>
          {formatRating(value, 'numeric')}
        </Text>
      </View>
    );
  }

  return (
    <StarRating
      rating={toStarValue(value) ?? 0}
      size={size}
      color={color}
      {...(gap !== undefined ? { gap } : {})}
    />
  );
}

const styles = StyleSheet.create({
  numericWrap: {
    justifyContent: 'center',
  },
  numeric: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: LetterSpacing.tight,
  },
});
