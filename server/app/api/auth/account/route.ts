import { accountFor, unauthorized } from '@/lib/auth';
import { write } from '@/lib/coach';
import { PlanRow, getWeighIns, sql } from '@/lib/db';
import { send } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/** Did they get where they were going?
 *
 *  Measured on an average rather than a single reading, for the same reason the app's progress
 *  bar is: weight swings pounds on water alone, and one good morning is not an arrival.
 *  ⚠️ This is a third hand-written copy of a rule the client also owns (see spec §4) — if the
 *  app tells someone they finished and this tells their witness they quit, that is the bug. */
function reachedTarget(p: PlanRow, weighIns: { date: string; value: string }[]): boolean {
  if (!weighIns.length) return false;

  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const recent = weighIns.filter((w) => w.date >= cutoff).map((w) => Number(w.value));
  const values = recent.length ? recent : [Number(weighIns[weighIns.length - 1].value)];
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  const start = Number(p.start_value);
  const target = Number(p.target_value);
  // Losing and gaining are both valid directions; 'reached' means crossed, either way.
  return target <= start ? average <= target : average >= target;
}

/** Erasure, for real. Apple requires in-app account deletion (Guideline 5.1.1) and it is the
 *  right default regardless.
 *
 *  The witness is told first, while their chat id still exists. They agreed to watch someone,
 *  so they are owed an ending — §8.1 gives them a `/stop` that tells the owner, and this is the
 *  same courtesy pointing the other way. The message is app-authored, says nothing about any
 *  number, and asks nothing of them, because there is nothing left to check in on.
 *
 *  Then one delete does the rest: plans cascade from accounts, and weigh-ins, sessions, coach
 *  messages and coach memories all cascade from plans. Removing the plan row is also what
 *  unlinks both Telegram chats. Auth tokens cascade too, which signs out every device. */
export async function DELETE(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();

  const plans = (await sql`select * from plans where account_id = ${account.id}`) as PlanRow[];

  for (const plan of plans) {
    if (!plan.witness_chat_id) continue;
    try {
      const weighIns = (await getWeighIns(plan.id)) as { date: string; value: string }[];
      const kind = reachedTarget(plan, weighIns) ? 'witness_finished' : 'witness_ended';
      await send(plan.witness_chat_id, await write(plan, '', { kind }));
    } catch (err) {
      // A witness who cannot be reached must never block someone from deleting their data.
      console.error('[auth/account] witness notice failed', plan.id, err);
    }
  }

  await sql`delete from accounts where id = ${account.id}`;
  return Response.json({ ok: true });
}
