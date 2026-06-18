import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
  type ViewToken,
} from 'react-native';

import { ExpandedItem } from '@/src/components/lists/ExpandedItem';
import type { NormalizedListItem } from '@/src/types/lists.types';

/** Horizontal screen padding from Figma. */
const SCREEN_PADDING = 20;
/** Vertical gap between expanded cards, approximated from Figma frame spacing. */
const ITEM_GAP = 28;

interface ExpandedListProps {
  items: NormalizedListItem[];
  isRanked: boolean;
  onItemPress: (item: NormalizedListItem) => void;
  ListHeaderComponent?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Vertical feed of full-width expanded cards used when a list is in
 * "expanded" view mode. Owns the globally-shared mute state and tracks which
 * card is currently visible so only that one plays its trailer.
 */
export function ExpandedList({
  items,
  isRanked,
  onItemPress,
  ListHeaderComponent,
  contentContainerStyle,
}: ExpandedListProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const itemWidth = width - SCREEN_PADDING * 2;

  const [isMuted, setIsMuted] = useState(true);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  // Seed the first item as active on mount (and whenever the list changes
  // while nothing is active yet) so the top card autoplays without requiring
  // a scroll to trigger viewability.
  useEffect(() => {
    if (activeItemId == null && items.length > 0) {
      setActiveItemId(items[0]!.itemId);
    }
  }, [items, activeItemId]);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  // Stable refs required by FlatList for viewability tracking.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.item) {
        setActiveItemId((first.item as NormalizedListItem).itemId);
      }
    },
  ).current;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.itemId.toString()}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      ItemSeparatorComponent={() => <View style={{ height: ITEM_GAP }} />}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      renderItem={({ item }) => (
        <ExpandedItem
          item={item}
          width={itemWidth}
          active={item.itemId === activeItemId}
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          onPress={() => onItemPress(item)}
          isRanked={isRanked}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SCREEN_PADDING,
  },
});
