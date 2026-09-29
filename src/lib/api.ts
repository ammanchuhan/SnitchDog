/** The client for the SnitchDog server.
 *
 * The server is the source of truth (P5), so every change is a call here, and every call that
 * changes the plan answers with the whole plan. Errors are thrown as ApiError with the server's
 * own wording, which is written for a person to read.
 */
import { loadToken } from './session';
import type { Gym, NewPlan, Plan, RoutineSlot, Style } from './types';

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new ApiError('No server is configured for this build.', 0);
  // Awaited, not read from memory: after a JS reload the in-memory copy is empty until the
  // keychain is read again, and a call made in that window would go out signed out.
  const token = await loadToken();
  if (!token) throw new ApiError('You’re signed out. Sign in again.', 401);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection.', 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 401) throw new ApiError('You’re signed out. Sign in again.', 401);
    throw new ApiError(body?.error ?? 'Something went wrong. Try again.', res.status);
  }
  return (await res.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

/** The signed-in account's plan; null means sign-up isn't finished. */
export async function fetchPlan(): Promise<Plan | null> {
  try {
    return await call<Plan>('/api/plan');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const createPlan = ({ witnessNames, ...p }: NewPlan) =>
  call<Plan>('/api/plan', json('POST', {
    ...p,
    witnesses: witnessNames.length,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));

export type PlanPatch = Partial<{
  target: number;
  heightCm: number;
  heightUnit: 'ft' | 'cm';
  style: Style;
  timezone: string;
  routine: RoutineSlot[];
  gym: Gym;
  stepsGoal: number;
}>;

export const patchPlan = (patch: PlanPatch) => call<Plan>('/api/plan', json('PATCH', patch));

export const suggestPlan = (stepsAverage?: number) =>
  call<{ workoutsPerWeek: number; stepsGoal: number }>(`/api/plan/suggest?stepsAverage=${Math.round(stepsAverage ?? 0)}`);

export const pausePlan = (days: number, reason: string) => call<Plan>('/api/plan/pause', json('POST', { days, reason }));
export const resumePlan = () => call<Plan>('/api/plan/pause', json('DELETE'));

export const logWeighIn = (value: number, verified: boolean, date?: string) =>
  call<{ plan: Plan; line: string }>('/api/weigh-ins', json('POST', { value, verified, date }));

export const reportWorkout = (date: string, minutes: number) => call<Plan>('/api/workouts', json('POST', { date, minutes }));

export const reportSteps = (days: { date: string; steps: number }[]) => call<{ ok: true }>('/api/steps', json('POST', { days }));

export const addWitness = () => call<Plan>('/api/witnesses', json('POST'));
export const nameWitness = (id: string, name: string) => call<Plan>(`/api/witnesses/${id}`, json('PATCH', { name }));
export const renewWitness = (id: string) => call<Plan>(`/api/witnesses/${id}`, json('PATCH', { renew: true }));
export const removeWitness = (id: string) => call<Plan>(`/api/witnesses/${id}`, json('DELETE'));

export const registerPushToken = (token: string) => call<{ ok: true }>('/api/push-token', json('POST', { token }));
export const forgetPushToken = (token: string) => call<{ ok: true }>('/api/push-token', json('DELETE', { token }));

export type ChatMessage = { id: string; role: 'user' | 'coach'; text: string; kind: string | null; created_at: string };

export const fetchChat = () => call<{ messages: ChatMessage[] }>('/api/coach/chat');
export const askCoach = (message: string) => call<{ reply: string; changed?: boolean }>('/api/coach/chat', json('POST', { message }));

export type Memory = { id: string; fact: string; created_at: string };
export const fetchMemories = () => call<{ memories: Memory[] }>('/api/coach/memory');
export const forgetMemory = (id: string) => call<{ ok: true }>('/api/coach/memory', json('DELETE', { id }));

const BOT = process.env.EXPO_PUBLIC_BOT_URL?.replace(/\/$/, '') ?? '';

/** The witness's invite link. snitchdog.com/w/<code> redirects into the bot, so old invites keep
 *  working if the bot is renamed; until the domain points at the server, links go to the bot. */
export const witnessInviteUrl = (token: string) =>
  BOT ? `${BOT}?start=w_${token}` : `https://snitchdog.com/w/${token}`;

export const changePassword = (current: string, next: string) => call<{ ok: true }>('/api/auth/password', json('POST', { current, next }));

/** The weight read off a scale photo by the server, or null when it couldn't read one. */
export const readScalePhoto = (image: string) =>
  call<{ value: number | null; reason?: string }>('/api/scale/read', json('POST', { image }));
