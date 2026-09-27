import { type PlanRow, getSessions, getWeighIns } from './db';

/** The shape the app expects back: everything it knows, plus the fields only the server owns.
 *
 * Shared by `GET /api/plan` (the account's plan, used to restore a device) and
 * `GET /api/plan/:id`, so the two can never drift into returning different shapes. */
export async function serialisePlan(p: PlanRow) {
  const [weighIns, sessions] = await Promise.all([getWeighIns(p.id), getSessions(p.id)]);

  return {
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
    weighIns: weighIns.map((w) => ({
      date: w.date,
      value: Number(w.value),
      loggedAt: w.logged_at,
      proof: w.proof ?? undefined,
    })),
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
  };
}
