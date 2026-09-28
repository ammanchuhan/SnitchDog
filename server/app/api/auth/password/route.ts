import { accountFor, hashPassword, MIN_PASSWORD, unauthorized, verifyPassword } from '@/lib/auth';
import { sql } from '@/lib/db';
import { bad, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Change password from Profile › Account and data (PROF-8). Needs the current one. */
export async function POST(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();
  const { current, next } = await readJson(req);
  const row = (await sql`select password_hash from accounts where id = ${account.id}`)[0] as { password_hash: string | null };
  if (!row?.password_hash) return bad('You signed up with Apple, so there’s no password to change.');
  if (typeof current !== 'string' || !(await verifyPassword(current, row.password_hash))) return bad('That isn’t your current password.');
  if (typeof next !== 'string' || next.length < MIN_PASSWORD) return bad(`Pick a password of at least ${MIN_PASSWORD} characters.`);
  await sql`update accounts set password_hash = ${await hashPassword(next)} where id = ${account.id}`;
  return Response.json({ ok: true });
}
