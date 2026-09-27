import { findByEmail, issueToken, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string') {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const account = await findByEmail(email);
  // One message for both cases, so this endpoint cannot be used to enumerate accounts.
  const ok = account && (await verifyPassword(password, account.password_hash));
  if (!ok) return Response.json({ error: 'That email and password do not match.' }, { status: 401 });

  return Response.json({ token: await issueToken(account.id), accountId: account.id });
}
