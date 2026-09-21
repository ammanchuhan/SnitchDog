import { getPlan, getSessions, getWeighIns, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** What the app pulls back: the parts only the server knows. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPlan(id);
  if (!p) return new Response('not found', { status: 404 });

  const [weighIns, sessions] = await Promise.all([getWeighIns(id), getSessions(id)]);

  return Response.json({
    id: p.id,
    ownerName: p.owner_name,
    timezone: p.timezone,
    createdAt: p.created_at,
    goal: {
      unit: p.unit,
      start: Number(p.start_value),
      target: Number(p.target_value),
      wakeHour: p.wake_hour,
      perWeek: p.per_week,
    },
    routine: p.routine,
    ownerChatId: p.owner_chat_id ?? undefined,
    escalatedWeeks: p.escalated_weeks,
    witness: {
      name: p.witness_name,
      linked: !!p.witness_chat_id,
      linkedAt: p.witness_linked_at ?? undefined,
      inviteToken: p.witness_token,
    },
    weighIns: weighIns.map((w) => ({ date: w.date, value: Number(w.value), loggedAt: w.logged_at })),
    // 'pending' rows are follow-up bookkeeping, not answers — the app never sees them.
    sessions: sessions
      .filter((s) => s.status !== 'pending')
      .map((s) => ({
        date: s.date,
        slotId: s.slot_id,
        status: s.status,
        answeredAt: s.answered_at ?? undefined,
        escalatedAt: s.escalated_at ?? undefined,
      })),
  });
}

/** Erasure. Cascades to weigh-ins and sessions, and unlinks both chats by removing the row. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`delete from plans where id = ${id}`;
  return Response.json({ ok: true });
}
