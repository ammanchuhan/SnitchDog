import { callerWithPlan, readJson } from '@/lib/http';
import { forget, getMemories } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/** What Snitch remembers, and the ability to take any of it back (PROF-5). */
export async function GET(req: Request) {
  const c = await callerWithPlan(req);
  if (c instanceof Response) return c;
  return Response.json({ memories: await getMemories(c.plan.id) });
}

export async function DELETE(req: Request) {
  const c = await callerWithPlan(req);
  if (c instanceof Response) return c;
  const { id } = await readJson(req);
  if (!id) return new Response('bad request', { status: 400 });
  await forget(c.plan.id, String(id));
  return Response.json({ ok: true });
}
