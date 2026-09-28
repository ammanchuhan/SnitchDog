import * as Notifications from 'expo-notifications';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { TabBar } from '../../src/components/TabBar';
import { checkGymVisit, watchGym } from '../../src/lib/gym';
import { registerForPush, routeFromNotification } from '../../src/lib/push';
import { syncSteps } from '../../src/lib/steps';
import { usePlan } from '../../src/lib/store';

/** Four tabs, opening on Home (NAV-1). Everything is reachable from here: deeper pages are rows
 *  in a list that push one level in, never links tucked into a corner (NAV-2).
 *
 *  The bar is a floating glass pill (src/components/TabBar.tsx) rather than the system one, so
 *  the page runs to the bottom of the screen and the bar sits on top of it. */
export default function TabsLayout() {
  const { ready, plan, refresh } = usePlan();
  const hasPlan = !!plan;
  const lastResponse = Notifications.useLastNotificationResponse();

  // Push is asked for once there's a plan to be nudged about, not at sign-in.
  useEffect(() => {
    if (hasPlan) registerForPush().catch(() => {});
  }, [hasPlan]);

  // Steps come from Apple Health once there's a step goal to track.
  const hasStepsGoal = !!plan?.stepsGoal;
  useEffect(() => {
    if (hasStepsGoal) syncSteps().then((ok) => { if (ok) refresh(); });
    // Once per launch (and on return to the app, below); refresh is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStepsGoal]);

  // The gym's geofence follows the plan: started once there's a gym, moved when it changes.
  // "Always" is asked for here, right after the plan with the gym is confirmed.
  const gymKey = plan?.gym ? `${plan.gym.lat},${plan.gym.lng},${plan.gym.radius}` : '';
  useEffect(() => {
    if (!plan) return;
    watchGym(plan.gym, true)
      .then(() => checkGymVisit(plan.gym))
      .catch(() => {});
    // Keyed on the gym itself, not the whole plan object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymKey]);

  // Back in the foreground: catch up with the server, and report a gym visit still going on.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refresh().then((p) => {
        if (!p) return;
        checkGymVisit(p.gym).catch(() => {});
        if (p.stepsGoal) syncSteps().then((ok) => { if (ok) refresh(); });
      });
    });
    return () => sub.remove();
  }, [refresh]);

  // A tapped notification opens the tab it's about (LAUNCH-5), including one that launched the app.
  useEffect(() => {
    if (hasPlan) routeFromNotification(lastResponse);
  }, [hasPlan, lastResponse]);
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
