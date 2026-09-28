import { authed, readJson } from '@/lib/http';
import { forget, getMemories } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/** What Snitch remembers, and the ability to take any of it back (PROF-5). */
export const GET = authed(async (req, c) => {
  return Response.json({ memories: await getMemories(c.plan.id) });
});

export const DELETE = authed(async (req, c) => {
  const { id } = await readJson(req);
  if (!id) return new Response('bad request', { status: 400 });
  await forget(c.plan.id, String(id));
  return Response.json({ ok: true });
});
