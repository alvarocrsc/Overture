import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeIcon from '@/src/components/icons/HomeIcon';
import DiscoverIcon from '@/src/components/icons/DiscoverIcon';
import LogIcon from '@/src/components/icons/LogIcon';
import StatsIcon from '@/src/components/icons/StatsIcon';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '@/src/lib/colors';

export type TabName = 'home' | 'discover' | 'log' | 'stats' | 'profile';

export const TAB_NAMES: ReadonlyArray<TabName> = [
  'home',
  'discover',
  'log',
  'stats',
  'profile',
];

const NUM_TABS = TAB_NAMES.length;
const TAB_SLOT_WIDTH = 60;
const INDICATOR_WIDTH = 70;
const INDICATOR_HEIGHT = 46;
const INDICATOR_TOP = (TAB_BAR_HEIGHT - INDICATOR_HEIGHT) / 2;
const INACTIVE_OPACITY = 0.45;
const ICON_ACTIVE_COLOR = Colors.white;
const ICON_INACTIVE_COLOR = `rgba(255,255,255,${INACTIVE_OPACITY})`;

function getIndicatorX(index: number, barWidth: number): number {
  const groupOffset = (barWidth - NUM_TABS * TAB_SLOT_WIDTH) / 2;
  return groupOffset + index * TAB_SLOT_WIDTH + (TAB_SLOT_WIDTH - INDICATOR_WIDTH) / 2;
}

export interface TabBarUIProps {
  /** Index (0–4) of the tab that should be highlighted. */
  activeIndex: number;
  /**
   * Called when a tab is pressed. Receives the target tab name and
   * whether the press was on the already-active tab (so callers can
   * distinguish "navigate" from "tap-current").
   */
  onPressTab: (tab: TabName, isActive: boolean) => void;
}

/**
 * Pure presentational tab bar. Knows nothing about React Navigation —
 * driven entirely by `activeIndex` and `onPressTab`. Used both by the
 * BottomTabBar wrapper (`TabBar.tsx`) and by the OverlayHost when a
 * detail screen is presented above the tab navigator.
 */
export default function TabBarUI({ activeIndex, onPressTab }: TabBarUIProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const barWidth = useSharedValue(320);
  const indicatorX = useSharedValue(getIndicatorX(activeIndex, 320));

  useEffect(() => {
    const target = getIndicatorX(activeIndex, barWidth.value);
    indicatorX.value = withSpring(target, { damping: 50, stiffness: 350 });
  }, [activeIndex, barWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  function renderIcon(index: number, isActive: boolean): React.ReactNode {
    const iconColor = isActive ? ICON_ACTIVE_COLOR : ICON_INACTIVE_COLOR;
    switch (index) {
      case 0:
        return <HomeIcon size={25} color={iconColor} />;
      case 1:
        return <DiscoverIcon size={20} color={iconColor} />;
      case 2:
        return <LogIcon size={25} color={Colors.white} />;
      case 3:
        return <StatsIcon size={25} color={iconColor} />;
      case 4:
        return (
          <UserAvatar
            avatarUrl={user?.avatar_url ?? null}
            username={user?.username ?? ''}
            size={32}
            borderColor={isActive ? Colors.accentBlue : 'rgba(255,255,255,0.3)'}
            borderWidth={2}
          />
        );
      default:
        return null;
    }
  }

  return (
    <View
      style={[styles.wrapper, { bottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET }]}
      pointerEvents="box-none"
    >
      <View
        style={styles.bar}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          barWidth.value = w;
          indicatorX.value = getIndicatorX(activeIndex, w);
        }}
      >
        <BlurView style={StyleSheet.absoluteFill} intensity={85} tint="dark" />
        <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {TAB_NAMES.map((name, index) => {
          const isFocused = activeIndex === index;
          return (
            <Pressable
              key={name}
              onPress={() => onPressTab(name, isFocused)}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={name}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {renderIcon(index, isFocused)}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 35,
    right: 35,
    height: TAB_BAR_HEIGHT,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 50,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: INDICATOR_TOP,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: 25,
    backgroundColor: 'rgba(126,126,126,0.19)',
  },
  tabItem: {
    width: TAB_SLOT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
});
