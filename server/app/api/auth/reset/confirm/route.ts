import { timingSafeEqual } from 'node:crypto';

import { findByEmail, hashPassword, issueToken, MIN_PASSWORD, resetCodeHash } from '@/lib/auth';
import { sql } from '@/lib/db';
import { readJson, open } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;
const WRONG = Response.json({ error: 'That code isn’t right, or it has expired.' }, { status: 400 });

/** Finish a password reset: the code, then a new password. Every other device is signed out,
 *  and this one is signed in (AUTH-8). */
export const POST = open(async (req) => {
  const { email, code, password } = await readJson(req);
  if (typeof email !== 'string' || typeof code !== 'string') return WRONG;

  const account = await findByEmail(email);
  if (!account) return WRONG;
  const row = ((await sql`
    update password_resets set attempts = attempts + 1
     where account_id = ${account.id} and expires_at > now()
    returning code_hash, attempts
  `)[0] as { code_hash: string; attempts: number }) ?? null;
  if (!row || row.attempts > MAX_ATTEMPTS) return WRONG;

  const given = Buffer.from(resetCodeHash(account.id, code.trim()));
  if (!timingSafeEqual(given, Buffer.from(row.code_hash))) return WRONG;

  // The code is right; only now does the password matter. A short one doesn't spend the code.
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    await sql`update password_resets set attempts = attempts - 1 where account_id = ${account.id}`;
    return Response.json({ error: `Pick a password of at least ${MIN_PASSWORD} characters.` }, { status: 400 });
  }

  await sql`update accounts set password_hash = ${await hashPassword(password)} where id = ${account.id}`;
  await sql`delete from password_resets where account_id = ${account.id}`;
  await sql`delete from auth_tokens where account_id = ${account.id}`;
  return Response.json({ token: await issueToken(account.id), accountId: account.id });
}, LIMITS.resetConfirm);
