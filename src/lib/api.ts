/** Thin client for the Accountable server.
 *
 * The app works without it — everything is stored on device first — but the server is what
 * actually messages you and your witness, because escalation has to happen while the app is
 * closed. When no API URL is configured the app runs standalone and says so.
 */
import type { Plan } from './types';

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export const serverConfigured = () => BASE.length > 0;

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  } catch (err) {
    // Never block the person from checking in because the network is down.
    console.warn('[accountable] api', path, err);
    return null;
  }
}

/** Push local state up; the server returns its own view, which wins for escalations. */
export const pushPlan = (p: Plan) => call<Plan>('/api/plan', { method: 'PUT', body: JSON.stringify(p) });

export const fetchPlan = (id: string) => call<Plan>(`/api/plan/${id}`);

/** Erasure, not a reset — see the plan screen. Best effort: the device copy goes either way. */
export const deletePlan = (id: string) => call<{ ok: true }>(`/api/plan/${id}`, { method: 'DELETE' });

const BOT = process.env.EXPO_PUBLIC_BOT_URL?.replace(/\/$/, '') ?? '';

export const botConfigured = () => BOT.length > 0;

export type ChatTurn = { role: 'user' | 'coach'; text: string };

/** Talk to the coach. Returns null when there's no server — the screen says so plainly. */
export const askCoach = (planId: string, message: string, history: ChatTurn[]) =>
  call<{ reply: string; changed?: boolean }>('/api/coach/chat', {
    method: 'POST',
    body: JSON.stringify({ planId, message, history }),
  });

export type Memory = { id: string; fact: string; created_at: string };

export const fetchMemories = (planId: string) =>
  call<{ memories: Memory[] }>(`/api/coach/memory?plan=${planId}`);

export const forgetMemory = (planId: string, id: string) =>
  call<{ ok: true }>('/api/coach/memory', { method: 'DELETE', body: JSON.stringify({ planId, id }) });

/** Deep link a witness taps to attach their messaging account to this commitment. */
export const witnessInviteUrl = (token: string) =>
  BOT ? `${BOT}?start=w_${token}` : `https://accountable.app/w/${token}`;

/** Deep link the owner taps to receive their own check-ins. */
export const ownerLinkUrl = (planId: string) =>
  BOT ? `${BOT}?start=o_${planId}` : `https://accountable.app/link/${planId}`;
