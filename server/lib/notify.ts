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
  const text = await write(p, history, m);
  const told: string[] = [];
  for (const w of watching) {
    if (await send(w.chat_id!, text)) told.push(witnessName(w));
  }
  return told;
}
