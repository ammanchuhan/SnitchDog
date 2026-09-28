import { sameSecret } from '@/lib/auth';
import { advance } from '@/lib/ladder';
import { sweepRateLimits } from '@/lib/ratelimit';
import { PlanRow, sql } from '@/lib/db';
import { open } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Runs every 15 minutes (the GitHub Action; Vercel's daily cron is a backstop). It is the only
 *  thing that has to keep running. */
export const GET = open(async (req) => {
  // Vercel's cron and the GitHub Action send the secret. Required, never optional.
  const given = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? null;
  if (!sameSecret(given, process.env.CRON_SECRET)) return new Response('nope', { status: 401 });

  await sweepRateLimits();
  const plans = (await sql`select * from plans`) as PlanRow[];
  const acted: Record<string, string[]> = {};
  for (const plan of plans) {
    try {
      const actions = await advance(plan);
      if (actions.length) acted[plan.id] = actions;
    } catch (err) {
      console.error('[tick]', plan.id, err);
      acted[plan.id] = ['error'];
    }
  }
  return Response.json({ checked: plans.length, acted });
});
