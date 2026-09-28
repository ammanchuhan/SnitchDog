/** The rules Snitch judges by, as pure functions over rows so they can be tested without a database.
 *
 * The app has its own copy of the week math for display (src/lib/types.ts). week-floor.test.ts
 * checks the two agree, because the server's copy decides what witnesses hear and the app's copy
 * decides what the owner was told they owed.
 */
import type { PassRow, PlanRow, SessionRow, WeighInRow, WitnessRow } from './db';
import { createdDate, daysLeftInWeek, shiftDate, weekStart, weekdayOf } from './time';

/** Passes Snitch can grant per calendar month, for a missed week or workout with a good reason. */
export const PASSES_PER_MONTH = 2;

/** Longest pause, in days (Q4). */
export const MAX_PAUSE_DAYS = 14;

/** Minutes inside the gym geofence that count as a workout (Q26). */
export const MIN_WORKOUT_MINUTES = 30;

/** The plan only counts once somebody is watching (WIT-1): the local day the first witness
 *  accepted. Null while nobody has. */
export function countsFrom(p: Pick<PlanRow, 'timezone'>, witnesses: Pick<WitnessRow, 'linked_at'>[]): string | null {
  const first = witnesses
    .map((w) => w.linked_at)
    .filter((x): x is string => !!x)
    .sort()[0];
  return first ? createdDate(first, p.timezone) : null;
}

/** The floor for the week containing `date`. The first counted week is pro-rated to the mornings
 *  left in it, so starting on a Saturday doesn't mean failing week one. */
export function requiredInWeek(p: Pick<PlanRow, 'per_week'>, start: string, date: string): number {
  if (weekStart(date) !== weekStart(start)) return p.per_week;
  return Math.min(p.per_week, daysLeftInWeek(start));
}

export const isPaused = (p: Pick<PlanRow, 'paused_from' | 'paused_until'>, date: string) =>
  !!p.paused_from && !!p.paused_until && date >= p.paused_from && date <= p.paused_until;

/** Days of a week that fall inside the pause. A paused day owes nothing, so the floor shrinks. */
const pausedDaysIn = (p: Pick<PlanRow, 'paused_from' | 'paused_until'>, week: string) =>
  Array.from({ length: 7 }, (_, i) => shiftDate(week, i)).filter((d) => isPaused(p, d)).length;

export type WeekMath = {
  done: number;
  required: number;
  /** Still to do this week. */
  needed: number;
  /** Days left including today. */
  left: number;
  /** Days left after today. */
  leftAfterToday: number;
  todayDone: boolean;
  met: boolean;
  /** Every remaining day is needed: skip one more and the week is short. */
  noRoom: boolean;
  /** Can't be met any more, whatever they do. */
  impossible: boolean;
  /** The plan isn't counting yet (no witness), so nothing is owed. */
  counting: boolean;
};

/** How the week containing `date` stands (Flow C). */
export function weekMath(
  p: Pick<PlanRow, 'per_week' | 'paused_from' | 'paused_until'>,
  start: string | null,
  weighIns: Pick<WeighInRow, 'date'>[],
  date: string,
): WeekMath {
  const week = weekStart(date);
  const done = weighIns.filter((w) => weekStart(w.date) === week).length;
  const todayDone = weighIns.some((w) => w.date === date);
  const left = daysLeftInWeek(date);
  const counting = !!start && start <= shiftDate(week, 6);
  const floor = start ? requiredInWeek(p, start, date) : p.per_week;
  // A paused day can't be weighed on and can't be owed.
  const required = counting ? Math.max(0, Math.min(floor, 7 - pausedDaysIn(p, week))) : 0;
  const needed = Math.max(0, required - done);
  // Today still counts if they haven't weighed in yet.
  const available = left - (todayDone ? 1 : 0);
  return {
    done,
    required,
    needed,
    left,
    leftAfterToday: left - 1,
    todayDone,
    met: done >= required,
    noRoom: needed > 0 && needed === available,
    impossible: needed > available,
    counting,
  };
}

/** Did they get where they were going? On the seven-day average, never one reading. */
export function reachedTarget(p: Pick<PlanRow, 'start_value' | 'target_value'>, weighIns: Pick<WeighInRow, 'date' | 'value'>[], today: string): boolean {
  if (!weighIns.length) return false;
  const cutoff = shiftDate(today, -6);
  const recent = weighIns.filter((w) => w.date >= cutoff).map((w) => Number(w.value));
  const values = recent.length ? recent : [Number(weighIns[weighIns.length - 1].value)];
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const start = Number(p.start_value);
  const target = Number(p.target_value);
  return target <= start ? average <= target : average >= target;
}

export const passesUsedIn = (passes: Pick<PassRow, 'created_at'>[], today: string) =>
  passes.filter((x) => new Date(x.created_at).toISOString().slice(0, 7) === today.slice(0, 7)).length;

export const passesLeft = (passes: Pick<PassRow, 'created_at'>[], today: string) =>
  Math.max(0, PASSES_PER_MONTH - passesUsedIn(passes, today));

/** Workouts scheduled on a day, once the plan is confirmed and counting, and not paused. */
export function workoutsDue(p: PlanRow, start: string | null, date: string) {
  if (!start || !p.plan_confirmed_at) return [];
  const from = [start, createdDate(p.plan_confirmed_at, p.timezone)].sort()[1];
  if (date < from || isPaused(p, date)) return [];
  return p.routine.filter((s) => s.days.includes(weekdayOf(date)));
}

/** Consecutive missed workouts, newest first. Excused ones (a pass) neither count nor break it. */
export function missedRun(sessions: SessionRow[]) {
  const answered = sessions
    .filter((s) => s.status === 'done' || s.status === 'missed')
    .sort((a, b) => b.date.localeCompare(a.date) || b.slot_id.localeCompare(a.slot_id));
  let run = 0;
  for (const s of answered) {
    if (s.status !== 'missed') break;
    run += 1;
  }
  return { run, latest: answered[0] };
}
