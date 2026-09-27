import { Tabs } from 'expo-router';

import { TabBar } from '../../src/components/TabBar';

/** Home in the middle, where the thumb rests: how you're doing and what's due. Analytics is for
 *  looking back; Coach is for talking. The plan is settings, so it hangs off Home instead.
 *
 *  The bar is a floating glass pill (src/components/TabBar.tsx) rather than the system one, so
 *  the page runs to the bottom of the screen and the bar sits on top of it. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="today" />
      <Tabs.Screen name="coach" />
    </Tabs>
  );
}
