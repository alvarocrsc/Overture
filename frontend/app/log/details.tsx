import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/src/components/auth/BackButton';
import { BackdropCarousel } from '@/src/components/log/BackdropCarousel';
import { DateSeenSheet } from '@/src/components/log/DateSeenSheet';
import { ReviewBodyModal } from '@/src/components/log/ReviewBodyModal';
import { FullStarIcon } from '@/src/components/icons/FullStarIcon';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { useLog } from '@/src/context/LogContext';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/lib/api';
import {
  Colors,
  FontFamily,
  LetterSpacing,
  Radius,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '@/src/lib/colors';
import { formatWatchedOn, toIsoDate } from '@/src/lib/dateFormat';

interface CreateRatingPayload {
  tmdb_id: number;
  media_type: 'film' | 'series';
  value: number;
  watched_on: string;
  is_rewatch: boolean;
  review?: {
    body: string;
    contains_spoilers: boolean;
    backdrop_paths: string[];
  };
}

interface CreateRatingResponse {
  data: {
    rating_id: number;
    review_id: number | null;
    is_rewatch: boolean;
  };
}

/**
 * Review Screen 2: full log details. Lets the user pick header backdrops,
 * confirm/edit rating, set watched-on date, optionally write a review, then
 * submit. On success either navigates to the posted-review screen or back
 * to the film/series detail.
 */
export default function LogDetailsScreen(): React.JSX.Element {
  const log = useLog();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [showDate, setShowDate] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);

  const subtitle = [log.year, log.director].filter(Boolean).join('  ·  ');

  const adjustRating = (delta: number): void => {
    const next = Math.max(0.5, Math.min(5, log.rating + delta));
    log.setRating(next);
  };

  const logMutation = useMutation<
    CreateRatingResponse['data'],
    Error,
    void
  >({
    mutationFn: async () => {
      const payload: CreateRatingPayload = {
        tmdb_id: log.tmdbId,
        media_type: log.mediaType,
        value: log.rating,
        watched_on: toIsoDate(log.watchedOn),
        is_rewatch: log.isRewatch,
      };
      const trimmed = log.reviewBody.trim();
      if (trimmed.length > 0) {
        payload.review = {
          body: trimmed,
          contains_spoilers: false,
          backdrop_paths: log.selectedBackdropPaths,
        };
      }
      const res = await api.post<CreateRatingResponse>('/ratings', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      // Invalidate queries that reflect the user's logged state for this title.
      const queryKey =
        log.mediaType === 'film'
          ? ['film', log.tmdbId]
          : ['series', log.tmdbId];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'membership'] });
      queryClient.invalidateQueries({ queryKey: ['logged', 'membership'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
      queryClient.invalidateQueries({ queryKey: ['rating-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['friends-activity'] });
      queryClient.invalidateQueries({ queryKey: ['divides'] });

      log.reset();
      if (data.review_id != null) {
        router.replace({
          pathname: '/review/[id]',
          params: { id: String(data.review_id) },
        });
      } else {
        // Pop both /log/details and /log/rating off the stack.
        router.back();
        router.back();
      }
    },
    onError: (err) => {
      Alert.alert('Could not log', err.message);
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.backRow, { top: insets.top + 16 }]}>
        <BackButton />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Backdrop selection carousel */}
        {log.availableBackdrops.length > 0 ? (
          <View style={styles.carouselWrap}>
            <BackdropCarousel
              paths={log.availableBackdrops}
              selectedPaths={log.selectedBackdropPaths}
              onTogglePath={log.toggleBackdrop}
            />
            <Text style={styles.counter}>
              {log.selectedBackdropPaths.length}/10
            </Text>
          </View>
        ) : null}

        {/* Title block */}
        <View style={styles.titleBlock}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title} numberOfLines={2}>
            {log.title}
          </Text>
        </View>

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <View style={styles.ratingLeft}>
            <UserAvatar
              avatarUrl={user?.avatar_url ?? null}
              username={user?.username ?? ''}
              size={36}
            />
            <View style={styles.ratingTextCol}>
              <Text style={styles.username}>{user?.username ?? ''}</Text>
              <View style={styles.ratingValueRow}>
                <Text style={styles.ratingValue}>
                  {log.rating.toFixed(1)}
                </Text>
                <FullStarIcon size={14} color={Colors.accentBlue} />
              </View>
            </View>
          </View>
          <View style={styles.arrowPill}>
            <Pressable
              onPress={() => adjustRating(-0.5)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.arrowBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Lower rating"
            >
              <Ionicons name="arrow-down" size={18} color={Colors.white} />
            </Pressable>
            <View style={styles.arrowDivider} />
            <Pressable
              onPress={() => adjustRating(0.5)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.arrowBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Raise rating"
            >
              <Ionicons name="arrow-up" size={18} color={Colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Date seen row */}
        <Pressable
          onPress={() => setShowDate(true)}
          style={({ pressed }) => [
            styles.dateRow,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Change date seen"
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.white} />
          <Text style={styles.dateLabel}>Date seen</Text>
          <View style={styles.dateRight}>
            <Text style={styles.dateValue}>
              {formatWatchedOn(log.watchedOn)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={Colors.textMuted}
            />
          </View>
        </Pressable>

        <View style={styles.separator} />

        {/* Rewatch toggle row */}
        <Pressable
          onPress={() => log.setIsRewatch(!log.isRewatch)}
          style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}
          accessibilityRole="switch"
          accessibilityState={{ checked: log.isRewatch }}
          accessibilityLabel="Mark as rewatch"
        >
          <Ionicons name="repeat" size={16} color={Colors.white} />
          <Text style={styles.dateLabel}>Rewatch</Text>
          <Switch
            value={log.isRewatch}
            onValueChange={log.setIsRewatch}
            trackColor={{ false: '#2e2e2e', true: Colors.accentBlue }}
            thumbColor={Colors.white}
            ios_backgroundColor="#2e2e2e"
          />
        </Pressable>

        <View style={styles.separator} />

        {/* Review body row */}
        <Pressable
          onPress={() => setShowReview(true)}
          style={({ pressed }) => [
            styles.reviewRow,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Write or edit review"
        >
          {log.reviewBody.trim().length > 0 ? (
            <Text style={styles.reviewBody} numberOfLines={6}>
              {log.reviewBody}
            </Text>
          ) : (
            <Text style={styles.reviewPlaceholder}>Write your review...</Text>
          )}
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16 }]}>
        <Pressable
          onPress={() => logMutation.mutate()}
          disabled={logMutation.isPending}
          style={({ pressed }) => [
            styles.logButton,
            pressed && styles.buttonPressed,
            logMutation.isPending && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Log film"
        >
          <Text style={styles.logButtonText}>
            {logMutation.isPending
              ? 'Logging...'
              : log.mediaType === 'series'
                ? 'Log series'
                : 'Log film'}
          </Text>
        </Pressable>
      </View>

      <DateSeenSheet
        visible={showDate}
        value={log.watchedOn}
        onChange={log.setWatchedOn}
        onClose={() => setShowDate(false)}
      />

      <ReviewBodyModal
        visible={showReview}
        initialValue={log.reviewBody}
        onSave={(next) => {
          log.setReviewBody(next);
          setShowReview(false);
        }}
        onClose={() => setShowReview(false)}
      />
    </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  carouselWrap: {
    marginTop: 16,
    marginBottom: 16,
  },
  counter: {
    position: 'absolute',
    right: 28,
    bottom: 10,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    letterSpacing: LetterSpacing.tight,
  },
  titleBlock: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginBottom: 4,
    includeFontPadding: false,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  ratingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingTextCol: {
    justifyContent: 'center',
  },
  username: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
    marginBottom: 2,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  arrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    width: 98,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    backgroundColor: '#1b1b1b',
  },
  arrowBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDivider: {
    width: StyleSheet.hairlineWidth,
    height: '60%',
    backgroundColor: '#3a3a3a',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2e2e2e',
    marginHorizontal: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  dateLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  dateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateValue: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  reviewRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 80,
  },
  reviewPlaceholder: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  reviewBody: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 20,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: 34,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  logButton: {
    height: 43,
    backgroundColor: Colors.white,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logButtonText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.buttonText,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
});
