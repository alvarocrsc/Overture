import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard } from 'react-native';
import { useSegments } from 'expo-router';

import type { TabName } from '@/src/components/shared/TabBarUI';

/**
 * Names of detail screens that can be presented as overlays on top of the
 * tab navigator. Add new entries here AND register a renderer in
 * `OverlayRegistry.tsx` to support a new detail screen.
 */
export type OverlayName =
  | 'user'
  | 'film'
  | 'series'
  | 'person'
  | 'list';

export type OverlayParams = Record<string, string | number>;

export interface OverlayEntry {
  id: string;
  name: OverlayName;
  params: OverlayParams;
  /** Tab the user was on when the overlay was presented. */
  originTab: TabName;
}

interface OverlayNavigatorValue {
  /** Currently presented overlay, or null when none is active. */
  current: OverlayEntry | null;
  /**
   * Push a new detail overlay above the current tab. The originating tab
   * is captured automatically from the router segments and used to
   * highlight the correct icon while the overlay is open.
   */
  present: (name: OverlayName, params: OverlayParams) => void;
  /**
   * Dismiss the current overlay. If `targetTab` is provided and differs
   * from the originating tab, navigates to that tab once the slide-out
   * animation completes.
   */
  dismiss: (targetTab?: TabName) => void;
}

interface InternalOverlayValue extends OverlayNavigatorValue {
  /** Called by the host to register its imperative dismiss handler. */
  _registerDismissHandler: (
    handler: ((targetTab?: TabName) => void) | null,
  ) => void;
  /** Called by the host once the slide-out animation has completed. */
  _removeCurrent: () => void;
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
  const [current, setCurrent] = useState<OverlayEntry | null>(null);
  const dismissHandlerRef = useRef<((target?: TabName) => void) | null>(null);
  const idCounterRef = useRef(0);
  const segments = useSegments();

  const present = useCallback(
    (name: OverlayName, params: OverlayParams): void => {
      // Dismiss any open keyboard before presenting — prevents the keyboard
      // from persisting across navigation (e.g. from the log search screen).
      Keyboard.dismiss();
      // segments looks like ['(tabs)', 'log'] when the user is on the log tab.
      const tabSegment = (segments[1] as string | undefined) ?? 'home';
      const originTab = TAB_SEGMENT_TO_NAME[tabSegment] ?? 'home';
      idCounterRef.current += 1;
      setCurrent({
        id: `overlay-${idCounterRef.current}`,
        name,
        params,
        originTab,
      });
    },
    [segments],
  );

  const dismiss = useCallback((targetTab?: TabName): void => {
    dismissHandlerRef.current?.(targetTab);
  }, []);

  const _registerDismissHandler = useCallback(
    (handler: ((targetTab?: TabName) => void) | null): void => {
      dismissHandlerRef.current = handler;
    },
    [],
  );

  const _removeCurrent = useCallback((): void => {
    dismissHandlerRef.current = null;
    setCurrent(null);
  }, []);

  const value = useMemo<InternalOverlayValue>(
    () => ({
      current,
      present,
      dismiss,
      _registerDismissHandler,
      _removeCurrent,
    }),
    [current, present, dismiss, _registerDismissHandler, _removeCurrent],
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
