import { findByEmail, issueToken, verifyPassword } from '@/lib/auth';
import { open } from '@/lib/http';
import { hit, LIMITS, tooMany } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export const POST = open(async (req) => {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string') {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // Per address too, so one account can't be guessed at from many IPs.
  const wait = await hit(LIMITS.loginEmail, email.trim().toLowerCase());
  if (wait) return tooMany(wait);

  const account = await findByEmail(email);
  // One message for both cases, so this endpoint cannot be used to enumerate accounts.
  const ok = account && (await verifyPassword(password, account.password_hash));
  if (!ok) return Response.json({ error: 'That email and password do not match.' }, { status: 401 });

  return Response.json({ token: await issueToken(account.id), accountId: account.id });
}, LIMITS.login);
