/** Thin client for the SnitchDog server.
 *
 * The app works without it — everything is stored on device first — but the server is what
 * actually messages you and your witness, because escalation has to happen while the app is
 * closed. When no API URL is configured the app runs standalone and says so.
 */
import { currentToken } from './session';
import type { Plan } from './types';

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export const serverConfigured = () => BASE.length > 0;

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE) return null;
  // Every plan route is scoped to the signed-in account now, so a call without a token is a
  // guaranteed 401 — not worth the round trip.
  const token = currentToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  } catch (err) {
    // Never block the person from checking in because the network is down.
    console.warn('[snitchdog] api', path, err);
    return null;
  }
}

/** Push local state up; the server returns its own view, which wins for escalations. */
export const pushPlan = ({ profile, ...rest }: Plan) =>
  // Height, age and the answers behind the plan stay on the phone; the server has no use for them.
  call<Plan>('/api/plan', {
    method: 'PUT',
    // Photo file names mean nothing off the phone; whether there was proof does.
    body: JSON.stringify({ ...rest, weighIns: rest.weighIns.map(({ photo, ...w }) => w) }),
  });

export const fetchPlan = (id: string) => call<Plan>(`/api/plan/${id}`);

/** The signed-in account's plan, without knowing its id — how a device with nothing stored
 *  locally gets its plan back after signing in. Null when this account has never made one. */
export const fetchMyPlan = () => call<Plan>('/api/plan');

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
  BOT ? `${BOT}?start=w_${token}` : `https://snitchdog.com/w/${token}`;

/** Deep link the owner taps to receive their own check-ins. */
export const ownerLinkUrl = (planId: string) =>
  BOT ? `${BOT}?start=o_${planId}` : `https://snitchdog.com/link/${planId}`;
