import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import {
  SwipeBackScreen,
  type SwipeBackScreenHandle,
} from '@/src/components/shared/SwipeBackScreen';
import TabBarUI, { TAB_NAMES, type TabName } from '@/src/components/shared/TabBarUI';
import {
  useInternalOverlayNavigator,
  type OverlayEntry,
} from '@/src/context/OverlayNavigatorContext';
import UserProfileOverlay from '@/src/components/profile/UserProfileOverlay';

function renderOverlayContent(
  entry: OverlayEntry,
  onPressBack: () => void,
): React.ReactNode {
  switch (entry.name) {
    case 'user': {
      const userId = Number(entry.params.id);
      return <UserProfileOverlay userId={userId} onPressBack={onPressBack} />;
    }
    case 'film':
    case 'series':
    case 'person':
    case 'list':
      // Stubs for future detail screens. 
      return null;
    default:
      return null;
  }
}

/**
 * Renders the currently presented overlay above the tab navigator and
 * supplies its own copy of the floating tab bar so the user can keep
 * navigating between tabs without first dismissing the detail screen.
 *
 * Press behaviour:
 * - Tap the originating tab → slide-out animation, no navigation.
 * - Tap any other tab → slide-out animation, then router.replace to that tab.
 * - Tap the back chevron or swipe from the left edge → slide-out animation,
 *   no navigation (the originating tab is already underneath).
 */
export default function OverlayHost(): React.JSX.Element | null {
  const { current, _registerDismissHandler, _removeCurrent } =
    useInternalOverlayNavigator();

  if (!current) return null;

  return (
    <ActiveOverlay
      key={current.id}
      entry={current}
      onAnimationDone={_removeCurrent}
      registerDismiss={_registerDismissHandler}
    />
  );
}

interface ActiveOverlayProps {
  entry: OverlayEntry;
  onAnimationDone: () => void;
  registerDismiss: (
    handler: ((targetTab?: TabName) => void) | null,
  ) => void;
}

function ActiveOverlay({
  entry,
  onAnimationDone,
  registerDismiss,
}: ActiveOverlayProps): React.JSX.Element {
  const swipeRef = useRef<SwipeBackScreenHandle>(null);
  const pendingTargetRef = useRef<TabName | null>(null);

  const handleAnimationDone = useCallback((): void => {
    const target = pendingTargetRef.current;
    if (target) {
      router.replace(`/(tabs)/${target}` as never);
    }
    onAnimationDone();
  }, [onAnimationDone]);

  useEffect(() => {
    registerDismiss((target) => {
      pendingTargetRef.current = target ?? null;
      swipeRef.current?.triggerBack();
    });
    return () => {
      registerDismiss(null);
    };
  }, [registerDismiss]);

  const handleBackPress = useCallback((): void => {
    swipeRef.current?.triggerBack();
  }, []);

  const handlePressTab = useCallback(
    (tab: TabName): void => {
      if (tab !== entry.originTab) {
        router.replace(`/(tabs)/${tab}` as never);
      }
      swipeRef.current?.triggerBack();
    },
    [entry.originTab],
  );

  const activeIndex = useMemo(
    () => TAB_NAMES.indexOf(entry.originTab),
    [entry.originTab],
  );

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <SwipeBackScreen
        ref={swipeRef}
        onNavigateBack={handleAnimationDone}
        animateIn
      >
        {renderOverlayContent(entry, handleBackPress)}
      </SwipeBackScreen>
      <TabBarUI activeIndex={activeIndex} onPressTab={handlePressTab} />
    </View>
  );
}
