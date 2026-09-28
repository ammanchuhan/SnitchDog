import { sql } from '@/lib/db';
import { bad, callerWithPlan, isDate, planResponse, readJson } from '@/lib/http';
import { countsFrom, MIN_WORKOUT_MINUTES, workoutsDue } from '@/lib/rules';
import { getWitnesses } from '@/lib/db';
import { tellOwner } from '@/lib/notify';
import { localNow, shiftDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** The phone saw its owner inside the gym geofence for long enough (DATA-6). Only the result
 *  arrives: which day, how many minutes. No location ever leaves the phone.
 *
 *  Verifies the first unverified workout scheduled that day. A visit on a day with nothing
 *  scheduled is a bonus and isn't recorded. */
export async function POST(req: Request) {
  const c = await callerWithPlan(req);
  if (c instanceof Response) return c;
  const p = c.plan;
  const b = await readJson(req);

  const today = localNow(p.timezone).date;
  const date = isDate(b.date) ? b.date : today;
  // The phone may report a visit late (no signal in the gym); the day after is still fine.
  if (date > today || date < shiftDate(today, -1)) return bad('That day has passed.');
  const minutes = Math.round(Number(b.minutes));
  if (!(minutes >= MIN_WORKOUT_MINUTES && minutes <= 600)) return bad(`A workout is at least ${MIN_WORKOUT_MINUTES} minutes at the gym.`);

  const due = workoutsDue(p, countsFrom(p, await getWitnesses(p.id)), date);
  const done = (await sql`
    select slot_id from sessions where plan_id = ${p.id} and date = ${date} and status in ('done', 'excused')
  `) as { slot_id: string }[];
  const slot = due.sort((a, b2) => a.hour - b2.hour).find((s) => !done.some((d) => d.slot_id === s.id));

  if (slot) {
    // A workout marked missed overnight is still put right by a late report from the phone.
    await sql`
      insert into sessions (plan_id, date, slot_id, status, answered_at, minutes, verified_at)
      values (${p.id}, ${date}, ${slot.id}, 'done', now(), ${minutes}, now())
      on conflict (plan_id, date, slot_id) do update
        set status = 'done', answered_at = now(), minutes = excluded.minutes, verified_at = now()
    `;
    await tellOwner(p, `${slot.label} verified: ${minutes} minutes at ${p.gym?.name ?? 'the gym'}.`, 'workout_verified', 'home', {
      slotId: slot.id,
      minutes,
    });
  }
  return planResponse(p);
}
