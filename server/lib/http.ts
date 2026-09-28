/** Shared plumbing for routes.
 *
 * `authed` resolves the caller from the bearer token (DATA-1), rate-limits the account, and runs
 * the handler with every query scoped to that account by row-level security. `open` is for
 * routes without an account (sign-in, the bot, the cron): rate-limited by IP and run as system.
 */
import { type Account, accountFor } from './auth';
import { asAccount, asSystem, type PlanRow, planForAccount } from './db';
import { clientIp, hit, type Limit, LIMITS, tooMany } from './ratelimit';
import { serialisePlan } from './serialise';

export const bad = (error: string, status = 400) => Response.json({ error }, { status });

type RouteContext = { params: Promise<Record<string, string>> };

export type Caller = { account: Account; plan: PlanRow | null };
export type CallerWithPlan = { account: Account; plan: PlanRow };

function withAccount(
  handler: (req: Request, caller: Caller, ctx: RouteContext) => Promise<Response>,
  limit: Limit | undefined,
  needsPlan: boolean,
) {
  return async (req: Request, ctx: RouteContext) => {
    const account = await accountFor(req);
    if (!account) return new Response('unauthorized', { status: 401 });
    for (const l of [LIMITS.api, ...(limit ? [limit] : [])]) {
      const wait = await hit(l, account.id);
      if (wait) return tooMany(wait);
    }
    return asAccount(account.id, async () => {
      const plan = await planForAccount(account.id);
      if (!plan && needsPlan) return new Response('no plan', { status: 404 });
      return handler(req, { account, plan }, ctx);
    });
  };
}

/** A route for a signed-in account that has finished sign-up. */
export const authed = (
  handler: (req: Request, caller: CallerWithPlan, ctx: RouteContext) => Promise<Response>,
  options: { limit?: Limit } = {},
) => withAccount(handler as (req: Request, caller: Caller, ctx: RouteContext) => Promise<Response>, options.limit, true);

/** A route for a signed-in account, with or without a plan yet. */
export const signedIn = (
  handler: (req: Request, caller: Caller, ctx: RouteContext) => Promise<Response>,
  options: { limit?: Limit } = {},
) => withAccount(handler, options.limit, false);

export function open(
  handler: (req: Request, ctx: RouteContext) => Promise<Response>,
  limit?: Limit,
) {
  return async (req: Request, ctx: RouteContext) => {
    if (limit) {
      const wait = await hit(limit, clientIp(req));
      if (wait) return tooMany(wait);
    }
    return asSystem(() => handler(req, ctx));
  };
}

/** Every write answers with the whole plan, so the app never has to guess what changed. */
export const planResponse = async (plan: PlanRow) => Response.json(await serialisePlan(plan));

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Request bodies here are small JSON; anything large is refused before it's parsed. */
const MAX_BODY = 32 * 1024;

export async function readJson(req: Request): Promise<Record<string, any>> {
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BODY) return {};
  const text = await req.text().catch(() => '');
  if (text.length > MAX_BODY) return {};
  try {
    const body = JSON.parse(text);
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

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
