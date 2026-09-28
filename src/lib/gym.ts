/** Workouts verified by GPS at the pinned gym (Flow D, DATA-6).
 *
 * iOS watches one region, the gym's geofence, and wakes the app on arrival and departure, even
 * when it's closed (region monitoring, not continuous tracking: NFR-8). Arrived and left are the
 * only things worked out, on the phone; the server hears "verified, n minutes" and nothing else.
 *
 * A visit counts once it lasts MIN_MINUTES. It's reported when they leave, or sooner if the app
 * is opened while they're still there.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { reportWorkout } from './api';
import type { Gym } from './types';
import { toDate } from './types';

const TASK = 'snitchdog-gym-geofence';
const VISIT_KEY = 'snitchdog.gym-visit.v1';
/** Minutes inside the geofence that count as a workout (Q26). Same as the server's. */
export const MIN_MINUTES = 30;
/** A visit with no departure after this long is stale (the exit was missed). */
const STALE_HOURS = 12;

type Visit = { enteredAt: string; reported: boolean };

const readVisit = async (): Promise<Visit | null> => {
  const raw = await AsyncStorage.getItem(VISIT_KEY);
  return raw ? (JSON.parse(raw) as Visit) : null;
};
const writeVisit = (v: Visit | null) => (v ? AsyncStorage.setItem(VISIT_KEY, JSON.stringify(v)) : AsyncStorage.removeItem(VISIT_KEY));

const minutesSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60_000;

/** Sends the visit once, on the local day it started. */
async function report(visit: Visit, minutes: number) {
  if (visit.reported || minutes < MIN_MINUTES) return false;
  try {
    await reportWorkout(toDate(new Date(visit.enteredAt)), Math.round(minutes));
    return true;
  } catch {
    return false; // offline: the next check tries again
  }
}

TaskManager.defineTask<{ eventType: Location.LocationGeofencingEventType }>(TASK, async ({ data, error }) => {
  if (error || !data) return;
  if (data.eventType === Location.LocationGeofencingEventType.Enter) {
    const current = await readVisit();
    // A second "enter" without an exit (GPS jitter at the edge) keeps the original start.
    if (!current || minutesSince(current.enteredAt) > STALE_HOURS * 60) {
      await writeVisit({ enteredAt: new Date().toISOString(), reported: false });
    }
  } else if (data.eventType === Location.LocationGeofencingEventType.Exit) {
    const visit = await readVisit();
    if (visit) await report(visit, minutesSince(visit.enteredAt));
    await writeVisit(null);
  }
});

const metresBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** 'unavailable': this device can't monitor regions (the iOS simulator can't). */
export type GymWatch = 'watching' | 'needs-always' | 'off' | 'no-gym' | 'unavailable';

/** Starts (or moves) the geofence for the plan's gym. Asks for "Always" location the first time:
 *  foreground first, then background, the order iOS requires. */
export async function watchGym(gym: Gym | undefined, ask: boolean): Promise<GymWatch> {
  if (!gym) {
    if (await TaskManager.isTaskRegisteredAsync(TASK)) await Location.stopGeofencingAsync(TASK).catch(() => {});
    return 'no-gym';
  }
  let fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted && ask && fg.canAskAgain) fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'off';
  let bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted && ask && bg.canAskAgain) bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) return 'needs-always';

  try {
    await Location.startGeofencingAsync(TASK, [
      { identifier: 'gym', latitude: gym.lat, longitude: gym.lng, radius: gym.radius, notifyOnEnter: true, notifyOnExit: true },
    ]);
    return 'watching';
  } catch {
    return 'unavailable';
  }
}

/** Opening the app during a long visit reports it without waiting for the exit, if the phone is
 *  still at the gym. Also clears a visit whose exit was missed. */
export async function checkGymVisit(gym: Gym | undefined) {
  const visit = await readVisit();
  if (!visit || !gym) return;
  const minutes = minutesSince(visit.enteredAt);
  if (minutes > STALE_HOURS * 60) return writeVisit(null);
  if (visit.reported || minutes < MIN_MINUTES) return;
  const here = await Location.getLastKnownPositionAsync().catch(() => null);
  if (!here || metresBetween(here.coords, { latitude: gym.lat, longitude: gym.lng }) > gym.radius + 50) return;
  if (await report(visit, minutes)) await writeVisit({ ...visit, reported: true });
}
