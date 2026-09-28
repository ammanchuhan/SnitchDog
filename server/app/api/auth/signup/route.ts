import { createAccount, findByEmail, hashPassword, issueToken, MIN_PASSWORD, normaliseEmail } from '@/lib/auth';
import { open } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = open(async (req) => {
  const { email, password } = await req.json().catch(() => ({}));

  if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
    return Response.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return Response.json(
      { error: `Pick a password of at least ${MIN_PASSWORD} characters.` },
      { status: 400 },
    );
  }
  if (await findByEmail(email)) {
    // Deliberately explicit: hiding this only moves the disclosure to the login screen, and a
    // person who mistyped their address deserves to be told.
    return Response.json({ error: 'There is already an account with that email.' }, { status: 409 });
  }

  const account = await createAccount({
    email: normaliseEmail(email),
    passwordHash: await hashPassword(password),
  });
  return Response.json({ token: await issueToken(account.id), accountId: account.id });
}, LIMITS.signup);
