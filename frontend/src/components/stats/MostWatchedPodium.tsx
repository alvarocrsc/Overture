import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';
import DotGrid from './DotGrid';
import type { MostWatchedPerson } from '@/src/types/stats.types';

interface Props {
  /** Up to 3 entries; index 0 = #1, index 1 = #2, index 2 = #3. */
  items: MostWatchedPerson[];
  label: 'DIRECTORS' | 'ACTORS';
  /**
   * When true (used for actors), the bar content is laid out bottom-up:
   * name + count at the top, avatar in the middle, rank at the bottom.
   * The section title also moves to the bottom-left.
   */
  mirror?: boolean;
}

const CONTAINER_W = 390;
const CONTAINER_H = 180;

const BAR_WIDTH = 70;
const AVATAR_SIZE = 50;

const DOT_ROWS = 11;
const DOT_SPACING = 17;

interface SlotLayout {
  rank: 1 | 2 | 3 | 4 | 5;
  left: number;
  top: number;
  height: number;
  avatarTop: number;
}

const DIRECTOR_LAYOUT: SlotLayout[] = [
  { rank: 4, left: 10, top: 87, height: 92, avatarTop: 0 },
  { rank: 2, left: 85, top: 22, height: 156, avatarTop: 54 },
  { rank: 1, left: 160, top: 5, height: 173, avatarTop: 72 },
  { rank: 3, left: 235, top: 43, height: 135, avatarTop: 34 },
  { rank: 5, left: 310, top: 114, height: 64, avatarTop: 0 },
];

const ACTOR_LAYOUT: SlotLayout[] = [
  { rank: 4, left: 10, top: 0, height: 46, avatarTop: 0 },
  { rank: 3, left: 85, top: 0, height: 142, avatarTop: 52 },
  { rank: 1, left: 160, top: 0, height: 173, avatarTop: 52 },
  { rank: 2, left: 235, top: 0, height: 156, avatarTop: 52 },
  { rank: 5, left: 310, top: 0, height: 120, avatarTop: 0 },
];

interface BarProps {
  layout: SlotLayout;
  person: MostWatchedPerson | undefined;
  mirror: boolean;
}

function Bar({ layout, person, mirror }: BarProps): React.JSX.Element {
  const isPlaceholder = layout.rank === 4 || layout.rank === 5;

  if (isPlaceholder) {
    return (
      <View
        style={[
          styles.bar,
          mirror && styles.barMirror,
          { left: layout.left, top: layout.top, height: layout.height },
        ]}
      />
    );
  }

  const profileUri = person?.profile_path
    ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
    : null;

  return (
    <View
      style={[
        styles.bar,
        styles.barFilled,
        mirror && styles.barMirror,
        {
          left: layout.left,
          top: layout.top,
          height: layout.height,
        },
      ]}
    >
      {/* Rank — top in directors, bottom (dangling end) in actors. */}
      <Text style={[styles.rank, mirror ? styles.rankBottom : styles.rankTop]}>
        #{layout.rank}
      </Text>

      {/* Avatar */}
      <View style={[styles.avatar, { top: layout.avatarTop }]}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.avatarImage} />
        ) : null}
      </View>

      {/* Name + count — bottom in directors, top (ceiling end) in actors. */}
      <View
        style={[
          styles.textBlock,
          mirror ? styles.textBlockTop : styles.textBlockBottom,
        ]}
      >
        <Text style={styles.name} numberOfLines={2}>
          {person?.person_name ?? ''}
        </Text>
        <Text style={styles.count}>{person?.film_count ?? 0} FILMS</Text>
      </View>
    </View>
  );
}

export default function MostWatchedPodium({
  items,
  label,
  mirror = false,
}: Props): React.JSX.Element {
  const layout = mirror ? ACTOR_LAYOUT : DIRECTOR_LAYOUT;
  const personByRank: Record<number, MostWatchedPerson | undefined> = {
    1: items[0],
    2: items[1],
    3: items[2],
  };

  return (
    <View style={styles.container}>
      {/* Background dotted lines */}
      <DotGrid
        width={CONTAINER_W}
        height={CONTAINER_H}
        rows={DOT_ROWS}
        spacing={DOT_SPACING}
      />

      {/* Podium bars */}
      {layout.map((slot) => (
        <Bar
          key={slot.rank}
          layout={slot}
          person={personByRank[slot.rank]}
          mirror={mirror}
        />
      ))}

      {/* Section title — top-right for directors, bottom-right for actors. */}
      <View
        style={[
          styles.titleBlock,
          mirror ? styles.titleBottomLeft : styles.titleTopRight,
        ]}
      >
        <Text style={[styles.titleSmall, mirror ? styles.titleLeftAlign : styles.titleRightAlign]}>Your top</Text>
        <Text style={[styles.titleLarge, mirror ? styles.titleLeftAlign : styles.titleRightAlign]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_W,
    height: CONTAINER_H,
    alignSelf: 'center',
  },
  bar: {
    position: 'absolute',
    width: BAR_WIDTH,
    backgroundColor: '#292929',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barMirror: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  barFilled: {
    overflow: 'hidden',
  },
  rank: {
    position: 'absolute',
    width: BAR_WIDTH,
    textAlign: 'center',
    fontFamily: FontFamily.black,
    fontSize: 16,
    color: Colors.accentBlue,
    letterSpacing: -1,
  },
  rankTop: {
    top: 8,
  },
  rankBottom: {
    bottom: 8,
  },
  avatar: {
    position: 'absolute',
    left: 10,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    position: 'absolute',
    left: 0,
    width: BAR_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  textBlockTop: {
    top: 10,
  },
  textBlockBottom: {
    bottom: 8,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.accentBlue,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 12,
  },
  count: {
    marginTop: 0,
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleBlock: {
    position: 'absolute',
  },
  titleTopRight: {
    top: 0,
    right: 18,
  },
  titleBottomLeft: {
    bottom: 0,
    left: 18,
  },
  titleSmall: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  titleRightAlign: {
    textAlign: 'right',
  },
  titleLeftAlign: {
    textAlign: 'left',
  },
});
