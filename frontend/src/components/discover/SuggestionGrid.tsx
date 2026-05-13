import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CARD_GAP, SCREEN_PADDING_H } from '@/src/lib/layout';
import ActorFavoritesCard from './ActorFavoritesCard';
import SeenTheseCard from './SeenTheseCard';
import WatchNowCard from './WatchNowCard';
import WeeklyDiscoveryCard from './WeeklyDiscoveryCard';

interface Props {
  posterPaths: Array<string | null>;
}

interface CardConfig {
  id: 'watch-now' | 'weekly' | 'actors' | 'seen-these';
  title: string;
  backgroundColor: string;
  titleColor?: string;
}

const SUGGESTION_CARDS: CardConfig[] = [
  { id: 'watch-now', title: 'What should I\nwatch right now?', backgroundColor: '#e24b4a' },
  { id: 'weekly', title: 'Weekly\ndiscovery', backgroundColor: '#1a77da' },
  { id: 'actors', title: "Your favorite\nactors' movies", backgroundColor: '#1d9e75' },
  { id: 'seen-these', title: "You've seen\nthese...", backgroundColor: '#e7cc5f', titleColor: '#000000' },
];

export default function SuggestionGrid({ posterPaths }: Props) {
  // TODO: route to a dedicated recommendation detail screen per card id
  // once the recommendation feature ships. For now all cards stay on Discover.
  function handlePress(_id: CardConfig['id']) {
    router.push('/(tabs)/discover');
  }

  const chunkSize = Math.max(1, Math.ceil(posterPaths.length / 4));
  const chunks: Array<Array<string | null>> = [
    posterPaths.slice(0, chunkSize),
    posterPaths.slice(chunkSize, chunkSize * 2),
    posterPaths.slice(chunkSize * 2, chunkSize * 3),
    posterPaths.slice(chunkSize * 3),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <WatchNowCard onPress={() => handlePress(SUGGESTION_CARDS[0]!.id)} />
        </View>
        <View style={styles.cell}>
          <WeeklyDiscoveryCard onPress={() => handlePress(SUGGESTION_CARDS[1]!.id)} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <ActorFavoritesCard onPress={() => handlePress(SUGGESTION_CARDS[2]!.id)} />
        </View>
        <View style={styles.cell}>
          <SeenTheseCard onPress={() => handlePress(SUGGESTION_CARDS[3]!.id)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_PADDING_H,
    gap: CARD_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  cell: {
    flex: 1,
  },
});
