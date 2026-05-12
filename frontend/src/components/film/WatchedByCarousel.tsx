import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '@/src/components/home/StarRating';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';
import type { FilmWatchedByRow } from '@/src/types/film.types';

interface WatchedByCarouselProps {
  rows: FilmWatchedByRow[];
  onPressUser: (userId: number) => void;
}

export default function WatchedByCarousel({
  rows,
  onPressUser,
}: WatchedByCarouselProps): React.JSX.Element | null {
  const overlay = useOverlayNavigator();
  if (rows.length === 0) return null;

  const handlePress = (row: FilmWatchedByRow): void => {
    if (row.review_id != null) {
      overlay.present('review', { id: row.review_id });
      return;
    }
    onPressUser(row.user_id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WATCHED BY</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {rows.map((row, idx) => (
          <React.Fragment key={row.user_id}>
            <Pressable
              onPress={() => handlePress(row)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <UserAvatar
                avatarUrl={row.avatar_url}
                username={row.username}
                size={35}
              />
              <View style={styles.itemMeta}>
                <Text style={styles.username} numberOfLines={1}>
                  {row.username}
                </Text>
                <View style={styles.starsRow}>
                  {row.rating != null ? (
                    <StarRating rating={row.rating} size={9} color={Colors.white} />
                  ) : null}
                  {row.has_review ? (
                    <Ionicons
                      name="reader-outline"
                      size={9}
                      color={Colors.white}
                      style={styles.reviewIcon}
                    />
                  ) : null}
                </View>
              </View>
            </Pressable>
            {idx < rows.length - 1 ? <View style={styles.divider} /> : null}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingLeft: 20,
  },
  title: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    marginBottom: 8,
  },
  scrollContent: {
    paddingRight: 20,
    alignItems: 'center',
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  itemMeta: {
    justifyContent: 'center',
    gap: 2,
  },
  username: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    maxWidth: 100,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewIcon: {
    opacity: 0.85,
  },
  divider: {
    width: 1,
    height: 35,
    backgroundColor: '#3a3a3a',
    marginHorizontal: 4,
  },
});
