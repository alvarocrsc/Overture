import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import HomeIcon from '@/src/components/icons/HomeIcon';
import DiscoverIcon from '@/src/components/icons/DiscoverIcon';
import LogIcon from '@/src/components/icons/LogIcon';
import StatsIcon from '@/src/components/icons/StatsIcon';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '@/src/lib/colors';

const NUM_TABS = 5;
const TAB_SLOT_WIDTH = 60; 
const INDICATOR_WIDTH = 70;
const INDICATOR_HEIGHT = 46;

function getIndicatorX(index: number, barWidth: number): number {
  const groupOffset = (barWidth - NUM_TABS * TAB_SLOT_WIDTH) / 2;
  return groupOffset + index * TAB_SLOT_WIDTH + (TAB_SLOT_WIDTH - INDICATOR_WIDTH) / 2;
}

const INDICATOR_TOP = (TAB_BAR_HEIGHT - INDICATOR_HEIGHT) / 2;
const INACTIVE_OPACITY = 0.45;

const ICON_ACTIVE_COLOR = Colors.white;
const ICON_INACTIVE_COLOR = `rgba(255,255,255,${INACTIVE_OPACITY})`;

/**
 * Floating frosted-glass tab bar rendered at the bottom of every authenticated screen.
 * Uses Reanimated's withSpring to animate the active indicator pill between tabs.
 */
export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const barWidth = useSharedValue(320);
  const indicatorX = useSharedValue(getIndicatorX(0, 320));

  useEffect(() => {
    const target = getIndicatorX(state.index, barWidth.value);
    indicatorX.value = withSpring(target, { damping: 50, stiffness: 350 });
  }, [state.index]);

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
          <View
            style={[
              styles.avatarRing,
              isActive ? styles.avatarRingActive : styles.avatarRingInactive,
            ]}
          >
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarImage, styles.avatarFallback]} />
            )}
          </View>
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
          indicatorX.value = getIndicatorX(state.index, w);
        }}
      >
        {/* Frosted glass background */}
        <BlurView style={StyleSheet.absoluteFill} intensity={85} tint="dark" />
        {/* Dark overlay */}
        <View style={[StyleSheet.absoluteFill, styles.overlay]} />

        {/* Sliding active indicator pill */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Tab items */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const { options } = descriptors[route.key];
          const accessibilityLabel =
            options.tabBarAccessibilityLabel ?? route.name;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={accessibilityLabel}
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
  avatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarRingActive: {
    borderWidth: 2,
    borderColor: Colors.accentBlue,
  },
  avatarRingInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarFallback: {
    backgroundColor: Colors.accentBlue,
  },
});
