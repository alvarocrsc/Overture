import React from 'react';
import { Tabs } from 'expo-router';
import TabBar from '@/src/components/shared/TabBar';

/**
 * Authenticated tab navigator. Renders a custom floating frosted-glass
 * tab bar via the TabBar component and hides all screen headers.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
