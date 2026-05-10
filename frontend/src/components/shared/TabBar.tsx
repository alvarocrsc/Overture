import React, { useCallback } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import TabBarUI, { TAB_NAMES, type TabName } from '@/src/components/shared/TabBarUI';

/**
 * Adapter that wires `TabBarUI` to React Navigation's bottom-tab navigator.
 *
 * The presentational logic (icons, indicator, layout) lives in TabBarUI so
 * that the OverlayHost can render the same bar in a controlled mode while
 * a detail screen is presented above the tabs.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const activeIndex = state.index < TAB_NAMES.length ? state.index : 0;

  const handlePressTab = useCallback(
    (tab: TabName, isActive: boolean): void => {
      const targetIndex = TAB_NAMES.indexOf(tab);
      const route = state.routes[targetIndex];
      if (!route) return;

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isActive && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [navigation, state.routes],
  );

  return <TabBarUI activeIndex={activeIndex} onPressTab={handlePressTab} />;
}
