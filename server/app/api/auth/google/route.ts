import { EmailTakenError, issueToken, linkOrCreate, verifyGoogleToken } from '@/lib/auth';
import { open } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/** Sign in with Google. The client sends the ID token; we verify it against Google's published
 *  keys and against our own client ids, so a token minted for some other app is refused. */
export const POST = open(async (req) => {
  const { idToken } = await req.json().catch(() => ({}));
  if (typeof idToken !== 'string' || !idToken) {
    return Response.json({ error: 'Missing ID token.' }, { status: 400 });
  }

  let sub: string;
  let email: string | null;
  try {
    ({ sub, email } = await verifyGoogleToken(idToken));
  } catch (err) {
    console.error('[auth/google]', err);
    return Response.json({ error: 'Google could not verify that sign-in.' }, { status: 401 });
  }

  let account;
  try {
    account = await linkOrCreate('google', sub, email);
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
