import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '../../src/components/TabBar';
import { usePlan } from '../../src/lib/store';

/** Four tabs, opening on Home (NAV-1). Everything is reachable from here: deeper pages are rows
 *  in a list that push one level in, never links tucked into a corner (NAV-2).
 *
 *  The bar is a floating glass pill (src/components/TabBar.tsx) rather than the system one, so
 *  the page runs to the bottom of the screen and the bar sits on top of it. */
export default function TabsLayout() {
  const { ready, plan } = usePlan();
  // Signed out elsewhere, or the account was deleted: start again from the top.
  if (ready && !plan) return <Redirect href="/" />;
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
