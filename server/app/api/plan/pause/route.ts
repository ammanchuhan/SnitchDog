import { type PlanRow, sql } from '@/lib/db';
import { bad, authed, planResponse, readJson } from '@/lib/http';
import { tellWitnesses } from '@/lib/notify';
import { MAX_PAUSE_DAYS } from '@/lib/rules';
import { localNow, shiftDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Fixed reasons, because witnesses hear it and nothing the owner types is ever forwarded (TG-3). */
const REASONS = ['Illness', 'Injury', 'Travel', 'Family'];

/** Pause the plan (Q4): up to 14 days, starting today. Nothing is judged inside it, and every
 *  witness is told, with the reason, because under P4 you can't step away quietly. */
export const POST = authed(async (req, c) => {
  const p = c.plan;
  const b = await readJson(req);
  const days = Number(b.days);
  if (!(Number.isInteger(days) && days >= 1 && days <= MAX_PAUSE_DAYS)) return bad(`A pause is 1 to ${MAX_PAUSE_DAYS} days.`);
  if (!REASONS.includes(b.reason)) return bad('Pick a reason.');

  const { date } = localNow(p.timezone);
  if (p.paused_until && p.paused_until >= date) return bad('The plan is already paused.');

  await sql`
    update plans set paused_from = ${date}, paused_until = ${shiftDate(date, days - 1)}, pause_reason = ${b.reason}
     where id = ${p.id}
  `;
  await tellWitnesses(p, '', { kind: 'witness_paused', days, reason: b.reason });
  return planResponse((await sql`select * from plans where id = ${p.id}`)[0] as PlanRow);
});

/** Back early: the pause ends yesterday, so today counts again. */
export const DELETE = authed(async (req, c) => {
  const p = c.plan;
  const { date } = localNow(p.timezone);
  if (p.paused_from && p.paused_from >= date) {
    await sql`update plans set paused_from = null, paused_until = null, pause_reason = null where id = ${p.id}`;
  } else if (p.paused_until && p.paused_until >= date) {
    await sql`update plans set paused_until = ${shiftDate(date, -1)} where id = ${p.id}`;
  }
  return planResponse((await sql`select * from plans where id = ${p.id}`)[0] as PlanRow);
});
