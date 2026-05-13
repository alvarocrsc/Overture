import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import StarRating from './StarRating';
import { UserAvatar } from '@/src/components/shared/UserAvatar';

interface Props {
  /** TMDB poster file path (e.g. "/abc123.jpg"). */
  posterPath: string | null;
  /** Film title. */
  filmTitle: string;
  /** Username to display below the poster. */
  username: string;
  /** Internal user id of the friend — used for profile navigation. */
  userId: number;
  /** Avatar image URL for the friend. */
  avatarUrl: string | null;
  /** Rating the friend gave (0–5 in 0.5 increments). */
  rating: number;
  /** Review id, if the friend wrote a review for this log. */
  reviewId?: number | null;
  onPress?: () => void;
  /** Tap on the small avatar — typically navigates to the friend's profile. */
  onAvatarPress?: () => void;
}

/**
 * Card in the Friends' Activity carousel showing a poster the friend
 * recently watched, their avatar, username, and star rating.
 */
export default function FriendActivityCard({
  posterPath,
  filmTitle,
  username,
  userId,
  avatarUrl,
  rating,
  reviewId,
  onPress,
  onAvatarPress,
}: Props) {
  const uri = posterUrl(posterPath, 'w500');

  return (
    <Pressable style={styles.card} onPress={onPress} onPressIn={() => {}}>
      {/* Poster */}
      <View style={styles.posterWrapper}>
        <Image
          source={uri ? { uri } : undefined}
          style={styles.poster}
          contentFit="cover"
          placeholder={Colors.cardBackground}
        />
      </View>

      {/* Avatar + username row */}
      <View style={styles.meta}>
        <Pressable
          onPress={onAvatarPress}
          hitSlop={6}
          style={styles.avatarSlot}
        >
          <UserAvatar avatarUrl={avatarUrl} username={username} size={AVATAR_SIZE} />
        </Pressable>
        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
          <View style={styles.ratingRow}>
            <StarRating rating={rating} size={9} />
            {reviewId != null ? (
              <Ionicons
                name="reader-outline"
                size={9}
                color={Colors.white}
                style={styles.reviewIcon}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const POSTER_WIDTH = 90;
const POSTER_HEIGHT = 135;
const AVATAR_SIZE = 24;
const CARD_GAP = 6;

const styles = StyleSheet.create({
  card: {
    width: POSTER_WIDTH,
    marginRight: CARD_GAP,
  },
  posterWrapper: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  avatarSlot: {
    marginRight: 5,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewIcon: {
    marginTop: 1,
  },
  username: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: -1,
  },
});
