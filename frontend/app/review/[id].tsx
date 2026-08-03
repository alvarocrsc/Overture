import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
  type Href,
} from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PinnedHeaderScrollView from '@/src/components/shared/PinnedHeaderScrollView';
import { BackdropPager } from '@/src/components/review/BackdropPager';
import {
  CommentRow,
  type CommentRowData,
} from '@/src/components/review/CommentRow';
import { FullStarIcon } from '@/src/components/icons/FullStarIcon';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/lib/api';
import {
  Colors,
  FontFamily,
  LetterSpacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '@/src/lib/colors';
import { timeAgo } from '@/src/lib/timeAgo';
import { backdropUrl } from '@/src/lib/tmdb';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';
import { useRatingFormat } from '@/src/hooks/use-rating-format';
import {
  logEntryKeys,
  useDeleteLogEntry,
  useLogEntry,
} from '@/src/hooks/use-log-entry';
import { formatRating } from '@/src/utils/rating-format.utils';
import type { LogEntrySource } from '@/src/types/review.types';

interface ReviewComment extends CommentRowData {
  parent_id: number | null;
  replies: ReviewComment[];
}

interface DataListResponse<T> {
  data: T;
}

/**
 * Posted review screen, also used for a rating logged without a review.
 *
 * Header: paginated backdrop carousel + back/more chrome.
 * Body: title/info, author rating row, body text, action bar (like / comments
 * count / share), then nested Comments section.
 * Sticky bottom: "Add a comment" input, accounting for tab bar inset.
 *
 * Everything below the rating row hangs off the review, so a bare rating shows
 * only the title and the score — there is nothing to like or comment on.
 */
interface ReviewScreenProps {
  /** When provided, used instead of the route's `useLocalSearchParams`. */
  id?: number;
  /** What `id` addresses. Defaults to a review. */
  source?: LogEntrySource;
  /** When provided, overrides `router.back()` for the back chevron. */
  onPressBack?: () => void;
}

export default function ReviewScreen(
  { id: idProp, source: sourceProp, onPressBack }: ReviewScreenProps = {},
): React.JSX.Element {
  const { id: idParam, source: sourceParam } = useLocalSearchParams<{
    id: string;
    source?: string;
  }>();
  const paramIdNum = Number(idParam);
  const paramId = Number.isFinite(paramIdNum) ? paramIdNum : null;
  const entryId = idProp ?? paramId;
  const source: LogEntrySource =
    sourceProp ?? (sourceParam === 'rating' ? 'rating' : 'review');

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const overlay = useOverlayNavigator();

  // Both formats are read up front: which one applies depends on the review's
  // media type, which is only known after the query resolves — below the point
  // where hooks may still be called.
  const filmRatingFormat = useRatingFormat('film');
  const seriesRatingFormat = useRatingFormat('series');

  const inputRef = useRef<TextInput>(null);
  const [commentDraft, setCommentDraft] = useState<string>('');

  const entryQ = useLogEntry(entryId, source);

  // The review's own id, which is absent when only a rating was logged. Every
  // review-scoped request below keys off this rather than the route param.
  const reviewId = entryQ.data?.id ?? null;

  const commentsQ = useQuery<ReviewComment[]>({
    queryKey: logEntryKeys.comments(reviewId ?? -1),
    enabled: reviewId != null,
    queryFn: async () => {
      const res = await api.get<DataListResponse<ReviewComment[]>>(
        `/reviews/${reviewId}/comments`,
      );
      return res.data.data;
    },
  });

  // Like / unlike the review itself.
  const likeReviewMut = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await api.delete(`/reviews/${reviewId}/like`);
      } else {
        await api.post(`/reviews/${reviewId}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: logEntryKeys.entry(source, entryId ?? -1),
      });
    },
  });

  const deleteMut = useDeleteLogEntry();

  // Post a comment.
  const postCommentMut = useMutation({
    mutationFn: async (body: string) => {
      await api.post(`/reviews/${reviewId}/comments`, { body });
    },
    onSuccess: () => {
      setCommentDraft('');
      inputRef.current?.blur();
      queryClient.invalidateQueries({
        queryKey: logEntryKeys.comments(reviewId ?? -1),
      });
    },
    onError: (e: Error) => Alert.alert('Could not post comment', e.message),
  });

  // Like / unlike a comment.
  const likeCommentMut = useMutation({
    mutationFn: async ({
      commentId,
      currentlyLiked,
    }: {
      commentId: number;
      currentlyLiked: boolean;
    }) => {
      if (currentlyLiked) {
        await api.delete(`/reviews/${reviewId}/comments/${commentId}/like`);
      } else {
        await api.post(`/reviews/${reviewId}/comments/${commentId}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: logEntryKeys.comments(reviewId ?? -1),
      });
    },
  });

  const handleReplyTo = useCallback(
    (_commentId: number, username: string | null) => {
      if (username) {
        setCommentDraft((prev) => {
          const mention = `@${username} `;
          if (prev.startsWith(mention)) return prev;
          return mention + prev;
        });
        inputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    },
    [],
  );

  const handleSubmitComment = (): void => {
    const trimmed = commentDraft.trim();
    if (trimmed.length === 0 || postCommentMut.isPending) return;
    postCommentMut.mutate(trimmed);
  };

  const closeScreen = onPressBack ?? ((): void => router.back());

  if (entryId == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid review id.</Text>
      </View>
    );
  }

  if (entryQ.isLoading || !entryQ.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (entryQ.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load review.</Text>
      </View>
    );
  }

  const review = entryQ.data;
  const isFilm = review.film_tmdb_id != null;
  const title = isFilm ? review.film_title : review.series_title;
  const subYear = isFilm ? review.film_year : review.series_year;
  const subPerson = isFilm ? review.film_director : review.series_creator;
  const subtitle = [subYear, subPerson].filter(Boolean).join('  ·  ');
  const tmdbId = isFilm ? review.film_tmdb_id : review.series_tmdb_id;

  const backdropUrls = review.backdrops.map((b) => b.url);
  const defaultBackdropPath = isFilm ? review.film_backdrop_path : review.series_backdrop_path;
  const defaultBackdropUrl = backdropUrl(defaultBackdropPath, 'w1280');
  const comments = commentsQ.data ?? [];

  // A rating with no review has nothing to like, comment on or read.
  const hasReview = review.id != null;
  const isOwnEntry = user != null && user.id === review.user_id;

  const handlePressTitle = (): void => {
    if (tmdbId == null) return;
    const pathname: Href = isFilm
      ? `/film/${tmdbId}`
      : `/series/${tmdbId}`;
    router.push(pathname);
  };

  const handleDelete = (): void => {
    if (tmdbId == null) return;
    deleteMut.mutate(
      {
        ratingId: review.rating_id,
        mediaType: isFilm ? 'film' : 'series',
        tmdbId,
      },
      {
        onSuccess: closeScreen,
        onError: (e: Error) => Alert.alert('Could not delete', e.message),
      },
    );
  };

  const confirmDelete = (): void => {
    Alert.alert(
      hasReview ? 'Delete review?' : 'Delete rating?',
      hasReview
        ? 'Your rating of this title is deleted along with the review. This cannot be undone.'
        : 'Your rating of this title is deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  };

  const handlePressMore = (): void => {
    // Android caps Alert at three buttons and silently drops the rest, so on
    // your own entry the delete action takes the slot the Share stub had —
    // a fourth would cost the Cancel button on a non-cancelable dialog.
    const secondary = isOwnEntry
      ? {
          text: hasReview ? 'Delete review' : 'Delete rating',
          style: 'destructive' as const,
          onPress: confirmDelete,
        }
      : { text: 'Share', onPress: (): void => undefined };

    Alert.alert('More options', undefined, [
      {
        text: title ? `Go to ${title}` : 'Go to title',
        onPress: handlePressTitle,
      },
      secondary,
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const bottomInset =
    Math.max(insets.bottom, 8) + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 8;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={-25}
      >
        <PinnedHeaderScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          header={
            <>
              {/* Header backdrop carousel */}
              {backdropUrls.length > 0 ? (
                <BackdropPager urls={backdropUrls} />
              ) : defaultBackdropUrl != null ? (
                <BackdropPager urls={[defaultBackdropUrl]} />
              ) : (
                // Tall enough to contain the absolutely-positioned top chrome:
                // the header is an overlay now, and iOS does not deliver touches
                // to subviews drawn outside their parent's bounds.
                <View style={[styles.noBackdrop, { height: insets.top + 60 }]} />
              )}

              {/* Top chrome (back / more) over the backdrop */}
              <View style={[styles.topChrome, { top: insets.top + 16 }]}>
                <Pressable
                  onPress={closeScreen}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={Colors.white}
                  />
                </Pressable>
                <Pressable
                  onPress={handlePressMore}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
                    color={Colors.white}
                  />
                </Pressable>
              </View>
            </>
          }
        >
          {/* Title block */}
          <View style={styles.titleBlock}>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}
            <Pressable
              onPress={handlePressTitle}
              accessibilityRole="button"
              accessibilityLabel={`Open ${title ?? 'title'}`}
            >
              <Text style={styles.titleText} numberOfLines={2}>
                {title}
              </Text>
            </Pressable>
          </View>

          {/* Author rating row */}
          <Pressable
            style={({ pressed }) => [styles.authorRow, pressed && styles.pressed]}
            onPress={() => overlay.present('user', { id: review.user_id })}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`View ${review.username}'s profile`}
          >
            <UserAvatar
              avatarUrl={review.avatar_url}
              username={review.username}
              size={36}
            />
            <View style={styles.authorCol}>
              <Text style={styles.username}>{review.username}</Text>
              <View style={styles.ratingLine}>
                <Text style={styles.ratingValue}>
                  {formatRating(
                    review.value,
                    isFilm ? filmRatingFormat : seriesRatingFormat,
                  )}
                </Text>
                <FullStarIcon size={14} color={Colors.accentBlue} />
                <Text style={styles.meta}>
                  ·  {timeAgo(review.created_at)}
                  {review.is_rewatch ? ' · rewatch' : ''}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Body */}
          {review.body ? (
            <View style={styles.bodyWrap}>
              <Text style={styles.bodyText}>{review.body}</Text>
            </View>
          ) : null}

          {/* Likes and comments belong to the review, so a bare rating ends
              at the score above. */}
          {hasReview ? (
            <>
              {/* Action bar */}
              <View style={styles.actionsBar}>
                <Pressable
                  onPress={() => likeReviewMut.mutate(review.is_liked)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    review.is_liked ? 'Unlike review' : 'Like review'
                  }
                >
                  <Ionicons
                    name={review.is_liked ? 'heart' : 'heart-outline'}
                    size={18}
                    color={
                      review.is_liked ? Colors.accentBlue : Colors.textMuted
                    }
                  />
                  <Text style={styles.actionCount}>{review.likes_count}</Text>
                </Pressable>
                <View style={styles.actionBtn}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={17}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.actionCount}>{comments.length}</Text>
                </View>
                <View style={styles.spacer} />
                <Pressable
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Share review"
                  onPress={() => undefined}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.separator} />

              {/* Comments section */}
              <Text style={styles.commentsHeader}>Comments</Text>
              {commentsQ.isLoading ? (
                <ActivityIndicator
                  color={Colors.white}
                  style={styles.commentsLoader}
                />
              ) : comments.length === 0 ? (
                <Text style={styles.noComments}>Be the first to comment.</Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id}>
                    <CommentRow
                      comment={c}
                      onPressLike={(commentId, currentlyLiked) =>
                        likeCommentMut.mutate({ commentId, currentlyLiked })
                      }
                      onPressReply={handleReplyTo}
                      onPressUser={(userId) =>
                        overlay.present('user', { id: userId })
                      }
                    />
                    {c.replies.map((r) => (
                      <CommentRow
                        key={r.id}
                        comment={r}
                        isReply
                        onPressLike={(commentId, currentlyLiked) =>
                          likeCommentMut.mutate({ commentId, currentlyLiked })
                        }
                        onPressReply={handleReplyTo}
                        onPressUser={(userId) =>
                          overlay.present('user', { id: userId })
                        }
                      />
                    ))}
                  </View>
                ))
              )}
            </>
          ) : null}
        </PinnedHeaderScrollView>

        {/* Sticky comment input */}
        {hasReview ? (
          <View style={[styles.inputBar, { paddingBottom: bottomInset }]}>
            <UserAvatar
              avatarUrl={user?.avatar_url ?? null}
              username={user?.username ?? ''}
              size={36}
            />
            <TextInput
              ref={inputRef}
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textMuted}
              multiline
              style={styles.input}
              selectionColor={Colors.accentBlue}
            />
            {commentDraft.trim().length > 0 ? (
              <Pressable
                onPress={handleSubmitComment}
                disabled={postCommentMut.isPending}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.sendBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send comment"
              >
                <Ionicons name="send" size={18} color={Colors.accentBlue} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.white,
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  noBackdrop: {
    height: 60,
    backgroundColor: Colors.background,
  },
  topChrome: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 4,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pressed: {
    opacity: 0.7,
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginBottom: 4,
    includeFontPadding: false,
  },
  titleText: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  authorRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  authorCol: {
    flex: 1,
  },
  username: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
    marginBottom: 2,
  },
  ratingLine: {
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
  meta: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  bodyWrap: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  bodyText: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 20,
    includeFontPadding: false,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  spacer: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2e2e2e',
    marginHorizontal: 20,
  },
  commentsHeader: {
    fontFamily: FontFamily.black,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    includeFontPadding: false,
  },
  commentsLoader: {
    marginTop: 16,
  },
  noComments: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 12,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    minHeight: 43,
    maxHeight: 120,
    backgroundColor: '#1b1b1b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  sendBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
