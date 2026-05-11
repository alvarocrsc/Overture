import { useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { backdropUrl } from '@/src/lib/tmdb';
import { Colors } from '@/src/lib/colors';

interface BackdropCarouselProps {
  paths: string[];
  selectedPaths: string[];
  onTogglePath: (path: string) => void;
  /** Max number of paths that can be selected. Used to disable adds. */
  maxSelected?: number;
}

const ITEM_HEIGHT = 210;
const ITEM_GAP = 12;
const SIDE_PADDING = 20;
const CARD_RADIUS = 10;

const screenWidth = Dimensions.get('window').width;
const ITEM_WIDTH = screenWidth - SIDE_PADDING * 2 - 30;

export function BackdropCarousel({
  paths,
  selectedPaths,
  onTogglePath,
  maxSelected = 10,
}: BackdropCarouselProps): React.JSX.Element {
  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => {
      const selectedIndex = selectedPaths.indexOf(item);
      const isSelected = selectedIndex !== -1;
      const atCap = !isSelected && selectedPaths.length >= maxSelected;
      const uri = backdropUrl(item, 'w1280');

      return (
        <Pressable
          onPress={() => {
            if (atCap) return;
            onTogglePath(item);
          }}
          style={({ pressed }) => [
            styles.card,
            pressed && !atCap && styles.cardPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isSelected
              ? `Deselect backdrop ${selectedIndex + 1}`
              : 'Select backdrop'
          }
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imageFallback} />
          )}
          <View style={styles.dotWrap}>
            <SelectionDot selected={isSelected} />
          </View>
        </Pressable>
      );
    },
    [onTogglePath, selectedPaths, maxSelected],
  );

  return (
    <FlatList
      horizontal
      data={paths}
      keyExtractor={(p) => p}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      snapToInterval={ITEM_WIDTH + ITEM_GAP}
      decelerationRate="fast"
      ItemSeparatorComponent={() => <View style={{ width: ITEM_GAP }} />}
    />
  );
}

interface SelectionDotProps {
  selected: boolean;
}

function SelectionDot({ selected }: SelectionDotProps): React.JSX.Element {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle
        cx={7}
        cy={7}
        r={6}
        stroke={Colors.white}
        strokeWidth={1.5}
        fill={selected ? Colors.accentBlue : 'rgba(0,0,0,0.35)'}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SIDE_PADDING,
  },
  card: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#1b1b1b',
  },
  cardPressed: {
    opacity: 0.85,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1b1b1b',
  },
  dotWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
