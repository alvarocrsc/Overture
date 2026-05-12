import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useSegments } from 'expo-router';

import TabBarUI, { TAB_NAMES, type TabName } from '@/src/components/shared/TabBarUI';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';

const TAB_SEGMENT_TO_NAME: Record<string, TabName> = {
  home: 'home',
  discover: 'discover',
  log: 'log',
  stats: 'stats',
  profile: 'profile',
};

/**
 * Single floating tab bar mounted at the root layout above the Stack
 * navigator and overlay host. Persists across every screen so the bar
 * itself never animates with route transitions — only the active pill
 * slides between tabs.
 */
export default function GlobalTabBar(): React.JSX.Element | null {
  const segments = useSegments();
  const { stack, lastTab, dismissAll } = useOverlayNavigator();

  const [pressedTab, setPressedTab] = useState<TabName | null>(null);

  const segmentTab = useMemo<TabName | null>(() => {
    if (segments[0] !== '(tabs)') return null;
    const seg = segments[1] as string | undefined;
    return seg ? TAB_SEGMENT_TO_NAME[seg] ?? null : null;
  }, [segments]);

  const topEntry = stack.length > 0 ? stack[stack.length - 1] : null;

  const resolvedTab: TabName =
    pressedTab ?? topEntry?.originTab ?? segmentTab ?? lastTab;

  const activeIndex = TAB_NAMES.indexOf(resolvedTab);

  useEffect(() => {
    if (pressedTab && segmentTab === pressedTab && stack.length === 0) {
      setPressedTab(null);
    }
  }, [pressedTab, segmentTab, stack.length]);

  const handlePressTab = useCallback(
    (tab: TabName): void => {
      setPressedTab(tab);
      if (stack.length > 0) {
        dismissAll(tab !== topEntry?.originTab ? tab : undefined);
        return;
      }
      if (tab !== segmentTab) {
        router.replace(`/(tabs)/${tab}` as never);
      }
    },
    [stack.length, dismissAll, topEntry?.originTab, segmentTab],
  );

  if (segments[0] === '(auth)') return null;

  return <TabBarUI activeIndex={activeIndex} onPressTab={handlePressTab} />;
}
