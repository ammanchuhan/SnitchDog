import { bearer, revokeToken } from '@/lib/auth';
import { open } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export const POST = open(async (req) => {
  const token = bearer(req);
  if (token) await revokeToken(token);
  // Always ok: signing out must never fail in a way that leaves someone stuck signed in.
  return Response.json({ ok: true });
}, LIMITS.provider);
