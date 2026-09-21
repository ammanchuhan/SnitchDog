/** The escalation ladder — the actual product.
 *
 * Two streams, graded differently because they fail differently:
 *
 *   Mornings   Ask at their wake hour, chase once, then let it go. A missed morning costs
 *              nothing on its own. When the week closes under the floor, the witness hears.
 *   Sessions   Ask when a scheduled session is due, chase once, then record it missed. Two
 *              missed sessions in a row and the witness hears.
 *
 * The gaps are configurable so the loop can be demonstrated in minutes instead of a day.
 */
import { write } from './coach';
import { PlanRow, SessionRow, getSessions, getWeighIns, sql } from './db';
import { send } from './telegram';
import { createdDate, daysLeftInWeek, localNow, minutesSince, shiftDate, weekStart, weekdayOf } from './time';

const GAPS = (process.env.ESCALATION_MINUTES ?? '120,120,120')
  .split(',')
  .map((n) => Number(n.trim()));

const answerButtons = (date: string, slotId: string) => [
  { text: 'Did it', data: `s|${date}|${slotId}|done` },
  { text: 'Missed it', data: `s|${date}|${slotId}|missed` },
];

/** The floor for a week. The week a plan was created in is pro-rated to the mornings that
 *  were actually available — starting on a Saturday should not mean failing week one. */
export function requiredInWeek(p: PlanRow, date: string): number {
  const created = createdDate(p.created_at, p.timezone);
  if (weekStart(date) !== weekStart(created)) return p.per_week;
  return Math.min(p.per_week, daysLeftInWeek(created));
}

const slotsOn = (p: PlanRow, date: string) =>
  p.routine.filter((s) => s.days.includes(weekdayOf(date)));

/** A compact history for the coach: enough to notice a pattern, nothing identifying. */
function historyFor(weighIns: { date: string }[], sessions: SessionRow[], today: string): string {
  const lines: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = shiftDate(today, -i);
    const weighed = weighIns.some((w) => w.date === d);
    const day = sessions.filter((s) => s.date === d && s.status !== 'pending');
    lines.push(
      `${d}: ${weighed ? 'weighed in' : 'no weigh-in'}${
        day.length ? `, ${day.map((s) => s.status).join('/')} session` : ''
      }`,
    );
  }
  return lines.join('\n');
}

async function markWeekEscalated(p: PlanRow, week: string) {
  await sql`update plans set escalated_weeks = array_append(escalated_weeks, ${week}) where id = ${p.id}`;
}

/** Runs one plan forward. Called on a schedule; safe to call as often as you like. */
export async function advance(p: PlanRow): Promise<string[]> {
  const { date, hour } = localNow(p.timezone);
  const weighIns = await getWeighIns(p.id);
  const sessions = await getSessions(p.id);
  const history = historyFor(weighIns, sessions, date);
  const acted: string[] = [];

  if (!p.owner_chat_id) return acted; // nobody to ask yet

  /* ── last week's verdict ───────────────────────────────────────────── */
  const lastWeek = weekStart(shiftDate(date, -7));
  if (
    weekStart(date) !== lastWeek &&
    !p.escalated_weeks.includes(lastWeek) &&
    createdDate(p.created_at, p.timezone) <= shiftDate(lastWeek, 6)
  ) {
    const done = weighIns.filter((w) => weekStart(w.date) === lastWeek).length;
    const required = requiredInWeek(p, lastWeek);
    if (done < required) {
      if (p.witness_chat_id) {
        await send(p.witness_chat_id, await write(p, history, { kind: 'witness_week', done, required }));
        await send(p.owner_chat_id, await write(p, history, { kind: 'told_them' }));
        acted.push(`week ${lastWeek} escalated (${done}/${required})`);
      } else {
        acted.push(`week ${lastWeek} short, no witness linked`);
      }
    }
    // Recorded either way, so a week is only ever judged once.
    await markWeekEscalated(p, lastWeek);
  }

  /* ── this morning ──────────────────────────────────────────────────── */
  const weighedToday = weighIns.some((w) => w.date === date);
  const step = p.morning_date === date ? p.morning_step : 0;
  if (p.morning_date !== date) {
    await sql`update plans set morning_date = ${date}, morning_step = 0 where id = ${p.id}`;
  }

  if (!weighedToday && hour >= p.wake_hour) {
    const done = weighIns.filter((w) => weekStart(w.date) === weekStart(date)).length;
    const required = requiredInWeek(p, date);
    const left = daysLeftInWeek(date);
    const waited = minutesSince(p.morning_at);

    if (step === 0) {
      await send(p.owner_chat_id, await write(p, history, { kind: 'morning', done, required, left }));
      await sql`update plans set morning_step = 1, morning_at = now(), morning_date = ${date} where id = ${p.id}`;
      acted.push('asked for a weigh-in');
    } else if (step === 1 && waited >= GAPS[0] && required - done >= left) {
      // Only chase when the week is actually on the line. Otherwise a missed morning is free,
      // and nagging about a free morning is how people learn to ignore you.
      await send(p.owner_chat_id, await write(p, history, { kind: 'morning_chase', done, required, left }));
      await sql`update plans set morning_step = 2, morning_at = now() where id = ${p.id}`;
      acted.push('chased the weigh-in');
    }
  }

  /* ── today's sessions ──────────────────────────────────────────────── */
  for (const slot of slotsOn(p, date)) {
    if (hour < slot.hour) continue;
    const row = sessions.find((s) => s.date === date && s.slot_id === slot.id);
    if (row && row.status !== 'pending') continue;

    const waited = minutesSince(row?.asked_at ?? null);
    const askedStep = row?.asked_step ?? 0;

    if (askedStep === 0) {
      await send(
        p.owner_chat_id,
        await write(p, history, { kind: 'session', label: slot.label }),
        answerButtons(date, slot.id),
      );
      await sql`
        insert into sessions (plan_id, date, slot_id, status, asked_step, asked_at)
        values (${p.id}, ${date}, ${slot.id}, 'pending', 1, now())
        on conflict (plan_id, date, slot_id) do update set asked_step = 1, asked_at = now()
      `;
      acted.push(`asked about ${slot.label}`);
    } else if (askedStep === 1 && waited >= GAPS[1]) {
      await send(
        p.owner_chat_id,
        await write(p, history, { kind: 'session_chase', label: slot.label }),
        answerButtons(date, slot.id),
      );
      await sql`
        update sessions set asked_step = 2, asked_at = now()
         where plan_id = ${p.id} and date = ${date} and slot_id = ${slot.id}
      `;
      acted.push(`chased ${slot.label}`);
    } else if (askedStep === 2 && waited >= GAPS[2]) {
      await sql`
        update sessions set status = 'missed', asked_step = 3
         where plan_id = ${p.id} and date = ${date} and slot_id = ${slot.id}
      `;
      acted.push(`recorded ${slot.label} missed`);
    }
  }

  /* ── a run of missed sessions ──────────────────────────────────────── */
  const answered = (await getSessions(p.id))
    .filter((s) => s.status !== 'pending')
    .sort((a, b) => b.date.localeCompare(a.date));
  let run = 0;
  for (const s of answered) {
    if (s.status === 'missed') run += 1;
    else break;
  }
  const latest = answered[0];
  if (run >= 2 && latest && !latest.escalated_at && p.witness_chat_id) {
    await send(p.witness_chat_id, await write(p, history, { kind: 'witness_sessions', missed: run }));
    await send(p.owner_chat_id, await write(p, history, { kind: 'told_them' }));
    await sql`
      update sessions set escalated_at = now()
       where plan_id = ${p.id} and date = ${latest.date} and slot_id = ${latest.slot_id}
    `;
    acted.push(`escalated ${run} missed sessions`);
  }

  return acted;
}
