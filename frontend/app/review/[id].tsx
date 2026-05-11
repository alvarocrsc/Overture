import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
} from '@/src/lib/colors';
import { timeAgo } from '@/src/lib/timeAgo';
import { backdropUrl } from '@/src/lib/tmdb';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';

interface ReviewBackdrop {
  url: string;
  position: number;
}

interface ReviewDetail {
  id: number;
  rating_id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  value: number;
  body: string;
  contains_spoilers: boolean;
  liked_title: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  watched_on: string | null;
  is_rewatch: boolean;
  is_liked: boolean;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  film_backdrop_path: string | null;
  film_year: string | null;
  film_director: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_backdrop_path: string | null;
  series_year: string | null;
  series_creator: string | null;
  backdrops: ReviewBackdrop[];
}

interface ReviewComment extends CommentRowData {
  parent_id: number | null;
  replies: ReviewComment[];
}

interface SingleResponse<T> {
  data: T;
}

interface DataListResponse<T> {
  data: T;
}

/**
 * Posted review screen.
 *
 * Header: paginated backdrop carousel + back/more chrome.
 * Body: title/info, author rating row, body text, action bar (like / comments
 * count / share), then nested Comments section.
 * Sticky bottom: "Add a comment" input, accounting for tab bar inset.
 */
export default function ReviewScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewIdNum = Number(id);
  const reviewId = Number.isFinite(reviewIdNum) ? reviewIdNum : null;

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const overlay = useOverlayNavigator();

  const inputRef = useRef<TextInput>(null);
  const [commentDraft, setCommentDraft] = useState<string>('');

  const reviewQ = useQuery<ReviewDetail>({
    queryKey: ['review', reviewId],
    enabled: reviewId != null,
    queryFn: async () => {
      const res = await api.get<SingleResponse<ReviewDetail>>(
        `/reviews/${reviewId}`,
      );
      return res.data.data;
    },
  });

  const commentsQ = useQuery<ReviewComment[]>({
    queryKey: ['review-comments', reviewId],
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
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
    },
  });

  // Post a comment.
  const postCommentMut = useMutation({
    mutationFn: async (body: string) => {
      await api.post(`/reviews/${reviewId}/comments`, { body });
    },
    onSuccess: () => {
      setCommentDraft('');
      inputRef.current?.blur();
      queryClient.invalidateQueries({
        queryKey: ['review-comments', reviewId],
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
        queryKey: ['review-comments', reviewId],
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

  if (reviewId == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid review id.</Text>
      </View>
    );
  }

  if (reviewQ.isLoading || !reviewQ.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (reviewQ.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load review.</Text>
      </View>
    );
  }

  const review = reviewQ.data;
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

  const handlePressTitle = (): void => {
    if (tmdbId == null) return;
    const pathname: Href = isFilm
      ? `/film/${tmdbId}`
      : `/series/${tmdbId}`;
    router.push(pathname);
  };

  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={-25}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {/* Header backdrop carousel */}
          {backdropUrls.length > 0 ? (
            <BackdropPager urls={backdropUrls} />
          ) : defaultBackdropUrl != null ? (
            <BackdropPager urls={[defaultBackdropUrl]} />
          ) : (
            <View style={styles.noBackdrop} />
          )}

          {/* Top chrome (back / more) over the backdrop */}
          <View style={[styles.topChrome, { top: insets.top + 16 }]}>
            <Pressable
              onPress={() => router.back()}
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
              onPress={() => {
                Alert.alert('More options', undefined, [
                  {
                    text: title ? `Go to ${title}` : 'Go to title',
                    onPress: handlePressTitle,
                  },
                  { text: 'Share', onPress: () => undefined },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
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
                  {review.value.toFixed(1)}
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
                  onPressUser={(userId) => overlay.present('user', { id: userId })}
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
                    onPressUser={(userId) => overlay.present('user', { id: userId })}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {/* Sticky comment input */}
        <View
          style={[styles.inputBar, { paddingBottom: bottomInset }]}
        >
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
