/** Local-first state for the plan.
 *
 * Writes land on device immediately and sync to the server in the background, so logging a
 * weight never waits on a network. The server owns the fields the app can't know on its own —
 * whether the witness is linked, and what they have been told — so its copy of those wins.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchPlan, pushPlan } from './api';
import { Plan, Session, SessionStatus, toDate } from './types';

const KEY = 'accountable.plan.v2';

type Ctx = {
  ready: boolean;
  plan: Plan | null;
  start: (p: Plan) => Promise<void>;
  /** Today's number. Replaces an earlier reading on the same day rather than adding one. */
  logWeight: (value: number, date?: string) => Promise<void>;
  answerSession: (slotId: string, status: SessionStatus, date?: string) => Promise<void>;
  /** Editing the plan: goal, wake time, routine, witness. */
  update: (patch: Partial<Plan>) => Promise<void>;
  refresh: () => Promise<void>;
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

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) setPlan(JSON.parse(raw) as Plan);
      setReady(true);
    })();
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
      weighIns: remote.weighIns.length >= plan.weighIns.length ? remote.weighIns : plan.weighIns,
      sessions: mergeSessions(plan.sessions, remote.sessions, told),
    };
    setPlan(merged);
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  }, [plan]);

  const start = useCallback((p: Plan) => persist(p), [persist]);

  const logWeight = useCallback(
    async (value: number, date = toDate()) => {
      if (!plan) return;
      const weighIns = [
        ...plan.weighIns.filter((w) => w.date !== date),
        { date, value, loggedAt: new Date().toISOString() },
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
    () => ({ ready, plan, start, logWeight, answerSession, update, refresh, clear }),
    [ready, plan, start, logWeight, answerSession, update, refresh, clear],
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
