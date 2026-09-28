/** The escalation ladder: the actual product.
 *
 * Runs every plan forward on a schedule (DATA-4). Every step is recorded before or as it
 * happens, so running it twice in a row does nothing the second time.
 *
 *   Mornings   At 4 am local, ask for a weigh-in (DATA-7). Chase once, and only when the week is
 *              on the line; a free morning is free.
 *   Weeks      On Monday the week just ended is judged exactly once. Under the floor, and no
 *              pass: every witness hears.
 *   Workouts   Remind two hours before. Verified by GPS on the phone; not verified by the end
 *              of the day means missed. Two misses in a row: every witness hears.
 *   Mirror     Introduced at the end of the first week, then asked for each Sunday. Private:
 *              witnesses never hear about it (Q21).
 */
import { write } from './coach';
import { type PlanRow, type SessionRow, getPasses, getSessions, getWeighIns, getWitnesses, sql } from './db';
import { tellOwner, tellWitnesses } from './notify';
import { countsFrom, isPaused, missedRun, weekMath, workoutsDue } from './rules';
import { localNow, minutesSince, shiftDate, weekStart, weekdayOf } from './time';

/** Minutes before the morning chase, overridable so the loop can be rehearsed in minutes. */
const CHASE_AFTER = Number((process.env.ESCALATION_MINUTES ?? '180').split(',')[0]);

export const WEIGH_IN_HOUR = 4;
/** Last week is judged from this hour on Monday, so Sunday night still counts and there's a
 *  morning to explain a bad week to Snitch before the witnesses hear. */
const VERDICT_HOUR = 9;
const REMIND_BEFORE_HOURS = 2;

/** A compact history for the model: enough to notice a pattern, nothing identifying. */
function historyFor(weighIns: { date: string }[], sessions: SessionRow[], today: string): string {
  const lines: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = shiftDate(today, -i);
    const weighed = weighIns.some((w) => w.date === d);
    const day = sessions.filter((s) => s.date === d && s.status !== 'pending');
    lines.push(`${d}: ${weighed ? 'weighed in' : 'no weigh-in'}${day.length ? `, workout ${day.map((s) => s.status).join('/')}` : ''}`);
  }
  return lines.join('\n');
}

export async function advance(p: PlanRow): Promise<string[]> {
  const { date, hour } = localNow(p.timezone);
  const [weighIns, witnesses, passes] = await Promise.all([getWeighIns(p.id), getWitnesses(p.id), getPasses(p.id)]);
  let sessions = await getSessions(p.id);
  const start = countsFrom(p, witnesses);
  const history = historyFor(weighIns, sessions, date);
  const acted: string[] = [];
  const paused = isPaused(p, date);

  /* ── last week's verdict ───────────────────────────────────────────── */
  const lastWeek = weekStart(shiftDate(date, -7));
  if (
    start &&
    hour >= VERDICT_HOUR &&
    !p.escalated_weeks.includes(lastWeek) &&
    start <= shiftDate(lastWeek, 6)
  ) {
    const week = weekMath(p, start, weighIns, shiftDate(lastWeek, 6));
    const excused = passes.some((x) => x.kind === 'week' && x.ref === lastWeek);
    if (!week.met && !excused) {
      const names = await tellWitnesses(p, history, { kind: 'witness_week', done: week.done, required: week.required }, witnesses);
      if (names.length) {
        await tellOwner(p, await write(p, history, { kind: 'told_them', names, why: 'week' }), 'told_them');
        acted.push(`week ${lastWeek} escalated to ${names.length}`);
      }
    }
    // Recorded either way, so a week is only ever judged once (DATA-3).
    await sql`update plans set escalated_weeks = array_append(escalated_weeks, ${lastWeek}) where id = ${p.id}`;
  }

  /* ── this morning ──────────────────────────────────────────────────── */
  if (p.morning_date !== date) {
    await sql`update plans set morning_date = ${date}, morning_step = 0 where id = ${p.id}`;
    p.morning_step = 0;
  }
  const weighedToday = weighIns.some((w) => w.date === date);
  if (!paused && !weighedToday && hour >= WEIGH_IN_HOUR) {
    const week = weekMath(p, start, weighIns, date);
    if (p.morning_step === 0) {
      await sql`update plans set morning_step = 1, morning_at = now() where id = ${p.id}`;
      await tellOwner(p, await write(p, history, { kind: 'morning', week }), 'morning', 'home');
      acted.push('asked for a weigh-in');
    } else if (p.morning_step === 1 && minutesSince(p.morning_at) >= CHASE_AFTER && week.counting && !week.met && (week.noRoom || week.impossible)) {
      await sql`update plans set morning_step = 2, morning_at = now() where id = ${p.id}`;
      await tellOwner(p, await write(p, history, { kind: 'morning_chase', week }), 'morning_chase', 'home');
      acted.push('chased the weigh-in');
    }
  }

  /* ── yesterday's workouts that never got verified ─────────────────── */
  const yesterday = shiftDate(date, -1);
  for (const slot of workoutsDue(p, start, yesterday)) {
    const row = sessions.find((s) => s.date === yesterday && s.slot_id === slot.id);
    if (row && row.status !== 'pending') continue;
    await sql`
      insert into sessions (plan_id, date, slot_id, status, answered_at)
      values (${p.id}, ${yesterday}, ${slot.id}, 'missed', now())
      on conflict (plan_id, date, slot_id) do update set status = 'missed', answered_at = now()
    `;
    acted.push(`recorded ${slot.label} missed`);
    sessions = await getSessions(p.id);
    const { run } = missedRun(sessions);
    await tellOwner(p, await write(p, history, { kind: 'workout_missed', label: slot.label, run }), 'workout_missed');
  }

  /* ── today's workout reminders ─────────────────────────────────────── */
  for (const slot of workoutsDue(p, start, date)) {
    if (hour < slot.hour - REMIND_BEFORE_HOURS) continue;
    const row = sessions.find((s) => s.date === date && s.slot_id === slot.id);
    if (row) continue; // reminded already, or already verified
    await sql`
      insert into sessions (plan_id, date, slot_id, status, asked_step, asked_at)
      values (${p.id}, ${date}, ${slot.id}, 'pending', 1, now())
      on conflict do nothing
    `;
    await tellOwner(
      p,
      await write(p, history, { kind: 'workout_reminder', label: slot.label, gym: p.gym?.name ?? 'the gym', hour: slot.hour }),
      'workout_reminder',
      'home',
    );
    acted.push(`reminded about ${slot.label}`);
  }

  /* ── a run of missed workouts ──────────────────────────────────────── */
  const { run, latest } = missedRun(sessions);
  if (run >= 2 && latest && !latest.escalated_at) {
    // Marked first: a witness told twice about the same run is the bug this ordering prevents.
    await sql`
      update sessions set escalated_at = now()
       where plan_id = ${p.id} and date = ${latest.date} and slot_id = ${latest.slot_id}
    `;
    const names = await tellWitnesses(p, history, { kind: 'witness_workouts', missed: run }, witnesses);
    if (names.length) {
      await tellOwner(p, await write(p, history, { kind: 'told_them', names, why: 'workouts' }), 'told_them');
      acted.push(`escalated ${run} missed workouts to ${names.length}`);
    }
  }

  /* ── the mirror photo, Sundays ─────────────────────────────────────── */
  const thisWeek = weekStart(date);
  if (start && weekdayOf(date) === 0 && hour >= 17 && p.mirror_asked_week !== thisWeek && start < thisWeek) {
    const first = !p.mirror_asked_week;
    await sql`update plans set mirror_asked_week = ${thisWeek} where id = ${p.id}`;
    await tellOwner(p, await write(p, history, { kind: first ? 'mirror_intro' : 'mirror_weekly' }), 'mirror', 'home');
    acted.push('asked for the mirror photo');
  }

  return acted;
}
