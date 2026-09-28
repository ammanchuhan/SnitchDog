import { Tabs } from 'expo-router';

import { TabBar } from '../../src/components/TabBar';

/** Four tabs, opening on Home (NAV-1). Everything is reachable from here: deeper pages are rows
 *  in a list that push one level in, never links tucked into a corner (NAV-2).
 *
 *  The bar is a floating glass pill (src/components/TabBar.tsx) rather than the system one, so
 *  the page runs to the bottom of the screen and the bar sits on top of it. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
