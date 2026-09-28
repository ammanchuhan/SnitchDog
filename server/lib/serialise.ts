import { type PlanRow, type WitnessRow, getPasses, getSessions, getSteps, getWeighIns, getWitnesses, isWatching, sql } from './db';
import { countsFrom, passesLeft, weekMath } from './rules';
import { localNow } from './time';

export type WitnessStatus = 'waiting' | 'watching' | 'stepped_back' | 'expired';

export function witnessStatus(w: WitnessRow): WitnessStatus {
  if (isWatching(w)) return 'watching';
  if (w.stopped_at) return 'stepped_back';
  if (!w.linked_at && new Date(w.expires_at) < new Date()) return 'expired';
  return 'waiting';
}

/** Everything the app shows, in one response. The server is the source of truth (P5); the app
 *  caches this and asks again after every change. */
export async function serialisePlan(p: PlanRow) {
  const [weighIns, sessions, witnesses, passes, steps, account] = await Promise.all([
    getWeighIns(p.id),
    getSessions(p.id),
    getWitnesses(p.id),
    getPasses(p.id),
    getSteps(p.id),
    sql`select email, password_hash is not null as has_password from accounts where id = ${p.account_id}`,
  ]);
  const { date } = localNow(p.timezone);
  const start = countsFrom(p, witnesses);

  return {
    id: p.id,
    ownerName: p.owner_name,
    email: (account[0]?.email as string | null) ?? undefined,
    hasPassword: !!account[0]?.has_password,
    timezone: p.timezone,
    createdAt: p.created_at,
    countsFrom: start,
    goal: {
      unit: p.unit as 'lb' | 'kg',
      start: Number(p.start_value),
      target: Number(p.target_value),
      perWeek: p.per_week,
    },
    profile: {
      heightCm: p.height_cm ? Number(p.height_cm) : undefined,
      heightUnit: (p.height_unit ?? undefined) as 'ft' | 'cm' | undefined,
      age: p.age ?? undefined,
      gender: p.gender ?? undefined,
    },
    confirmedAt: p.plan_confirmed_at ?? undefined,
    routine: p.routine,
    gym: p.gym ?? undefined,
    stepsGoal: p.steps_goal ?? undefined,
    style: p.style,
    pause: p.paused_from ? { from: p.paused_from, until: p.paused_until!, reason: p.pause_reason ?? '' } : undefined,
    witnesses: witnesses
      .filter((w) => !w.removed_at)
      .map((w) => ({
        id: w.id,
        name: w.name ?? undefined,
        telegramName: w.tg_name ?? undefined,
        inviteToken: w.token,
        status: witnessStatus(w),
        linkedAt: w.linked_at ?? undefined,
        expiresAt: w.expires_at,
      })),
    escalatedWeeks: p.escalated_weeks,
    weighIns: weighIns.map((w) => ({
      date: w.date,
      value: Number(w.value),
      loggedAt: w.logged_at,
      verified: w.proof !== 'typed',
    })),
    // 'pending' rows are reminder bookkeeping, not results.
    workouts: sessions
      .filter((s) => s.status !== 'pending')
      .map((s) => ({
        date: s.date,
        slotId: s.slot_id,
        status: s.status as 'done' | 'missed' | 'excused',
        minutes: s.minutes ?? undefined,
        escalatedAt: s.escalated_at ?? undefined,
      })),
    steps,
    passes: passes.map((x) => ({ kind: x.kind, ref: x.ref, reason: x.reason, createdAt: x.created_at })),
    passesLeft: passesLeft(passes, date),
    today: date,
    week: weekMath(p, start, weighIns, date),
  };
}
