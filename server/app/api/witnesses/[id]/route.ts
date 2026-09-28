import { randomBytes } from 'node:crypto';

import { type WitnessRow, getWeighIns, getWitnesses, isWatching, sql } from '@/lib/db';
import { authed, bad, type CallerWithPlan, planResponse, readJson } from '@/lib/http';
import { tellWitnesses } from '@/lib/notify';
import { reachedTarget } from '@/lib/rules';
import { send } from '@/lib/telegram';
import { write } from '@/lib/coach';
import { localNow } from '@/lib/time';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<Record<string, string>> };

async function find(c: CallerWithPlan, ctx: Ctx) {
  const { id } = await ctx.params;
  const witnesses = await getWitnesses(c.plan.id);
  const w = witnesses.find((x) => x.id === id && !x.removed_at);
  if (!w) return new Response('not found', { status: 404 });
  return { ...c, w, witnesses };
}

/** The owner's name for a witness, sent once they've accepted (WIT-8); or a fresh invite link
 *  for one whose invite expired (TG-5). */
export const PATCH = authed(async (req, c, ctx) => {
  const f = await find(c, ctx);
  if (f instanceof Response) return f;
  const b = await readJson(req);

  if (typeof b.name === 'string') {
    if (!f.w.linked_at) return bad('Names are kept on the phone until they accept.');
    await sql`update witnesses set name = ${b.name.trim().slice(0, 40)} where id = ${f.w.id}`;
  }
  if (b.renew === true) {
    if (f.w.linked_at) return bad('They already accepted.');
    await sql`
      update witnesses set token = ${randomBytes(12).toString('base64url')}, expires_at = now() + interval '14 days'
       where id = ${f.w.id}
    `;
  }
  return planResponse(f.plan);
});

/** Remove a witness (WIT-6, P4). An invite nobody accepted is just withdrawn. Removing someone
 *  who's watching tells every watching witness, the removed one included, unless the owner has
 *  reached their goal, in which case the removed witness is told that instead. */
export const DELETE = authed(async (_req, c, ctx) => {
  const f = await find(c, ctx);
  if (f instanceof Response) return f;
  const { plan, w, witnesses } = f;

  if (isWatching(w)) {
    const today = localNow(plan.timezone).date;
    if (reachedTarget(plan, await getWeighIns(plan.id), today)) {
      await send(w.chat_id!, await write(plan, '', { kind: 'witness_finished' }));
    } else {
      await tellWitnesses(plan, '', { kind: 'witness_removed' }, witnesses as WitnessRow[]);
    }
  }
  await sql`update witnesses set removed_at = now() where id = ${w.id}`;
  return planResponse(plan);
});
