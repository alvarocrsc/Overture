import React from 'react';
import { StyleSheet, View } from 'react-native';
import MostWatchedPodium from './MostWatchedPodium';
import type { MostWatchedData } from '@/src/types/stats.types';

interface Props {
  data: MostWatchedData;
}

/**
 * Stacks the directors podium above the actors podium.
 */
export default function MostWatched({ data }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <MostWatchedPodium items={data.directors} label="DIRECTORS" />
      <View style={styles.spacer} />
      <MostWatchedPodium items={data.actors} label="ACTORS" mirror />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  spacer: {
    height: 32,
  },
});
