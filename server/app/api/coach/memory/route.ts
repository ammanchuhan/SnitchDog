import { forget, getMemories } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/** What the coach remembers, and the ability to take any of it back. */
export async function GET(req: Request) {
  const planId = new URL(req.url).searchParams.get('plan');
  if (!planId) return new Response('plan required', { status: 400 });
  return Response.json({ memories: await getMemories(planId) });
}

export async function DELETE(req: Request) {
  const { planId, id } = await req.json();
  if (!planId || !id) return new Response('bad request', { status: 400 });
  await forget(planId, id);
  return Response.json({ ok: true });
}
