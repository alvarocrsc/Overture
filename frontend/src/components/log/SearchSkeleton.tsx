import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { FilterType } from './FilterPills';

const SKELETON_BG = '#1a1a1a';

/**
 * Skeleton row for film/series/trending items. 
 */
function MediaSkeleton() {
  return (
    <View style={styles.mediaRow}>
      <View style={styles.poster} />
      <View style={styles.textStack}>
        <View style={[styles.line, styles.titleLine]} />
        <View style={[styles.line, styles.metaLine]} />
        <View style={[styles.line, styles.subLine]} />
      </View>
    </View>
  );
}

/**
 * Skeleton row for cast & crew or members.
 */
function PersonSkeleton() {
  return (
    <View style={styles.personRow}>
      <View style={styles.avatar} />
      <View style={styles.textStack}>
        <View style={[styles.line, styles.titleLine]} />
        <View style={[styles.line, styles.metaLine]} />
      </View>
    </View>
  );
}

/**
 * Skeleton row for user-curated lists.
 */
function ListSkeleton() {
  return (
    <View style={styles.listRow}>
      <View style={styles.collage} />
      <View style={styles.textStack}>
        <View style={[styles.line, styles.titleLine]} />
        <View style={[styles.line, styles.metaLine]} />
        <View style={[styles.line, styles.subLine]} />
      </View>
    </View>
  );
}

interface Props {
  filter: FilterType;
  count?: number;
}

export default function SearchSkeleton({ filter, count = 5 }: Props) {
  const Variant =
    filter === 'cast' || filter === 'members'
      ? PersonSkeleton
      : filter === 'lists'
        ? ListSkeleton
        : MediaSkeleton;

  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <Variant key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  mediaRow: {
    height: 75,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: 3,
    backgroundColor: SKELETON_BG,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 100,
    backgroundColor: SKELETON_BG,
  },
  collage: {
    width: 50,
    height: 42,
    borderRadius: 3,
    backgroundColor: SKELETON_BG,
  },
  textStack: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  line: {
    height: 10,
    borderRadius: 4,
    backgroundColor: SKELETON_BG,
  },
  titleLine: {
    width: '70%',
  },
  metaLine: {
    width: '45%',
    marginTop: 8,
    height: 8,
  },
  subLine: {
    width: '35%',
    marginTop: 6,
    height: 8,
  },
});
