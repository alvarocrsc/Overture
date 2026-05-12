import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontFamily } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import { FullStarIcon } from '@/src/components/icons/FullStarIcon';
import { UserAvatar } from '@/src/components/shared/UserAvatar';

interface Props {
  /** TMDB poster file path for the film. */
  posterPath: string | null;
  /** Film title. */
  title: string;
  /** Fraction of friends who rated it negatively (0–1). */
  negativePercent: number;
  /** Fraction of friends who rated it positively (0–1). */
  positivePercent: number;
  /** Lowest rating given by a friend. */
  worstRating: number;
  /** Highest rating given by a friend. */
  bestRating: number;
  /** Avatar URL of the friend who rated it worst. */
  worstAvatarUrl: string | null;
  /** Avatar URL of the friend who rated it best. */
  bestAvatarUrl: string | null;
  /** Username of the friend who rated it worst. */
  worstUsername: string;
  /** Username of the friend who rated it best. */
  bestUsername: string;
  /** Number of friends who watched it. */
  friendCount: number;
  /** Difference between best and worst rating (spread). */
  ratingSpread: number;
  onSeeDebate?: () => void;
}

const CARD_HEIGHT = 169;
const POSTER_WIDTH = 114;
const BAR_WIDTH = 110;
const AVATAR_SIZE = 18;

/**
 * Divides card showing a film that has divided friends' opinions.
 * Displays the poster, a split rating bar, friend avatars, and a CTA.
 * When `collapsed` is true only the poster is shown (used in carousel peek state).
 */
export default function DividesCard({
  posterPath,
  title,
  negativePercent,
  positivePercent,
  worstRating,
  bestRating,
  worstAvatarUrl,
  bestAvatarUrl,
  worstUsername,
  bestUsername,
  friendCount,
  ratingSpread,
  onSeeDebate,
}: Props) {
  const uri = posterUrl(posterPath, 'w185');
  const badWidth = Math.round(BAR_WIDTH * negativePercent);
  const goodWidth = Math.round(BAR_WIDTH * positivePercent);

  return (
    <View style={styles.card}>
      {/* Left: poster */}
      <View style={styles.posterSection}>
        <Image
          source={uri ? { uri } : undefined}
          style={styles.poster}
          contentFit="cover"
          placeholder="#222"
          transition={0}
          recyclingKey={posterPath ?? title}
          cachePolicy="memory-disk"
        />
      </View>

      {/* Right: content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Opinion bar */}
        <View style={styles.barTrack}>
          <View style={[styles.barBad, { width: badWidth }]} />
          <View style={[styles.barGood, { width: goodWidth }]} />
        </View>

        {/* Rater extremes row */}
        <View style={styles.ratersRow}>
          {/* Worst rater */}
          <View style={styles.raterGroup}>
            <UserAvatar avatarUrl={worstAvatarUrl} username={worstUsername} size={AVATAR_SIZE} />
            <FullStarIcon size={12} color={Colors.dividesBad} />
            <Text style={styles.ratingBad}>{worstRating.toFixed(1)}</Text>
          </View>

          {/* Best rater */}
          <View style={styles.raterGroup}>
            <FullStarIcon size={12} color={Colors.dividesGood} />
            <Text style={styles.ratingGood}>{bestRating.toFixed(1)}</Text>
            <UserAvatar avatarUrl={bestAvatarUrl} username={bestUsername} size={AVATAR_SIZE} />
          </View>
        </View>

        {/* Stats line — centered */}
        <View style={styles.statRow}>
          <Text style={styles.statNormal}>{friendCount} friends · </Text>
          <FullStarIcon size={11} color={Colors.accentBlue} />
          <Text style={styles.statAccent}> {ratingSpread.toFixed(1)} apart</Text>
        </View>

        {/* See the debate button */}
        <Pressable style={styles.debateButton} onPress={onSeeDebate}>
          <Text style={styles.debateText}>See the debate</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  posterSection: {
    width: POSTER_WIDTH,
    height: CARD_HEIGHT,
  },
  poster: {
    width: POSTER_WIDTH,
    height: CARD_HEIGHT,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: POSTER_WIDTH,
    width: 250 - POSTER_WIDTH,
    height: CARD_HEIGHT,
    paddingLeft: 11,
    paddingRight: 8,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  barTrack: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: 'rgba(60,60,60,0.8)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barBad: {
    height: 4,
    backgroundColor: Colors.dividesBad,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  barGood: {
    height: 4,
    backgroundColor: Colors.dividesGood,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    marginLeft: 'auto',
  },
  ratersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  raterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingBad: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.dividesBad,
  },
  ratingGood: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.dividesGood,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  statNormal: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  statAccent: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.accentBlue,
  },
  debateButton: {
    borderRadius: 25,
    borderWidth: 0.3,
    borderColor: '#a8a8a8',
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  debateText: {
    fontFamily: FontFamily.light,
    fontSize: 10,
    color: Colors.white,
  },
});
