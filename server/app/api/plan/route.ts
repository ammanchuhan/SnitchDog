import { accountFor, unauthorized } from '@/lib/auth';
import { type PlanRow, sql } from '@/lib/db';
import { serialisePlan } from '@/lib/serialise';

export const dynamic = 'force-dynamic';

/** The signed-in account's plan, without needing to know its id.
 *
 *  This is what makes an account worth having: sign in on a new phone, or after signing out,
 *  and there is something to come back to. Without it the app can only ever find a plan it
 *  already had on the device, and signing in drops you into onboarding as if you were new. */
export async function GET(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();

  const rows = (await sql`
    select * from plans where account_id = ${account.id} order by created_at limit 1
  `) as PlanRow[];
  if (!rows.length) return new Response('no plan', { status: 404 });

  return Response.json(await serialisePlan(rows[0]));
}

/** The app pushes the whole plan on every change. The server keeps its own columns — who has
 *  been told, who is linked, how far a follow-up has gone — and never lets the client
 *  overwrite them. The caller must own the plan: an id alone is not authorization. */
export async function PUT(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();

  const p = await req.json();
  if (!p?.id || !p?.witness?.inviteToken || !p?.goal) {
    return new Response('bad plan', { status: 400 });
  }

  // An existing plan belonging to someone else is not ours to overwrite. A plan with no
  // account_id predates accounts; there are none in production, but claiming one silently
  // would be the wrong default, so it is refused too.
  const owner = (await sql`select account_id from plans where id = ${p.id}`) as {
    account_id: string | null;
  }[];
  if (owner.length && owner[0].account_id !== account.id) {
    return new Response('forbidden', { status: 403 });
  }

  await sql`
    insert into plans
      (id, account_id, owner_name, timezone, created_at, unit, start_value, target_value,
       wake_hour, per_week, routine, witness_name, witness_token)
    values
      (${p.id}, ${account.id}, ${p.ownerName ?? ''}, ${p.timezone}, ${p.createdAt}, ${p.goal.unit},
       ${p.goal.start}, ${p.goal.target}, ${p.goal.wakeHour}, ${p.goal.perWeek},
       ${JSON.stringify(p.routine ?? [])}, ${p.witness.name}, ${p.witness.inviteToken})
    on conflict (id) do update
      set owner_name   = excluded.owner_name,
          timezone     = excluded.timezone,
          unit         = excluded.unit,
          start_value  = excluded.start_value,
          target_value = excluded.target_value,
          wake_hour    = excluded.wake_hour,
          per_week     = excluded.per_week,
          routine      = excluded.routine,
          witness_name = excluded.witness_name,
          -- A new invite token means a new witness: the old one stops being watched.
          witness_token   = excluded.witness_token,
          witness_chat_id = case when plans.witness_token = excluded.witness_token
                                 then plans.witness_chat_id else null end,
          witness_linked_at = case when plans.witness_token = excluded.witness_token
                                   then plans.witness_linked_at else null end
  `;

  for (const w of p.weighIns ?? []) {
    await sql`
      insert into weigh_ins (plan_id, date, value, logged_at, proof)
      values (${p.id}, ${w.date}, ${w.value}, ${w.loggedAt ?? new Date().toISOString()}, ${w.proof ?? null})
      on conflict (plan_id, date) do update
        set value = excluded.value, logged_at = excluded.logged_at,
            proof = coalesce(excluded.proof, weigh_ins.proof)
    `;
  }

  for (const s of p.sessions ?? []) {
    await sql`
      insert into sessions (plan_id, date, slot_id, status, answered_at)
      values (${p.id}, ${s.date}, ${s.slotId}, ${s.status}, ${s.answeredAt ?? null})
      on conflict (plan_id, date, slot_id) do update
        set status = excluded.status, answered_at = excluded.answered_at
    `;
  }

  return Response.json({ ok: true });
}
