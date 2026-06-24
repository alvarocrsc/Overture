import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useImport } from '@/src/context/ImportContext';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
  Spacing,
} from '@/src/lib/colors';
import type { ImportJob, ImportStep } from '@/src/types/import.types';

// The Letterboxd mark, extracted from assets/icons/letterboxd.svg.
const letterboxdLogo = require('../../../assets/icons/letterboxd.png');

/** How long the banner lingers (filled to 100%) after the import finishes. */
const DISMISS_DELAY_MS = 3500;

/** User-facing status line for each backend stage. */
const STEP_MESSAGES: Record<ImportStep, string> = {
  preparing: 'Preparing your import…',
  profile: 'Setting up your profile…',
  diary: 'Importing your diary…',
  ratings: 'Adding your ratings…',
  watchlist: 'Updating your watchlist…',
  likes: 'Saving your liked films…',
  reviews: 'Checking your reviews…',
};

/**
 * The status line under the title. Prefers the backend's reported stage; falls
 * back to a generic, progress-derived message when the backend doesn't yet
 * report `current_step`.
 */
function statusMessage(job: ImportJob | null): string {
  if (!job) return STEP_MESSAGES.preparing;
  if (job.status === 'completed') return 'Import complete!';
  if (job.status === 'failed') return 'Import failed';
  if (job.current_step) return STEP_MESSAGES[job.current_step];
  if (job.total_items <= 0) return STEP_MESSAGES.preparing;
  return 'Importing your films…';
}

/**
 * Fraction of work done (0–1). Counts every processed row — imported, skipped
 * or failed — so the bar still reaches 100% on a re-import where most rows
 * already existed. Completed jobs always read as full.
 */
function progressFraction(job: ImportJob | null): number {
  if (!job) return 0;
  if (job.status === 'completed') return 1;
  if (job.total_items <= 0) return 0;
  const processed = job.imported_items + job.skipped_items + job.failed_items;
  return Math.min(processed / job.total_items, 1);
}

/**
 * Floating, app-wide banner that mirrors the live Letterboxd import job — its
 * percentage, current stage, and a progress bar. It sits at the top of the
 * screen, is non-interactive so the user can keep using the app underneath, and
 * dismisses itself a few seconds after the import finishes. Renders nothing
 * when no import is being tracked.
 */
export default function ImportProgressBanner(): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const { job, isTracking, clearTracking } = useImport();

  const status = job?.status;
  const isTerminal = status === 'completed' || status === 'failed';
  const isFailed = status === 'failed';

  // Linger on the finished state, then dismiss so the banner "lasts until the
  // import has completed".
  useEffect(() => {
    if (!isTerminal) return;
    const timer = setTimeout(clearTracking, DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isTerminal, clearTracking]);

  // Glide the fill toward the latest fraction. The long, linear timing makes the
  // bar crawl continuously between the 2s polls instead of snapping to each new
  // value, so a jump like 44%→56% reads as smooth, progressive motion.
  const fraction = progressFraction(job);
  const fillWidth = useSharedValue(0);
  useEffect(() => {
    fillWidth.value = withTiming(fraction, {
      duration: 1900,
      easing: Easing.linear,
    });
  }, [fraction, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  // Drive the percentage label off the same animated value so it counts up in
  // lockstep with the bar, re-rendering only when the rounded value changes.
  const [shownPercent, setShownPercent] = useState(0);
  useAnimatedReaction(
    () => Math.round(fillWidth.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setShownPercent)(current);
    },
  );

  if (!isTracking) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOutUp.duration(220)}
      pointerEvents="none"
      style={[styles.container, { top: insets.top + 16 }]}
    >
      <Image source={letterboxdLogo} style={styles.logo} resizeMode="contain" />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          Importing to <Text style={styles.titleAccent}>Overture</Text>
        </Text>

        <View style={styles.midRow}>
          <Text style={styles.percent}>{`${shownPercent}%`}</Text>
          <Text
            style={[styles.status, isFailed && styles.statusError]}
            numberOfLines={1}
          >
            {statusMessage(job)}
          </Text>
        </View>

        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, isFailed && styles.fillError, fillStyle]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.screenH,
    right: Spacing.screenH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.bannerBackground,
    borderRadius: Radius.button,
    // Lift the card off whatever screen is behind it.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: {
    width: 50,
    height: 46,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.subtitle,
    lineHeight: 16,
    color: Colors.white,
    textAlign: 'right',
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
    // title → detail line gap. Paired with midRow.marginBottom (13) this also
    // lands the percentage on the banner's vertical centre, level with the
    // logo: the 10px difference equals title lineHeight (16) − track height (6).
    marginBottom: -5,
  },
  titleAccent: {
    fontFamily: FontFamily.black,
    color: Colors.accentBlue,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  percent: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.subtitle,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  status: {
    flexShrink: 1,
    marginLeft: 8,
    fontFamily: FontFamily.light,
    fontSize: FontSize.tiny,
    color: Colors.textMuted,
    textAlign: 'right',
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  statusError: {
    color: Colors.errorRed,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: Radius.progress,
    backgroundColor: Colors.importTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.progress,
    backgroundColor: Colors.accentBlue,
  },
  fillError: {
    backgroundColor: Colors.errorRed,
  },
});
