import { bearer, revokeToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = bearer(req);
  if (token) await revokeToken(token);
  // Always ok: signing out must never fail in a way that leaves someone stuck signed in.
  return Response.json({ ok: true });
}
