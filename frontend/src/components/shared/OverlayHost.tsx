import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useSegments } from 'expo-router';

import {
  SwipeBackScreen,
  type SwipeBackScreenHandle,
} from '@/src/components/shared/SwipeBackScreen';
import type { TabName } from '@/src/components/shared/TabBarUI';
import {
  useInternalOverlayNavigator,
  type OverlayEntry,
} from '@/src/context/OverlayNavigatorContext';
import UserProfileOverlay from '@/src/components/profile/UserProfileOverlay';
import FilmDetailScreen from '@/app/film/[tmdbId]';
import SeriesDetailScreen from '@/app/series/[tmdbId]';
import ReviewScreen from '@/app/review/[id]';

function renderOverlayContent(
  entry: OverlayEntry,
  onPressBack: () => void,
): React.ReactNode {
  switch (entry.name) {
    case 'user': {
      const userId = Number(entry.params.id);
      return <UserProfileOverlay userId={userId} onPressBack={onPressBack} />;
    }
    case 'film': {
      const tmdbId = Number(entry.params.id);
      return <FilmDetailScreen tmdbId={tmdbId} onPressBack={onPressBack} />;
    }
    case 'series': {
      const tmdbId = Number(entry.params.id);
      return <SeriesDetailScreen tmdbId={tmdbId} onPressBack={onPressBack} />;
    }
    case 'review': {
      const reviewId = Number(entry.params.id);
      return <ReviewScreen id={reviewId} onPressBack={onPressBack} />;
    }
    case 'person':
    case 'list':
      // Stubs for future detail screens.
      return null;
    default:
      return null;
  }
}

/**
 * Renders the overlay stack above the tab navigator. The floating tab
 * bar is owned by `<GlobalTabBar />` in the root layout — this host
 * only manages the slide animations and stack lifecycle.
 */
export default function OverlayHost(): React.JSX.Element | null {
  const {
    stack,
    _registerDismissHandler,
    _removeEntry,
    _removeAll,
    _registerTopTrigger,
    _pendingTargetTabRef,
  } = useInternalOverlayNavigator();

  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';

  if (stack.length === 0 || !isInTabs) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        return (
          <ActiveOverlay
            key={entry.id}
            entry={entry}
            isTop={isTop}
            registerDismiss={_registerDismissHandler}
            registerTopTrigger={_registerTopTrigger}
            onRemoveSelf={() => _removeEntry(entry.id)}
            onRemoveAll={_removeAll}
            pendingTargetTabRef={_pendingTargetTabRef}
          />
        );
      })}
    </View>
  );
}

interface ActiveOverlayProps {
  entry: OverlayEntry;
  isTop: boolean;
  registerDismiss: (
    id: string,
    handler: ((targetTab?: TabName) => void) | null,
  ) => void;
  registerTopTrigger: (
    trigger: ((mode: 'top' | 'all') => void) | null,
  ) => void;
  onRemoveSelf: () => void;
  onRemoveAll: () => void;
  pendingTargetTabRef: React.MutableRefObject<TabName | null>;
}

function ActiveOverlay({
  entry,
  isTop,
  registerDismiss,
  registerTopTrigger,
  onRemoveSelf,
  onRemoveAll,
  pendingTargetTabRef,
}: ActiveOverlayProps): React.JSX.Element {
  const swipeRef = useRef<SwipeBackScreenHandle>(null);
  const pendingModeRef = useRef<'top' | 'all'>('top');

  const handleAnimationDone = useCallback((): void => {
    const mode = pendingModeRef.current;
    pendingModeRef.current = 'top';
    if (mode === 'all') {
      const target = pendingTargetTabRef.current;
      pendingTargetTabRef.current = null;
      if (target) {
        router.replace(`/(tabs)/${target}` as never);
      }
      onRemoveAll();
    } else {
      onRemoveSelf();
    }
  }, [onRemoveAll, onRemoveSelf, pendingTargetTabRef]);

  const trigger = useCallback((mode: 'top' | 'all'): void => {
    pendingModeRef.current = mode;
    swipeRef.current?.triggerBack();
  }, []);

  useEffect(() => {
    registerDismiss(entry.id, () => trigger('top'));
    return () => {
      registerDismiss(entry.id, null);
    };
  }, [registerDismiss, entry.id, trigger]);

  useEffect(() => {
    if (!isTop) return;
    registerTopTrigger(trigger);
    return () => {
      registerTopTrigger(null);
    };
  }, [isTop, registerTopTrigger, trigger]);

  const handleBackPress = useCallback((): void => {
    trigger('top');
  }, [trigger]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <SwipeBackScreen
        ref={swipeRef}
        onNavigateBack={handleAnimationDone}
        animateIn
      >
        {renderOverlayContent(entry, handleBackPress)}
      </SwipeBackScreen>
    </View>
  );
}
