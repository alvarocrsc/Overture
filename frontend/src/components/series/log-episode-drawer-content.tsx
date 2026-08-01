import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { ReviewBodyModal } from '@/src/components/log/ReviewBodyModal';
import { DateSeenSheet } from '@/src/components/log/DateSeenSheet';
import {
  formatRatingValue,
  getRatingTier,
  RATING_EMPTY_COLOR,
} from '@/src/utils/episode-rating-color.utils';
import type { CreateEpisodeRatingPayload } from '@/src/types/episode-ratings.types';

/** Episodes are scored on a 0-10 scale, in 0.1 steps. */
const MIN_RATING = 0;
const MAX_RATING = 10;
const RATING_STEP = 0.1;

const TRACK_HEIGHT = 10;

interface LogEpisodeDrawerContentProps {
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string | null;
  /** Pre-fills the rating when re-logging an already-rated episode. */
  initialValue?: number | null;
  isSaving: boolean;
  onSave: (
    payload: Omit<CreateEpisodeRatingPayload, 'tmdb_series_id'>,
  ) => void;
}

/**
 * Body of the "log an episode" step inside `BottomDrawer`.
 *
 * The rating widget is new rather than reused: episodes use a 0.0-10.0 decimal
 * scale, structurally different from the 0.5-5.0 star picker films and series
 * share. The review editor and date sheet ARE reused from the film log flow.
 *
 * TODO(episode-log-design): the rating widget has no Figma frame yet — this is
 * a scrub track with steppers. Revisit once the design lands.
 */
export default function LogEpisodeDrawerContent({
  seasonNumber,
  episodeNumber,
  episodeName,
  initialValue = null,
  isSaving,
  onSave,
}: LogEpisodeDrawerContentProps): React.JSX.Element {
  const [value, setValue] = useState<number | null>(initialValue);
  const [watchedOn, setWatchedOn] = useState<Date>(new Date());
  const [reviewBody, setReviewBody] = useState<string>('');
  const [containsSpoilers, setContainsSpoilers] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [showDate, setShowDate] = useState<boolean>(false);

  const tier = getRatingTier(value);

  const handleSave = (): void => {
    const trimmed = reviewBody.trim();
    onSave({
      season_number: seasonNumber,
      episode_number: episodeNumber,
      value,
      watched_on: toIsoDate(watchedOn),
      // A review needs a rating to hang off, so it is only sent alongside one.
      review:
        trimmed.length > 0 && value !== null
          ? { body: trimmed, contains_spoilers: containsSpoilers }
          : null,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.episodeLabel} numberOfLines={1}>
        {`S${seasonNumber} · E${episodeNumber}`}
        {episodeName ? <Text style={styles.episodeName}>{`  ${episodeName}`}</Text> : null}
      </Text>

      <RatingScrubber value={value} onChange={setValue} />

      <View style={styles.valueRow}>
        <Pressable
          onPress={() => setValue((v) => stepRating(v, -RATING_STEP))}
          hitSlop={10}
          style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Decrease rating"
        >
          <Ionicons name="remove" size={18} color={Colors.white} />
        </Pressable>

        <Text
          style={[styles.value, { color: tier?.color ?? Colors.textMuted }]}
        >
          {value === null ? '—' : formatRatingValue(value)}
        </Text>

        <Pressable
          onPress={() => setValue((v) => stepRating(v, RATING_STEP))}
          hitSlop={10}
          style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Increase rating"
        >
          <Ionicons name="add" size={18} color={Colors.white} />
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {value === null ? 'Saving without a rating marks it watched' : ' '}
      </Text>

      <View style={styles.separator} />

      <Pressable
        onPress={() => setShowDate(true)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Change date seen"
      >
        <Ionicons name="calendar-outline" size={16} color={Colors.white} />
        <Text style={styles.rowLabel}>Date seen</Text>
        <Text style={styles.rowValue}>{formatWatchedOn(watchedOn)}</Text>
      </Pressable>

      <View style={styles.separator} />

      <Pressable
        onPress={() => setShowReview(true)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Write or edit review"
      >
        <Ionicons name="create-outline" size={16} color={Colors.white} />
        <Text style={styles.rowLabel}>Review</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {reviewBody.trim().length > 0 ? reviewBody.trim() : 'Optional'}
        </Text>
      </Pressable>

      {reviewBody.trim().length > 0 ? (
        <>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="eye-off-outline" size={16} color={Colors.white} />
            <Text style={styles.rowLabel}>Contains spoilers</Text>
            <Switch
              value={containsSpoilers}
              onValueChange={setContainsSpoilers}
              trackColor={{ false: '#2e2e2e', true: Colors.accentBlue }}
              thumbColor={Colors.white}
              ios_backgroundColor="#2e2e2e"
            />
          </View>
        </>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Save episode log"
      >
        {isSaving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.saveLabel}>Save</Text>
        )}
      </Pressable>

      <ReviewBodyModal
        visible={showReview}
        initialValue={reviewBody}
        onSave={(next) => {
          setReviewBody(next);
          setShowReview(false);
        }}
        onClose={() => setShowReview(false)}
      />

      <DateSeenSheet
        visible={showDate}
        value={watchedOn}
        onChange={setWatchedOn}
        onClose={() => setShowDate(false)}
      />
    </View>
  );
}

interface RatingScrubberProps {
  value: number | null;
  onChange: (value: number) => void;
}

/**
 * Drag-to-scrub 0-10 track. Reports in 0.1 steps, and colours the fill with the
 * same heatmap scale the grid uses so the number and the colour always agree.
 */
function RatingScrubber({ value, onChange }: RatingScrubberProps): React.JSX.Element {
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const ratio = useSharedValue(value === null ? 0 : value / MAX_RATING);

  ratio.value = withTiming(value === null ? 0 : value / MAX_RATING, {
    duration: 120,
  });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${ratio.value * 100}%`,
  }));

  const scrub = (x: number): void => {
    if (trackWidth <= 0) return;
    const clamped = Math.max(0, Math.min(x / trackWidth, 1));
    const raw = clamped * MAX_RATING;
    const snapped = Math.round(raw / RATING_STEP) * RATING_STEP;
    onChange(Number(snapped.toFixed(1)));
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      runOnJS(scrub)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(scrub)(event.x);
    });

  const tier = getRatingTier(value);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.trackFill,
            fillStyle,
            { backgroundColor: tier?.color ?? Colors.accentBlue },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

/** Nudges a rating by one step, treating "unrated" as starting from 0. */
function stepRating(current: number | null, delta: number): number {
  const next = (current ?? 0) + delta;
  const clamped = Math.max(MIN_RATING, Math.min(next, MAX_RATING));
  return Number(clamped.toFixed(1));
}

/** Formats a Date as the YYYY-MM-DD the API expects, in local time. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Human-readable date for the "Date seen" row. */
function formatWatchedOn(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  episodeLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
  episodeName: {
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: RATING_EMPTY_COLOR,
    overflow: 'hidden',
    marginTop: 20,
  },
  trackFill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 14,
  },
  stepper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FontFamily.black,
    fontSize: 34,
    letterSpacing: LetterSpacing.tight,
    minWidth: 88,
    textAlign: 'center',
  },
  hint: {
    fontFamily: FontFamily.light,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2e2e2e',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  rowLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  rowValue: {
    flex: 1,
    fontFamily: FontFamily.light,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'right',
  },
  saveButton: {
    height: 44,
    borderRadius: 25,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.background,
    letterSpacing: LetterSpacing.tight,
  },
  pressed: {
    opacity: 0.7,
  },
});
