import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/src/components/auth/BackButton';
import { SwipeableStarRating } from '@/src/components/log/SwipeableStarRating';
import NumericRatingSlider from '@/src/components/log/NumericRatingSlider';
import { useRatingFormat } from '@/src/hooks/use-rating-format';
import {
  formatRating,
  toCanonicalValue,
  toStarValue,
} from '@/src/utils/rating-format.utils';
import { useLog } from '@/src/context/LogContext';
import {
  Colors,
  FontFamily,
  LetterSpacing,
  Radius,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '@/src/lib/colors';

/**
 * Review Screen 1: "Introduce your rating".
 * Lets the user set a rating and continue to the review details screen —
 * with the five-star picker or the 0-10 ruler, whichever scale they prefer
 * for this media type. Either way the value it stores is canonical.
 */
export default function LogRatingScreen(): React.JSX.Element {
  const log = useLog();
  const insets = useSafeAreaInsets();
  const ratingFormat = useRatingFormat(log.mediaType);

  const handleContinue = (): void => {
    router.push('/log/details');
  };

  const ratingText = formatRating(log.rating, ratingFormat) ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.backRow, { top: insets.top + 16 }]}>
        <BackButton />
      </View>

      <View style={styles.middle}>
        <Text style={styles.title}>Introduce your rating</Text>
        <Text style={styles.subtitle}>How good was it?</Text>

        {ratingFormat === 'numeric' ? (
          <NumericRatingSlider value={log.rating} onChange={log.setRating} />
        ) : (
          <>
            <View style={styles.starsRow}>
              <SwipeableStarRating
                value={toStarValue(log.rating) ?? 0}
                onChange={(stars) => log.setRating(toCanonicalValue(stars))}
              />
            </View>

            <Text style={styles.ratingValue}>{ratingText}</Text>
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET - 16}]}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backRow: {
    position: 'absolute',
    left: 20,
    zIndex: 2,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: -10,
    includeFontPadding: false,
  },
  starsRow: {
    marginTop: 8,
  },
  ratingValue: {
    fontFamily: FontFamily.bold,
    fontSize: 36,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    includeFontPadding: false,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 34,
  },
  button: {
    height: 43,
    backgroundColor: Colors.white,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.buttonText,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
});
