/** Shared plumbing for the app's routes: every one resolves the caller from the bearer token
 *  before touching a row (DATA-1), and most need the caller's plan. */
import { type Account, accountFor } from './auth';
import { type PlanRow, planForAccount } from './db';
import { serialisePlan } from './serialise';

export const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function caller(req: Request): Promise<{ account: Account; plan: PlanRow | null } | Response> {
  const account = await accountFor(req);
  if (!account) return new Response('unauthorized', { status: 401 });
  return { account, plan: await planForAccount(account.id) };
}

/** The caller and their plan, or the response to send instead. */
export async function callerWithPlan(req: Request): Promise<{ account: Account; plan: PlanRow } | Response> {
  const c = await caller(req);
  if (c instanceof Response) return c;
  if (!c.plan) return new Response('no plan', { status: 404 });
  return { account: c.account, plan: c.plan };
}

/** Every write answers with the whole plan, so the app never has to guess what changed. */
export const planResponse = async (plan: PlanRow) => Response.json(await serialisePlan(plan));

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const readJson = async (req: Request): Promise<Record<string, any>> =>
  req.json().then((b) => (b && typeof b === 'object' ? b : {})).catch(() => ({}));

/** Plausible for a human body at all: typos and unit mix-ups, not health limits (the app
 *  explains those). BMI 12–80 with a height; a wide absolute range without one. */
export function plausibleWeight(value: unknown, unit: string, heightCm?: number | null): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return false;
  const kg = unit === 'kg' ? value : value / 2.20462;
  if (heightCm) {
    const bmi = kg / (heightCm / 100) ** 2;
    return bmi >= 12 && bmi <= 80;
  }
  return kg >= 23 && kg <= 360;
}
