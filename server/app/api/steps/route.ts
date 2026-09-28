import { sql } from '@/lib/db';
import { bad, callerWithPlan, isDate, readJson } from '@/lib/http';
import { localNow, shiftDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Daily step totals from Apple Health, one number a day. Tracked only: missing the goal never
 *  reaches a witness (Q28). */
export async function POST(req: Request) {
  const c = await callerWithPlan(req);
  if (c instanceof Response) return c;
  const p = c.plan;
  const b = await readJson(req);
  const days = Array.isArray(b.days) ? b.days.slice(0, 14) : [];
  const today = localNow(p.timezone).date;

  for (const d of days) {
    if (!isDate(d?.date) || d.date > today || d.date < shiftDate(today, -13)) continue;
    const steps = Math.round(Number(d.steps));
    if (!(steps >= 0 && steps <= 150000)) continue;
    await sql`
      insert into steps (plan_id, date, steps) values (${p.id}, ${d.date}, ${steps})
      on conflict (plan_id, date) do update set steps = excluded.steps
    `;
  }
  if (!days.length) return bad('No steps sent.');
  return Response.json({ ok: true });
}
