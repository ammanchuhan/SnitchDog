import { accountFor, unauthorized } from '@/lib/auth';
import { planForAccount, getWeighIns, sql } from '@/lib/db';
import { tellWitnesses } from '@/lib/notify';
import { reachedTarget } from '@/lib/rules';
import { localNow } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Delete the account (PROF-10, P4, DATA-8). Apple requires in-app deletion (5.1.1).
 *
 *  Every watching witness is told first, while their chat ids still exist: that the owner gave
 *  up, or, if they reached their goal, that they made it. Then one delete does the rest: plans,
 *  witnesses, weigh-ins, workouts, chat, memories, push tokens and sessions all cascade from the
 *  account, which also signs out every device. */
export async function DELETE(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();

  const plan = await planForAccount(account.id);
  if (plan) {
    try {
      const today = localNow(plan.timezone).date;
      const kind = reachedTarget(plan, await getWeighIns(plan.id), today) ? 'witness_finished' : 'witness_ended';
      await tellWitnesses(plan, '', { kind });
    } catch (err) {
      // A witness who can't be reached must never block someone from deleting their data.
      console.error('[auth/account] witness notice failed', plan.id);
    }
  }

  await sql`delete from accounts where id = ${account.id}`;
  return Response.json({ ok: true });
}
