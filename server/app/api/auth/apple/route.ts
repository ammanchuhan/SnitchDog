import { EmailTakenError, issueToken, linkOrCreate, verifyAppleToken } from '@/lib/auth';
import { open } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/** Sign in with Apple. The client sends the identity token; we verify it against Apple's keys
 *  rather than trusting anything the client claims about who it is. */
export const POST = open(async (req) => {
  const { identityToken, email: clientEmail } = await req.json().catch(() => ({}));
  if (typeof identityToken !== 'string' || !identityToken) {
    return Response.json({ error: 'Missing identity token.' }, { status: 400 });
  }

  let sub: string;
  let tokenEmail: string | null;
  try {
    ({ sub, email: tokenEmail } = await verifyAppleToken(identityToken));
  } catch (err) {
    console.error('[auth/apple]', err);
    return Response.json({ error: 'Apple could not verify that sign-in.' }, { status: 401 });
  }

  // Apple sends the email on the first sign-in only, so the client forwards its copy as a
  // fallback. It is only ever used to find an account the same person already made.
  const email = tokenEmail ?? (typeof clientEmail === 'string' ? clientEmail : null);

  let account;
  try {
    account = await linkOrCreate('apple', sub, email);
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return Response.json(
        { error: 'There is already a password account with that email. Sign in with it instead.' },
        { status: 409 },
      );
    }
    throw err;
  }
  return Response.json({ token: await issueToken(account.id), accountId: account.id });
}, LIMITS.provider);
