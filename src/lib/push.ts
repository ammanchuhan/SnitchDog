/** Snitch's push notifications (COACH-2, DATA-7): the 4 am weigh-in ask, nudges, "I told your
 *  witnesses". The server sends through Expo's push service to this phone's token. */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { forgetPushToken, registerPushToken } from './api';

// Shown while the app is open too: Snitch's message is the point, not a badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const projectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

let registered: string | null = null;

export type PushState = 'on' | 'off' | 'unknown';

export async function pushState(): Promise<PushState> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'on' : p.canAskAgain ? 'unknown' : 'off';
}

/** Ask once (after sign-up, when there's a plan to be nudged about) and send the token up.
 *  Expo push tokens need the EAS project id, which exists once the project is set up on EAS;
 *  until then permission is still asked, and pushes sent with `simctl push` still arrive. */
export async function registerForPush(): Promise<PushState> {
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return current.canAskAgain ? 'unknown' : 'off';

  const id = projectId();
  if (!id) return 'on';
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (data !== registered) {
      await registerPushToken(data);
      registered = data;
    }
  } catch {
    // No network, or no APNs on this build: the next launch tries again.
  }
  return 'on';
}

/** Signing out stops pushes to this phone. */
export async function unregisterPush() {
  if (!registered) return;
  await forgetPushToken(registered).catch(() => {});
  registered = null;
}

/** Tapping a notification opens the tab it's about (LAUNCH-5). */
export function routeFromNotification(response: Notifications.NotificationResponse | null | undefined) {
  const tab = response?.notification.request.content.data?.tab;
  if (tab === 'home' || tab === 'coach') router.navigate(`/${tab}`);
}
