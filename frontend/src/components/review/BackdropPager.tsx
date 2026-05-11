import { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import type {
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Colors } from '@/src/lib/colors';

interface BackdropPagerProps {
  urls: string[];
  height?: number;
}

const screenWidth = Dimensions.get('window').width;
const DEFAULT_HEIGHT = 256;

export function BackdropPager({
  urls,
  height = DEFAULT_HEIGHT,
}: BackdropPagerProps): React.JSX.Element {
  const [index, setIndex] = useState<number>(0);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => (
      <View style={[styles.page, { width: screenWidth, height }]}>
        <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
      </View>
    ),
    [height],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const next = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (next !== index) setIndex(next);
  };

  return (
    <View style={{ height }}>
      <FlatList
        horizontal
        pagingEnabled
        data={urls}
        keyExtractor={(u, i) => `${i}-${u}`}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      {urls.length > 1 ? (
        <View style={styles.dots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.white,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
