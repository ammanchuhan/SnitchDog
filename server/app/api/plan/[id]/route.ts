import { accountFor, ownsPlan, unauthorized } from '@/lib/auth';
import { getPlan, sql } from '@/lib/db';
import { serialisePlan } from '@/lib/serialise';

export const dynamic = 'force-dynamic';

/** What the app pulls back: the parts only the server knows. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await accountFor(req);
  if (!account) return unauthorized();

  const { id } = await params;
  // 404 rather than 403 for a plan that is not theirs: whether an id exists is not their business.
  if (!(await ownsPlan(account.id, id))) return new Response('not found', { status: 404 });

  const p = await getPlan(id);
  if (!p) return new Response('not found', { status: 404 });

  return Response.json(await serialisePlan(p));
}

/** Erasure. Cascades to weigh-ins and sessions, and unlinks both chats by removing the row. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await accountFor(req);
  if (!account) return unauthorized();

  const { id } = await params;
  await sql`delete from plans where id = ${id} and account_id = ${account.id}`;
  return Response.json({ ok: true });
}
