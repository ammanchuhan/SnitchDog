/** The domain, in one file.
 *
 * The server is the source of truth (P5): `Plan` is what GET /api/plan returns, cached on the
 * phone. Anything that decides what a witness hears (the week's floor, what's still needed) comes
 * from the server as `plan.week`; the helpers here are for display: averages, the calendar, the
 * week tiles.
 *
 * Progress is measured on a rolling seven-day average, never on this morning's number: body
 * weight swings two or three pounds on water alone, and a progress bar that reacts to that is
 * lying to you.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday … Saturday

export const WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Weigh-ins required every week, for everyone. Deliberately not a setting: a difficulty dial is
 *  the first thing people turn down the moment it starts to bite. */
export const WEIGH_INS_PER_WEEK = 3;

export type Unit = 'lb' | 'kg';
export type HeightUnit = 'ft' | 'cm';
export type Gender = 'woman' | 'man' | 'non_binary' | 'prefer_not';
export type Style = 'gentle' | 'balanced' | 'tough';

export type Goal = { unit: Unit; start: number; target: number; perWeek: number };

/** A scheduled workout: "Lift, Mon/Wed/Fri, by 6 pm". Verified by being at the gym that day. */
export type RoutineSlot = { id: string; label: string; days: Weekday[]; hour: number };

export type Gym = { name: string; lat: number; lng: number; radius: number };

export type WeighIn = {
  /** Local calendar day, YYYY-MM-DD. One per day. */
  date: string;
  value: number;
  loggedAt: string;
  /** False when OCR failed three times and the number was typed (Q20). */
  verified: boolean;
};

export type Workout = {
  date: string;
  slotId: string;
  status: 'done' | 'missed' | 'excused';
  minutes?: number;
  /** Set when witnesses were told about the run this workout ended. */
  escalatedAt?: string;
};

export type WitnessStatus = 'waiting' | 'watching' | 'stepped_back' | 'expired';

export const STATUS_LABEL: Record<WitnessStatus, string> = {
  waiting: 'Waiting',
  watching: 'Watching',
  stepped_back: 'Stepped back',
  expired: 'Invite expired',
};

export type Witness = {
  id: string;
  /** The owner's name for them. Kept on the phone until they accept (WIT-8), so the store fills
   *  it in from local storage; undefined on a new phone before they've accepted. */
  name?: string;
  /** What Telegram calls them, once they've accepted. */
  telegramName?: string;
  inviteToken: string;
  status: WitnessStatus;
  linkedAt?: string;
  expiresAt: string;
};

export type WeekMath = {
  done: number;
  required: number;
  needed: number;
  left: number;
  leftAfterToday: number;
  todayDone: boolean;
  met: boolean;
  noRoom: boolean;
  impossible: boolean;
  counting: boolean;
};

export type Plan = {
  id: string;
  ownerName: string;
  email?: string;
  /** False for an Apple-only account: there's no password to change. */
  hasPassword: boolean;
  timezone: string;
  createdAt: string;
  /** The local day the first witness accepted: nothing counts before it (WIT-1). */
  countsFrom: string | null;
  goal: Goal;
  profile: { heightCm?: number; heightUnit?: HeightUnit; age?: number; gender?: Gender };
  /** Set once the plan Snitch built in chat is confirmed. Until then Home shows the plan banner. */
  confirmedAt?: string;
  routine: RoutineSlot[];
  gym?: Gym;
  stepsGoal?: number;
  style: Style;
  pause?: { from: string; until: string; reason: string };
  witnesses: Witness[];
  escalatedWeeks: string[];
  weighIns: WeighIn[];
  workouts: Workout[];
  steps: { date: string; steps: number }[];
  passes: { kind: 'week' | 'workout'; ref: string; reason: string; createdAt: string }[];
  passesLeft: number;
  /** The plan's local today, and how its week stands, as the server judges it. */
  today: string;
  week: WeekMath;
};

/** What finishing sign-up sends. Witness names stay on the phone (WIT-8). */
export type NewPlan = {
  ownerName: string;
  age: number;
  heightCm: number;
  heightUnit: HeightUnit;
  gender?: Gender;
  unit: Unit;
  start: number;
  target: number;
  witnessNames: string[];
};

/* ── dates ─────────────────────────────────────────────────────────────── */

export const toDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const shiftDate = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return toDate(new Date(y, m - 1, d + days));
};

export const weekdayOf = (date: string): Weekday => new Date(`${date}T12:00:00`).getDay() as Weekday;

/** Weeks run Monday to Sunday; the id is the Monday. */
export function weekStart(date: string): string {
  const day = weekdayOf(date);
  return shiftDate(date, day === 0 ? -6 : 1 - day);
}

export const daysLeftInWeek = (date: string) => {
  const day = weekdayOf(date);
  return (day === 0 ? 0 : 7 - day) + 1; // includes today
};

/* ── witnesses ─────────────────────────────────────────────────────────── */

export const witnessLabel = (w: Witness, i: number) => w.name ?? w.telegramName ?? `Witness ${i + 1}`;

export const watching = (p: Plan) => p.witnesses.filter((w) => w.status === 'watching');

/* ── weighing ──────────────────────────────────────────────────────────── */

export const weighInOn = (p: Plan, date: string) => p.weighIns.find((w) => w.date === date);

export const weighInsInWeek = (p: Plan, date: string) => {
  const start = weekStart(date);
  return p.weighIns.filter((w) => weekStart(w.date) === start);
};

/** Rolling average over the last `span` days: the number the progress bar follows. */
export function rollingAverage(p: Plan, endDate: string, span = 7): number | undefined {
  const first = shiftDate(endDate, -(span - 1));
  const window = p.weighIns.filter((w) => w.date >= first && w.date <= endDate);
  if (!window.length) return undefined;
  return window.reduce((sum, w) => sum + w.value, 0) / window.length;
}

/** The most recent seven-day average that exists, walking back if this week is empty. */
export function currentAverage(p: Plan, date = p.today): number | undefined {
  for (let back = 0; back <= 21; back += 7) {
    const avg = rollingAverage(p, shiftDate(date, -back));
    if (avg !== undefined) return avg;
  }
  return undefined;
}

export const previousAverage = (p: Plan, date = p.today) => rollingAverage(p, shiftDate(date, -7));

export const latestWeighIn = (p: Plan) => p.weighIns[p.weighIns.length - 1];

/** 0..1 toward the target, measured on the average rather than today's reading. */
export function progress(p: Plan, date = p.today): number {
  const now = currentAverage(p, date) ?? p.goal.start;
  const span = p.goal.target - p.goal.start;
  if (span === 0) return 1;
  return Math.max(0, Math.min(1, (now - p.goal.start) / span));
}

/** The floor for a past or current week, from the day the plan started counting. Display only;
 *  the server's copy (server/lib/rules.ts) is what witnesses are judged by. */
export function requiredInWeek(p: Plan, date: string): number {
  if (!p.countsFrom || p.countsFrom > shiftDate(weekStart(date), 6)) return 0;
  if (weekStart(date) !== weekStart(p.countsFrom)) return p.goal.perWeek;
  return Math.min(p.goal.perWeek, daysLeftInWeek(p.countsFrom));
}

/* ── workouts ──────────────────────────────────────────────────────────── */

export const slotsOn = (p: Plan, date: string) => p.routine.filter((s) => s.days.includes(weekdayOf(date)));

export const workoutFor = (p: Plan, date: string, slotId: string) =>
  p.workouts.find((s) => s.date === date && s.slotId === slotId);

export const isPaused = (p: Plan, date: string) => !!p.pause && date >= p.pause.from && date <= p.pause.until;

/** Workouts owed on a day: the plan is confirmed and counting, and the day isn't paused. */
export function workoutsDue(p: Plan, date: string) {
  if (!p.countsFrom || !p.confirmedAt || date < p.countsFrom || isPaused(p, date)) return [];
  return slotsOn(p, date);
}

export const workoutsThisWeek = (p: Plan, date = p.today) => {
  const start = weekStart(date);
  const scheduled = Array.from({ length: 7 }, (_, i) => shiftDate(start, i)).flatMap((d) =>
    workoutsDue(p, d).map((slot) => ({ date: d, slot, workout: workoutFor(p, d, slot.id) })),
  );
  return {
    scheduled,
    done: scheduled.filter((x) => x.workout?.status === 'done').length,
    total: scheduled.length,
  };
};

export const stepsOn = (p: Plan, date: string) => p.steps.find((s) => s.date === date)?.steps;

/* ── the counter that matters ──────────────────────────────────────────── */

export const escalationCount = (p: Plan) =>
  p.workouts.filter((s) => s.escalatedAt).length + weeksTold(p).length;

/** Weeks witnesses were told about: judged and came up short without a pass. The server records
 *  every judged week in escalatedWeeks, told or not, so the shortfall is worked out here. */
export const weeksTold = (p: Plan) =>
  p.escalatedWeeks.filter(
    (w) =>
      weighInsInWeek(p, w).length < requiredInWeek(p, w) &&
      !p.passes.some((x) => x.kind === 'week' && x.ref === w),
  );

/* ── how a day reads, looking back ─────────────────────────────────────── */

export type DayState =
  | 'clean' // weighed in, and anything scheduled got done
  | 'quiet' // nothing owed, or a skipped morning the week could afford
  | 'slipped' // a workout missed, or a morning skipped that the week could not afford
  | 'called' // the day the witnesses were told
  | 'future'
  | 'before'; // before the plan counted

/** True once a week is over and finished below its floor. */
export function weekCameUpShort(p: Plan, date: string, today = p.today): boolean {
  if (weekStart(today) === weekStart(date)) return false; // still running
  return weighInsInWeek(p, date).length < requiredInWeek(p, date);
}

export function dayState(p: Plan, date: string, today = p.today): DayState {
  if (date > today) return 'future';
  if (!p.countsFrom || date < p.countsFrom) return weighInOn(p, date) ? 'clean' : 'before';

  const start = weekStart(date);
  const calledForWeek = weeksTold(p).includes(start) && weekdayOf(date) === 0;
  const calledForWorkout = p.workouts.some((s) => s.date === date && s.escalatedAt);
  if (calledForWeek || calledForWorkout) return 'called';

  if (slotsOn(p, date).some((slot) => workoutFor(p, date, slot.id)?.status === 'missed')) return 'slipped';
  if (weighInOn(p, date)) return 'clean';
  return weekCameUpShort(p, date, today) ? 'slipped' : 'quiet';
}

/** Weeks since the plan started counting, oldest first, plus the best unbroken run. */
export function weekHistory(p: Plan, today = p.today) {
  const weeks: { start: string; done: number; required: number; met: boolean; open: boolean }[] = [];
  if (!p.countsFrom) return { weeks, best: 0, current: 0 };
  let cursor = weekStart(p.countsFrom);
  while (cursor <= weekStart(today)) {
    const done = weighInsInWeek(p, cursor).length;
    const required = requiredInWeek(p, cursor);
    const excused = p.passes.some((x) => x.kind === 'week' && x.ref === cursor);
    weeks.push({ start: cursor, done, required, met: done >= required || excused, open: cursor === weekStart(today) });
    cursor = shiftDate(cursor, 7);
  }
  let best = 0;
  let run = 0;
  for (const w of weeks) {
    if (w.met) {
      run += 1;
      best = Math.max(best, run);
    } else if (!w.open) {
      run = 0;
    }
  }
  return { weeks, best, current: run };
}

/** Every day of the month containing `month` (any date in it), padded to whole weeks. */
export function monthGrid(month: string) {
  const [y, m] = month.split('-').map(Number);
  const first = toDate(new Date(y, m - 1, 1));
  const lead = (weekdayOf(first) + 6) % 7; // weeks start Monday
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(toDate(new Date(y, m - 1, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** This week, Monday to Sunday, for the strip on Home (HOME-9). */
export function thisWeekDays(p: Plan, date = p.today) {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const day = shiftDate(start, i);
    return {
      date: day,
      weighIn: weighInOn(p, day),
      workouts: workoutsDue(p, day).map((slot) => ({ slot, workout: workoutFor(p, day, slot.id) })),
    };
  });
}
