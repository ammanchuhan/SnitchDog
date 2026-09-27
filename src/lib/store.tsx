/** Local-first state for the plan.
 *
 * Writes land on device immediately and sync to the server in the background, so logging a
 * weight never waits on a network. The server owns the fields the app can't know on its own —
 * whether the witness is linked, and what they have been told — so its copy of those wins.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchMyPlan, fetchPlan, pushPlan } from './api';
import { loadToken } from './session';
import { deletePhoto } from './photos';
import { Plan, Session, SessionStatus, toDate, WeighIn } from './types';

const KEY = 'snitchdog.plan.v2';

type Ctx = {
  ready: boolean;
  plan: Plan | null;
  start: (p: Plan) => Promise<void>;
  /** Today's number. Replaces an earlier reading on the same day rather than adding one. */
  /** Every weigh-in carries its photo; the date is only for tests and backfills. */
  logWeight: (value: number, photo: string, date?: string) => Promise<void>;
  answerSession: (slotId: string, status: SessionStatus, date?: string) => Promise<void>;
  /** Editing the plan: goal, wake time, routine, witness. */
  update: (patch: Partial<Plan>) => Promise<void>;
  refresh: () => Promise<void>;
  /** Pull this account's plan down after signing in on a device that has nothing stored. */
  hydrate: () => Promise<Plan | null>;
  clear: () => Promise<void>;
};

const PlanContext = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [ready, setReady] = useState(false);

  const persist = useCallback(async (next: Plan | null) => {
    setPlan(next);
    if (next) {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      pushPlan(next); // fire and forget
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  }, []);

  /** Nothing on this device, but somebody is signed in: a new phone, or the same one after
   *  signing out. Their plan lives on the server — fetch it rather than sending them through
   *  onboarding as if they were new. Writes straight to storage instead of going through
   *  `persist`, which would push the plan we just received back up again. */
  const hydrate = useCallback(async () => {
    if (!(await loadToken())) return null;
    const remote = await fetchMyPlan();
    if (!remote) return null;
    setPlan(remote);
    await AsyncStorage.setItem(KEY, JSON.stringify(remote));
    return remote;
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        setPlan(JSON.parse(raw) as Plan);
      } else {
        await hydrate();
      }
      setReady(true);
    })();
    // hydrate is stable; this runs once, and signing in calls it again itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    if (!plan) return;
    const remote = await fetchPlan(plan.id);
    if (!remote) return;
    const told = new Map(remote.sessions.map((s) => [`${s.date}:${s.slotId}`, s.escalatedAt]));
    const merged: Plan = {
      ...plan,
      witness: { ...plan.witness, linked: remote.witness.linked, linkedAt: remote.witness.linkedAt },
      ownerChatId: remote.ownerChatId ?? plan.ownerChatId,
      escalatedWeeks: remote.escalatedWeeks ?? plan.escalatedWeeks,
      // The server may have answered on our behalf (a Telegram button) or recorded a miss.
      weighIns: mergeWeighIns(plan.weighIns, remote.weighIns),
      sessions: mergeSessions(plan.sessions, remote.sessions, told),
    };
    setPlan(merged);
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  }, [plan]);

  const start = useCallback((p: Plan) => persist(p), [persist]);

  const logWeight = useCallback(
    async (value: number, photo: string, date = toDate()) => {
      if (!plan) return;
      const replaced = plan.weighIns.find((w) => w.date === date);
      if (replaced?.photo && replaced.photo !== photo) deletePhoto(replaced.photo);
      const weighIns = [
        ...plan.weighIns.filter((w) => w.date !== date),
        { date, value, loggedAt: new Date().toISOString(), photo, proof: 'camera' as const },
      ].sort((a, b) => a.date.localeCompare(b.date));
      await persist({ ...plan, weighIns });
    },
    [plan, persist],
  );

  const answerSession = useCallback<Ctx['answerSession']>(
    async (slotId, status, date = toDate()) => {
      if (!plan) return;
      const previous = plan.sessions.find((s) => s.date === date && s.slotId === slotId);
      const session: Session = {
        date,
        slotId,
        status,
        answeredAt: new Date().toISOString(),
        escalatedAt: previous?.escalatedAt,
      };
      const sessions = [
        ...plan.sessions.filter((s) => !(s.date === date && s.slotId === slotId)),
        session,
      ].sort((a, b) => a.date.localeCompare(b.date));
      await persist({ ...plan, sessions });
    },
    [plan, persist],
  );

  const update = useCallback(
    async (patch: Partial<Plan>) => {
      if (!plan) return;
      await persist({ ...plan, ...patch });
    },
    [plan, persist],
  );

  const clear = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({ ready, plan, start, logWeight, answerSession, update, refresh, hydrate, clear }),
    [ready, plan, start, logWeight, answerSession, update, refresh, hydrate, clear],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/** Local answers win; escalation timestamps come from the server. */
function mergeSessions(local: Session[], remote: Session[], told: Map<string, string | undefined>) {
  const out = new Map(local.map((s) => [`${s.date}:${s.slotId}`, s]));
  for (const r of remote) {
    const key = `${r.date}:${r.slotId}`;
    const mine = out.get(key);
    out.set(key, mine ? { ...mine, escalatedAt: told.get(key) ?? mine.escalatedAt } : r);
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
}

/** Union by day. The server knows about weigh-ins sent to the bot; only the phone has the photos
 *  taken in the app, so a local entry keeps its photo even when the server has the same day. */
function mergeWeighIns(local: WeighIn[], remote: WeighIn[]): WeighIn[] {
  const byDate = new Map(remote.map((w) => [w.date, w]));
  for (const w of local) {
    const r = byDate.get(w.date);
    byDate.set(w.date, r && r.loggedAt > w.loggedAt && r.proof === 'telegram' ? r : w);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

