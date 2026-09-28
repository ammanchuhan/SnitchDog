import { randomBytes } from 'node:crypto';

import { getWitnesses, sql } from '@/lib/db';
import { bad, callerWithPlan, planResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const MAX_WITNESSES = 3;
const token = () => randomBytes(12).toString('base64url');

/** Add a witness (WIT-5). Needs no confirmation and tells nobody. The name stays on the phone. */
export async function POST(req: Request) {
  const c = await callerWithPlan(req);
  if (c instanceof Response) return c;
  const current = (await getWitnesses(c.plan.id)).filter((w) => !w.removed_at && !w.stopped_at);
  if (current.length >= MAX_WITNESSES) return bad(`Up to ${MAX_WITNESSES} witnesses.`);
  await sql`insert into witnesses (id, plan_id, token) values (${token()}, ${c.plan.id}, ${token()})`;
  return planResponse(c.plan);
}
