import { advance } from '@/lib/ladder';
import { PlanRow, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Vercel cron hits this every 15 minutes. It is the only thing that has to keep running. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('nope', { status: 401 });
  }

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
}
