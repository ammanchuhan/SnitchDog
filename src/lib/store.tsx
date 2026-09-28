/** The plan, as the server last said it was.
 *
 * Cloud-first (P5): every change is a server call, and the plan it answers with replaces the one
 * here. The phone keeps a copy so the app opens straight to the last synced state, offline or not
 * (NFR-2).
 *
 * One thing lives only on the phone: the names the owner gave witnesses who haven't accepted yet
 * (WIT-8). They're merged into the plan here, and sent to the server once that witness accepts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as api from './api';
import { dropSession, loadToken } from './session';
import type { NewPlan, Plan } from './types';

const PLAN_KEY = 'snitchdog.plan.v3';
const NAMES_KEY = 'snitchdog.witness-names.v1';
/** Weigh-ins taken offline, sent on the next refresh (NFR-2). The server takes one a day late. */
const QUEUE_KEY = 'snitchdog.weigh-in-queue.v1';

type Queued = { value: number; verified: boolean; date: string; loggedAt: string };

type Names = Record<string, string>;

type Ctx = {
  ready: boolean;
  plan: Plan | null;
  /** Ask the server again. Null means this account has no plan yet. */
  refresh: () => Promise<Plan | null>;
  /** Finish sign-up. */
  create: (p: NewPlan) => Promise<Plan>;
  /** Run a server call that answers with the plan, and keep what it returns. */
  run: (call: () => Promise<Plan>) => Promise<Plan>;
  logWeight: (value: number, verified: boolean) => Promise<string>;
  /** Name a witness the owner just added (kept on the phone until they accept). */
  nameWitness: (id: string, name: string) => Promise<void>;
  clear: () => Promise<void>;
};

const PlanContext = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [ready, setReady] = useState(false);
  const names = useRef<Names>({});

  /** The server's plan with the phone's names filled in, and any name the server is now
   *  allowed to have (the witness accepted) sent up. */
  const keep = useCallback(async (remote: Plan | null) => {
    if (!remote) {
      setPlan(null);
      await AsyncStorage.removeItem(PLAN_KEY);
      return null;
    }
    const merged: Plan = {
      ...remote,
      witnesses: remote.witnesses.map((w) => ({ ...w, name: w.name ?? names.current[w.id] })),
    };
    for (const w of remote.witnesses) {
      const local = names.current[w.id];
      if (w.status === 'watching' && !w.name && local) api.nameWitness(w.id, local).catch(() => {});
    }
    setPlan(merged);
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(merged));
    return merged;
  }, []);

  const saveNames = async (next: Names) => {
    names.current = next;
    await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(next));
  };

  /** Signed out on the server: forget everything on this phone. The tabs notice the plan is gone
   *  and send the person back to the account screen. */
  const signedOut = useCallback(async () => {
    await dropSession();
    await AsyncStorage.removeItem(QUEUE_KEY);
    await saveNames({});
    await keep(null);
  }, [keep]);

  /** Sends weigh-ins that were logged offline. Stops at the first that still can't go. */
  const flushQueue = useCallback(async () => {
    const queued = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]') as Queued[];
    const left: Queued[] = [];
    for (const q of queued) {
      if (left.length) {
        left.push(q);
        continue;
      }
      try {
        await api.logWeighIn(q.value, q.verified, q.date);
      } catch (err) {
        // Offline still: keep it. Refused (too late, or impossible): drop it.
        if (err instanceof api.ApiError && err.status === 0) left.push(q);
      }
    }
    if (left.length) await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(left));
    else await AsyncStorage.removeItem(QUEUE_KEY);
  }, []);

  const refresh = useCallback(async () => {
    if (!(await loadToken())) return keep(null);
    try {
      await flushQueue();
      return await keep(await api.fetchPlan());
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 401) return signedOut().then(() => null);
      // Offline: keep showing the last synced plan.
      return plan;
    }
  }, [keep, plan, signedOut, flushQueue]);

  useEffect(() => {
    (async () => {
      const [raw, rawNames] = await Promise.all([AsyncStorage.getItem(PLAN_KEY), AsyncStorage.getItem(NAMES_KEY)]);
      names.current = rawNames ? (JSON.parse(rawNames) as Names) : {};
      if (raw) setPlan(JSON.parse(raw) as Plan);
      setReady(true);
      // Then catch up with the server in the background (LAUNCH-3).
      if (await loadToken()) {
        api.fetchPlan()
          .then(keep)
          .catch((err) => {
            if (err instanceof api.ApiError && err.status === 401) signedOut();
          });
      }
    })();
    // Runs once; keep is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    async (call: () => Promise<Plan>) => {
      try {
        return (await keep(await call()))!;
      } catch (err) {
        if (err instanceof api.ApiError && err.status === 401) await signedOut();
        throw err;
      }
    },
    [keep, signedOut],
  );

  const create = useCallback(
    async (p: NewPlan) => {
      const created = await api.createPlan(p);
      // The server made one witness per name, in order; the names stay here.
      const next = { ...names.current };
      created.witnesses.forEach((w, i) => {
        if (p.witnessNames[i]) next[w.id] = p.witnessNames[i];
      });
      await saveNames(next);
      return (await keep(created))!;
    },
    [keep],
  );

  const logWeight = useCallback(
    async (value: number, verified: boolean) => {
      try {
        const { plan: next, line } = await api.logWeighIn(value, verified);
        await keep(next);
        return line;
      } catch (err) {
        if (!(err instanceof api.ApiError) || err.status !== 0 || !plan) throw err;
        // No connection (NFR-2): keep it on the phone, show it now, send it later.
        const entry: Queued = { value: Math.round(value * 10) / 10, verified, date: plan.today, loggedAt: new Date().toISOString() };
        const queued = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]') as Queued[];
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queued.filter((q) => q.date !== entry.date), entry]));
        const weighIns = [...plan.weighIns.filter((w) => w.date !== entry.date), { date: entry.date, value: entry.value, loggedAt: entry.loggedAt, verified }];
        setPlan({ ...plan, weighIns: weighIns.sort((a, b) => a.date.localeCompare(b.date)) });
        return 'Saved on this phone. It’ll send as soon as you’re back online.';
      }
    },
    [keep, plan],
  );

  const nameWitness = useCallback(
    async (id: string, name: string) => {
      await saveNames({ ...names.current, [id]: name });
      setPlan((p) => (p ? { ...p, witnesses: p.witnesses.map((w) => (w.id === id ? { ...w, name } : w)) } : p));
    },
    [],
  );

  const clear = useCallback(async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
    await saveNames({});
    await keep(null);
  }, [keep]);

  const value = useMemo(
    () => ({ ready, plan, refresh, create, run, logWeight, nameWitness, clear }),
    [ready, plan, refresh, create, run, logWeight, nameWitness, clear],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
}
