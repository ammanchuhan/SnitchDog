import { randomInt } from 'node:crypto';

import { findByEmail, resetCodeHash } from '@/lib/auth';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

const SENT = { ok: true, message: 'If there’s an account for that email, we’ve sent a code.' };

/** Start a password reset (AUTH-8). The answer is the same whether or not the account exists,
 *  so this can't be used to find out who has one. An Apple-only account gets an email saying
 *  so instead of a code (AUTH-10). */
export async function POST(req: Request) {
  const { email } = await readJson(req);
  if (typeof email !== 'string' || !email.includes('@')) return Response.json(SENT);

  const account = await findByEmail(email);
  if (!account) return Response.json(SENT);

  if (!account.password_hash) {
    await sendEmail(
      account.email!,
      'Signing in to SnitchDog',
      'Someone asked to reset the password for this email on SnitchDog.\n\nYou signed up with Apple, so there’s no password to reset: use “Sign in with Apple” in the app.\n\nIf this wasn’t you, ignore this email.',
    );
    return Response.json(SENT);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await sql`
    insert into password_resets (account_id, code_hash, expires_at, attempts)
    values (${account.id}, ${resetCodeHash(account.id, code)}, now() + interval '15 minutes', 0)
    on conflict (account_id) do update
      set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0
  `;
  await sendEmail(
    account.email!,
    `${code} is your SnitchDog code`,
    `Your code to reset your SnitchDog password is ${code}.\n\nIt works for 15 minutes.\n\nIf this wasn’t you, ignore this email; your password hasn’t changed.`,
  );
  return Response.json(SENT);
}
