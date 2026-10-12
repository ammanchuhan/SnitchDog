/** Fixed-window rate limits, kept in Postgres so every serverless instance shares them.
 *  Keys are hashed: no raw IPs or email addresses are stored. */
import { createHash } from 'node:crypto';

import { asSystem, sql } from './db';

export type Limit = { name: string; max: number; windowSec: number };

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

/** Counts a hit; returns the seconds to wait when over the limit, or 0. */
export async function hit(limit: Limit, subject: string): Promise<number> {
  const key = `${limit.name}:${hash(subject)}`;
  const rows = (await asSystem(() => sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${limit.windowSec})
                   then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${limit.windowSec})
                          then now() else rate_limits.window_start end
    returning count, extract(epoch from (now() - window_start))::int as elapsed
  `)) as { count: number; elapsed: number }[];
  const { count, elapsed } = rows[0];
  return count > limit.max ? Math.max(1, limit.windowSec - elapsed) : 0;
}

export const tooMany = (retryAfter: number) =>
  Response.json(
    { error: 'Too many tries. Wait a moment and try again.' },
    { status: 429, headers: { 'retry-after': String(retryAfter) } },
  );

/** The caller's IP as Vercel's edge saw it (the leftmost x-forwarded-for is set by Vercel, not
 *  the client, on Vercel deployments). */
export const clientIp = (req: Request) =>
  req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

/** Old windows, cleared by the tick. */
export const sweepRateLimits = () => asSystem(() => sql`delete from rate_limits where window_start < now() - interval '1 day'`);

// The limits, in one place.
export const LIMITS = {
  api: { name: 'api', max: 120, windowSec: 60 },
  chat: { name: 'chat', max: 15, windowSec: 60 },
  weighIn: { name: 'weigh-in', max: 20, windowSec: 3600 },
  scaleRead: { name: 'scale-read', max: 30, windowSec: 3600 },
  addWitness: { name: 'add-witness', max: 10, windowSec: 3600 },
  password: { name: 'password', max: 5, windowSec: 3600 },
  signup: { name: 'signup', max: 5, windowSec: 3600 },
  login: { name: 'login', max: 10, windowSec: 900 },
  loginEmail: { name: 'login-email', max: 10, windowSec: 900 },
  provider: { name: 'provider', max: 20, windowSec: 3600 },
  reset: { name: 'reset', max: 5, windowSec: 3600 },
  resetEmail: { name: 'reset-email', max: 3, windowSec: 3600 },
  resetConfirm: { name: 'reset-confirm', max: 10, windowSec: 900 },
  telegram: { name: 'telegram', max: 30, windowSec: 60 },
  invite: { name: 'invite', max: 60, windowSec: 60 },
} satisfies Record<string, Limit>;
