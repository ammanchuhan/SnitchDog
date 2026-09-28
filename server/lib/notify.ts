/** Where Snitch's messages go.
 *
 * The owner hears from Snitch only in the app: every message lands in the chat and arrives as a
 * push (COACH-2). Witnesses hear only on Telegram, each on their own, and none is told who the
 * others are (TG-2).
 */
import { write, type Moment } from './coach';
import { type PlanRow, type WitnessRow, getWitnesses, isWatching, sql, witnessName } from './db';
import { pushTo, type PushData } from './push';
import { send } from './telegram';
import { localNow } from './time';

/** Most app-authored messages a plan's witnesses get in a day (TG-4). Leaving messages (the
 *  account was deleted, or the goal was reached) always go: there's nothing after them. */
const DAILY_CAP = 3;
const UNCAPPED = new Set<Moment['kind']>(['witness_ended', 'witness_finished']);

/** Counts one message against today's cap; false when the cap is already reached. */
async function underCap(p: PlanRow): Promise<boolean> {
  const { date } = localNow(p.timezone);
  const rows = (await sql`
    insert into witness_sends (plan_id, day, sent) values (${p.id}, ${date}, 1)
    on conflict (plan_id, day) do update set sent = witness_sends.sent + 1
    returning sent
  `) as { sent: number }[];
  return rows[0].sent <= DAILY_CAP;
}

export async function tellOwner(
  p: PlanRow,
  text: string,
  kind: string,
  tab: PushData['tab'] = 'coach',
  data?: unknown,
) {
  await sql`
    insert into coach_messages (plan_id, role, text, kind, data)
    values (${p.id}, 'coach', ${text}, ${kind}, ${data ? JSON.stringify(data) : null})
  `;
  if (p.account_id) await pushTo(p.account_id, text, { tab });
}

/** Sends one app-authored message to every watching witness. Returns who was told. */
export async function tellWitnesses(
  p: PlanRow,
  history: string,
  m: Moment,
  witnesses?: WitnessRow[],
): Promise<string[]> {
  const watching = (witnesses ?? (await getWitnesses(p.id))).filter(isWatching);
  if (!watching.length) return [];
  if (!UNCAPPED.has(m.kind) && !(await underCap(p))) {
    console.warn('[notify] daily witness cap reached', p.id);
    return [];
  }
  const text = await write(p, history, m);
  const told: string[] = [];
  for (const w of watching) {
    if (await send(w.chat_id!, text)) told.push(witnessName(w));
  }
  return told;
}
