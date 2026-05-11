import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import type { FilmWatchlistedByRow } from '@/src/types/film.types';

interface WantToWatchCarouselProps {
  rows: FilmWatchlistedByRow[];
  onPressUser: (userId: number) => void;
}

const MAX_AVATARS = 5;
const AVATAR_SIZE = 35;
const OVERLAP = 12;

export default function WantToWatchCarousel({
  rows,
  onPressUser,
}: WantToWatchCarouselProps): React.JSX.Element | null {
  if (rows.length === 0) return null;

  const visible = rows.slice(0, MAX_AVATARS);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WANT TO WATCH</Text>
      <View style={styles.stack}>
        {visible.map((row, idx) => (
          <Pressable
            key={row.user_id}
            onPress={() => onPressUser(row.user_id)}
            style={[styles.avatarWrap, { left: idx * (AVATAR_SIZE - OVERLAP) }]}
            hitSlop={4}
          >
            <UserAvatar
              avatarUrl={row.avatar_url}
              username={row.username}
              size={AVATAR_SIZE}
              borderWidth={1.5}
              borderColor={Colors.background}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    paddingLeft: 20,
  },
  title: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    marginBottom: 8,
  },
  stack: {
    height: AVATAR_SIZE,
    position: 'relative',
  },
  avatarWrap: {
    position: 'absolute',
    top: 0,
  },
});
