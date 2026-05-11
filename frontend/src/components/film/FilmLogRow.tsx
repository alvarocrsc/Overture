import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '@/src/components/home/StarRating';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

interface FilmLogRowProps {
  /** Total number of logs the current user has for this title. */
  logCount: number;
  /** Most recent rating value (0–5, half steps). */
  latestRating: number | null;
  /** Current user avatar URL. */
  avatarUrl: string | null;
  /** Current user username (used for the avatar fallback color). */
  username: string;
  /** Whether this row is for a film or a series, used for the label copy. */
  kind?: 'film' | 'series';
  /** Tap handler for the three-dots options menu. */
  onPressMore: () => void;
}

function countWord(n: number): string {
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${countToText(n)} times`;
}

function countToText(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return n < words.length ? words[n]! : String(n);
}

export default function FilmLogRow({
  logCount,
  latestRating,
  avatarUrl,
  username,
  kind = 'film',
  onPressMore,
}: FilmLogRowProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <UserAvatar avatarUrl={avatarUrl} username={username} size={25} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {`You have logged this ${kind} ${countWord(logCount)}`}
      </Text>
      <View style={styles.right}>
        {latestRating != null ? (
          <StarRating rating={latestRating} size={10} color={Colors.white} />
        ) : null}
        <Pressable
          onPress={onPressMore}
          hitSlop={10}
          style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={14} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    marginHorizontal: 20,
    height: 40,
    backgroundColor: '#292929',
    borderRadius: 7,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 25,
    height: 25,
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreBtn: {
    padding: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
