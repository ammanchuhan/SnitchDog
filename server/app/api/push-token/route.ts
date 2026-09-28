import { accountFor, unauthorized } from '@/lib/auth';
import { sql } from '@/lib/db';
import { bad, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

const EXPO_TOKEN = /^ExponentPushToken\[[\w-]+\]$/;

/** The phone's Expo push token, so Snitch's messages arrive while the app is closed. */
export async function POST(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();
  const { token } = await readJson(req);
  if (typeof token !== 'string' || !EXPO_TOKEN.test(token)) return bad('Not a push token.');
  // A phone that changes hands moves to the new account.
  await sql`
    insert into push_tokens (token, account_id) values (${token}, ${account.id})
    on conflict (token) do update set account_id = excluded.account_id
  `;
  return Response.json({ ok: true });
}

/** Signing out stops pushes to this phone. */
export async function DELETE(req: Request) {
  const account = await accountFor(req);
  if (!account) return unauthorized();
  const { token } = await readJson(req);
  await sql`delete from push_tokens where token = ${String(token ?? '')} and account_id = ${account.id}`;
  return Response.json({ ok: true });
}
