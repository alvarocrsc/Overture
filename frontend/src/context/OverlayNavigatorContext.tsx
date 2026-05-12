import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard } from 'react-native';
import { useSegments } from 'expo-router';

import type { TabName } from '@/src/components/shared/TabBarUI';

export type OverlayName =
  | 'user'
  | 'film'
  | 'series'
  | 'review'
  | 'person'
  | 'list';

export type OverlayParams = Record<string, string | number>;

export interface OverlayEntry {
  id: string;
  name: OverlayName;
  params: OverlayParams;
  originTab: TabName;
}

interface OverlayNavigatorValue {
  stack: OverlayEntry[];
  current: OverlayEntry | null;
  present: (name: OverlayName, params: OverlayParams) => void;
  dismiss: (targetTab?: TabName) => void;
  dismissTop: () => void;
  clearAll: () => void;
  lastTab: TabName;
  dismissAll: (targetTab?: TabName) => void;
}

interface InternalOverlayValue extends OverlayNavigatorValue {
  _registerDismissHandler: (
    id: string,
    handler: ((targetTab?: TabName) => void) | null,
  ) => void;
  _removeEntry: (id: string) => void;
  _removeAll: () => void;
  _registerTopTrigger: (
    trigger: ((mode: 'top' | 'all') => void) | null,
  ) => void;
  _pendingTargetTabRef: React.MutableRefObject<TabName | null>;
}

const OverlayContext = createContext<InternalOverlayValue | null>(null);

const TAB_SEGMENT_TO_NAME: Record<string, TabName> = {
  home: 'home',
  discover: 'discover',
  log: 'log',
  stats: 'stats',
  profile: 'profile',
};

interface OverlayNavigatorProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for the global overlay-based detail-screen navigator.
 * Wraps the entire app at the root layout level. The overlay stack is
 * rendered by `<OverlayHost />`, which must be a sibling of the main
 * router stack.
 */
export function OverlayNavigatorProvider({
  children,
}: OverlayNavigatorProviderProps): React.JSX.Element {
  const [stack, setStack] = useState<OverlayEntry[]>([]);
  const [lastTab, setLastTab] = useState<TabName>('home');
  const dismissHandlersRef = useRef<
    Map<string, (target?: TabName) => void>
  >(new Map());
  const topTriggerRef = useRef<((mode: 'top' | 'all') => void) | null>(null);
  const pendingTargetTabRef = useRef<TabName | null>(null);
  const idCounterRef = useRef(0);
  const segments = useSegments();

  useEffect(() => {
    if (segments[0] === '(tabs)') {
      const tabSegment = segments[1] as string | undefined;
      const tab = tabSegment ? TAB_SEGMENT_TO_NAME[tabSegment] : undefined;
      if (tab) setLastTab(tab);
    }
  }, [segments]);

  const present = useCallback(
    (name: OverlayName, params: OverlayParams): void => {
      Keyboard.dismiss();
      const tabSegment = (segments[1] as string | undefined) ?? 'home';
      const originTab = TAB_SEGMENT_TO_NAME[tabSegment] ?? 'home';
      idCounterRef.current += 1;
      const entry: OverlayEntry = {
        id: `overlay-${idCounterRef.current}`,
        name,
        params,
        originTab,
      };
      setStack((prev) => [...prev, entry]);
    },
    [segments],
  );

  const dismiss = useCallback((targetTab?: TabName): void => {
    const top = dismissHandlersRef.current;
    const handlers = Array.from(top.values());
    const topHandler = handlers[handlers.length - 1];
    if (topHandler) {
      topHandler(targetTab);
    }
  }, []);

  const dismissTop = useCallback((): void => {
    const handlers = Array.from(dismissHandlersRef.current.values());
    const topHandler = handlers[handlers.length - 1];
    if (topHandler) {
      topHandler();
    }
  }, []);

  const dismissAll = useCallback((targetTab?: TabName): void => {
    if (!topTriggerRef.current) return;
    pendingTargetTabRef.current = targetTab ?? null;
    topTriggerRef.current('all');
  }, []);

  const _registerTopTrigger = useCallback(
    (trigger: ((mode: 'top' | 'all') => void) | null): void => {
      topTriggerRef.current = trigger;
    },
    [],
  );

  const _registerDismissHandler = useCallback(
    (
      id: string,
      handler: ((targetTab?: TabName) => void) | null,
    ): void => {
      if (handler == null) {
        dismissHandlersRef.current.delete(id);
      } else {
        dismissHandlersRef.current.set(id, handler);
      }
    },
    [],
  );

  const _removeEntry = useCallback((id: string): void => {
    dismissHandlersRef.current.delete(id);
    setStack((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const _removeAll = useCallback((): void => {
    dismissHandlersRef.current.clear();
    setStack([]);
  }, []);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  const clearAll = _removeAll;

  const value = useMemo<InternalOverlayValue>(
    () => ({
      stack,
      current,
      present,
      dismiss,
      dismissTop,
      dismissAll,
      clearAll,
      lastTab,
      _registerDismissHandler,
      _removeEntry,
      _removeAll,
      _registerTopTrigger,
      _pendingTargetTabRef: pendingTargetTabRef,
    }),
    [
      stack,
      current,
      present,
      dismiss,
      dismissTop,
      dismissAll,
      clearAll,
      lastTab,
      _registerDismissHandler,
      _removeEntry,
      _removeAll,
      _registerTopTrigger,
    ],
  );

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  );
}

/**
 * Hook used by screens and components to present and dismiss overlays.
 * Throws when called outside `<OverlayNavigatorProvider>`.
 */
export function useOverlayNavigator(): OverlayNavigatorValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error(
      'useOverlayNavigator must be used inside <OverlayNavigatorProvider>',
    );
  }
  return ctx;
}

/**
 * Internal hook used only by `<OverlayHost />`. Exposes the registration
 * and removal callbacks alongside the public API.
 */
export function useInternalOverlayNavigator(): InternalOverlayValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error(
      'useInternalOverlayNavigator must be used inside <OverlayNavigatorProvider>',
    );
  }
  return ctx;
}
