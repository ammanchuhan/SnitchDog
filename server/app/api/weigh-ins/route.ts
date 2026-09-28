import { weekLine } from '@/lib/coach';
import { type PlanRow, getWeighIns, getWitnesses, sql } from '@/lib/db';
import { bad, authed, isDate, readJson } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';
import { countsFrom, weekMath } from '@/lib/rules';
import { serialisePlan } from '@/lib/serialise';
import { localNow, shiftDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Log a weigh-in (LOG-2..6). The phone read the number off a photo of the scale and deleted the
 *  photo; only the number and whether OCR read it ('ocr') or it was typed after three failed
 *  reads ('typed', shown as unverified) arrive here.
 *
 *  Answers with the plan and a line about the week (Flow C): how many are still needed, and
 *  whether there's any room left to skip. */
export const POST = authed(async (req, c) => {
  const p: PlanRow = c.plan;
  const b = await readJson(req);

  const today = localNow(p.timezone).date;
  // A weigh-in queued offline (NFR-2) can land a day late; older than that isn't a weigh-in.
  const date = isDate(b.date) ? b.date : today;
  if (date > today || date < shiftDate(today, -1)) return bad('That day has passed.');

  const value = Number(b.value);
  const kg = p.unit === 'kg' ? value : value / 2.20462;
  const bmi = p.height_cm ? kg / (Number(p.height_cm) / 100) ** 2 : 25;
  if (!(value > 0) || bmi < 12 || bmi > 80) return bad('That number can’t be right. Retake the photo.');

  const proof = b.verified === false ? 'typed' : 'ocr';
  // One per local day: a second one replaces the first (LOG-6).
  await sql`
    insert into weigh_ins (plan_id, date, value, proof)
    values (${p.id}, ${date}, ${Math.round(value * 10) / 10}, ${proof})
    on conflict (plan_id, date) do update set value = excluded.value, logged_at = now(), proof = excluded.proof
  `;

  const [weighIns, witnesses] = await Promise.all([getWeighIns(p.id), getWitnesses(p.id)]);
  const week = weekMath(p, countsFrom(p, witnesses), weighIns, today);
  return Response.json({ plan: await serialisePlan(p), line: weekLine(week) });
}, { limit: LIMITS.weighIn });
