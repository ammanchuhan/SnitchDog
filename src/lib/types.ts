/** The domain, in one file.
 *
 * A plan has two streams that are judged differently, because they fail differently:
 *
 *   Weighing    happens every morning, but a single missed morning means nothing. What matters
 *               is how many times you stood on the scale this week. Graded weekly, against a
 *               floor.
 *   Routine     is scheduled — Monday 6pm, Thursday 6pm — so the coach can ask about a specific
 *               session instead of "did you do a thing today". Graded per session.
 *
 * Progress is measured on a rolling seven-day average, never on this morning's number: body
 * weight swings two or three pounds on water alone, and a progress bar that reacts to that is
 * lying to you.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday … Saturday

export const WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Weigh-ins required every week, for everyone.
 *
 * Deliberately not a setting. A difficulty dial is the first thing people turn down the moment
 * it starts to bite, which is the exact failure this product exists to prevent. Three is also
 * the number worth defending on safety grounds: enough readings for an honest average, not so
 * many that the app is pushing anyone toward weighing themselves every day.
 */
export const WEIGH_INS_PER_WEEK = 3;

/** The outcome being chased, and how often you have to measure it. */
export type Goal = {
  unit: 'lb' | 'kg';
  start: number;
  target: number;
  /** The weigh-in prompt lands here — you weigh when you get up, so this is when you get up. */
  wakeHour: number;
  /** Always WEIGH_INS_PER_WEEK today; kept on the record so a maintenance mode can differ. */
  perWeek: number;
};

/** A recurring session: "Lift, Mon/Wed/Fri, by 7pm". */
export type RoutineSlot = {
  id: string;
  label: string;
  days: Weekday[];
  /** Local hour by which it should be done; the coach asks at this time. */
  hour: number;
};

export type WeighIn = {
  /** Local calendar day, YYYY-MM-DD. One per day, ever. */
  date: string;
  value: number;
  loggedAt: string;
  /** The photo of the scale, taken with the camera at the moment of logging. A file name inside
   *  the app's documents folder (never a full path: that changes between app installs). The
   *  photo stays on the phone. */
  photo?: string;
  /** How the number is backed: a photo in the app, or a photo sent to the bot. Entries from
   *  before photos were required have neither. */
  proof?: 'camera' | 'telegram';
};

export type SessionStatus = 'done' | 'missed';

export type Session = {
  date: string;
  slotId: string;
  status: SessionStatus;
  answeredAt?: string;
  /** Set the moment the witness was told about this session. */
  escalatedAt?: string;
};

export type Witness = {
  name: string;
  /** False until they open the invite — until then, nobody is actually watching. */
  linked: boolean;
  linkedAt?: string;
  inviteToken: string;
};

export type HeightUnit = 'ft' | 'cm';
export type Schedule = 'day' | 'early' | 'late' | 'varies' | 'home';
export type TrainTime = 'morning' | 'midday' | 'evening' | 'any';
/** How much they're signing up for: sets the number of workouts a week. */
export type Commitment = 'easing' | 'serious' | 'all_in';
/** How fast they want to move, as a share of body weight a week. Sets expectations, not rules. */
export type Pace = 'steady' | 'moderate' | 'fast';

/** About the person, asked once at sign-up and used to build the plan and set an honest target
 *  range. **Stays on this phone.** Nothing the server does needs a height or an age, so they are
 *  stripped before any sync (see api.ts). All optional: plans made before sign-up asked lack it. */
export type Profile = {
  heightCm?: number;
  /** How they entered it, so it's shown back the same way. */
  heightUnit?: HeightUnit;
  age?: number;
  schedule?: Schedule;
  trainTime?: TrainTime;
  commitment?: Commitment;
  pace?: Pace;
};

export type Plan = {
  id: string;
  /** First name only — it appears in the message the witness receives. */
  ownerName: string;
  timezone: string;
  createdAt: string;
  goal: Goal;
  profile?: Profile;
  routine: RoutineSlot[];
  witness: Witness;
  weighIns: WeighIn[];
  sessions: Session[];
  /** Set once the owner links their own messaging account. */
  ownerChatId?: string;
  /** Weeks already reported to the witness, so a bad week is only escalated once. */
  escalatedWeeks?: string[];
  /** Running score per line kind, taught by the thumbs on the home screen. */
  lineVotes?: Partial<Record<string, number>>;
  /** Line kinds already voted on today, so the thumbs don't re-ask. */
  lineVotedOn?: Record<string, 'up' | 'down'>;
};

/* ── dates ─────────────────────────────────────────────────────────────── */

export const toDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const shiftDate = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return toDate(new Date(y, m - 1, d + days));
};

export const weekdayOf = (date: string): Weekday =>
  new Date(`${date}T12:00:00`).getDay() as Weekday;

/** Weeks run Monday to Sunday; the id is the Monday. */
export function weekStart(date: string): string {
  const day = weekdayOf(date);
  return shiftDate(date, day === 0 ? -6 : 1 - day);
}

export const daysLeftInWeek = (date: string) => {
  const day = weekdayOf(date);
  return (day === 0 ? 0 : 7 - day) + 1; // includes today
};

/* ── weighing ──────────────────────────────────────────────────────────── */

export const weighInOn = (p: Plan, date: string) => p.weighIns.find((w) => w.date === date);

export const weighInsInWeek = (p: Plan, date: string) => {
  const start = weekStart(date);
  return p.weighIns.filter((w) => weekStart(w.date) === start);
};

/** Rolling average over the last `span` days — the number the progress bar follows. */
export function rollingAverage(p: Plan, endDate: string, span = 7): number | undefined {
  const first = shiftDate(endDate, -(span - 1));
  const window = p.weighIns.filter((w) => w.date >= first && w.date <= endDate);
  if (!window.length) return undefined;
  return window.reduce((sum, w) => sum + w.value, 0) / window.length;
}

/** The most recent seven-day average that exists, walking back if this week is empty. */
export function currentAverage(p: Plan, date = toDate()): number | undefined {
  for (let back = 0; back <= 21; back += 7) {
    const avg = rollingAverage(p, shiftDate(date, -back));
    if (avg !== undefined) return avg;
  }
  return undefined;
}

export const previousAverage = (p: Plan, date = toDate()) => rollingAverage(p, shiftDate(date, -7));

export const latestWeighIn = (p: Plan) => p.weighIns[p.weighIns.length - 1];

/** 0..1 toward the target, measured on the average rather than today's reading. */
export function progress(p: Plan, date = toDate()): number {
  const now = currentAverage(p, date) ?? p.goal.start;
  const span = p.goal.target - p.goal.start;
  if (span === 0) return 1;
  return Math.max(0, Math.min(1, (now - p.goal.start) / span));
}

/** The floor for a given week.
 *
 * Starting on a Saturday should not mean failing your first week before you have done anything,
 * so the week a plan is created in is pro-rated to the mornings that were actually available. */
export function requiredInWeek(p: Plan, date: string): number {
  const created = toDate(new Date(p.createdAt));
  if (weekStart(date) !== weekStart(created)) return p.goal.perWeek;
  return Math.min(p.goal.perWeek, daysLeftInWeek(created));
}

/** How the week is going, and whether the floor is still reachable. */
export function weekStatus(p: Plan, date = toDate()) {
  const done = weighInsInWeek(p, date).length;
  const required = requiredInWeek(p, date);
  const needed = Math.max(0, required - done);
  const left = daysLeftInWeek(date);
  const todayDone = !!weighInOn(p, date);
  return {
    done,
    required,
    needed,
    left,
    met: done >= required,
    /** Still possible, but only if they weigh in most of the days that remain. */
    atRisk: needed > 0 && needed >= left,
    impossible: needed > left,
    todayDone,
  };
}

/* ── routine ───────────────────────────────────────────────────────────── */

export const slotsOn = (p: Plan, date: string) =>
  p.routine.filter((s) => s.days.includes(weekdayOf(date)));

export const sessionFor = (p: Plan, date: string, slotId: string) =>
  p.sessions.find((s) => s.date === date && s.slotId === slotId);

/** Sessions that were scheduled and are still unanswered, oldest first. */
export function openSessions(p: Plan, date = toDate()) {
  return slotsOn(p, date)
    .filter((slot) => !sessionFor(p, date, slot.id))
    .sort((a, b) => a.hour - b.hour);
}

/** Consecutive scheduled sessions missed, walking back from `date`. */
export function missedRun(p: Plan, date = toDate()): number {
  const created = toDate(new Date(p.createdAt));
  let run = 0;
  for (let i = 0; i < 30; i += 1) {
    const day = shiftDate(date, -i);
    if (day < created) return run;
    for (const slot of slotsOn(p, day).sort((a, b) => b.hour - a.hour)) {
      const s = sessionFor(p, day, slot.id);
      if (!s) continue; // unanswered and possibly not due yet — not a miss
      if (s.status === 'missed') run += 1;
      else return run;
    }
  }
  return run;
}

export const sessionsThisWeek = (p: Plan, date = toDate()) => {
  const start = weekStart(date);
  const created = toDate(new Date(p.createdAt));
  // Sessions scheduled before the plan existed are not yours to have missed.
  const scheduled = Array.from({ length: 7 }, (_, i) => shiftDate(start, i))
    .filter((d) => d >= created)
    .flatMap((d) => slotsOn(p, d).map((slot) => ({ date: d, slot, session: sessionFor(p, d, slot.id) })));
  return {
    scheduled,
    done: scheduled.filter((x) => x.session?.status === 'done').length,
    total: scheduled.length,
  };
};

/* ── the counter that matters ──────────────────────────────────────────── */

export const escalationCount = (p: Plan) =>
  p.sessions.filter((s) => s.escalatedAt).length + (p.escalatedWeeks?.length ?? 0);

/* ── how a day reads, looking back ─────────────────────────────────────── */

export type DayState =
  | 'clean'    // weighed in, and anything scheduled got done
  | 'quiet'    // nothing owed, or a skipped morning the week could afford
  | 'slipped'  // a session missed, or a morning skipped that the week could not afford
  | 'called'   // the day the witness was contacted
  | 'future'
  | 'before';  // before this plan existed

/** True once a week is over and finished below its floor. */
export function weekCameUpShort(p: Plan, date: string, today = toDate()): boolean {
  const start = weekStart(date);
  if (weekStart(today) === start) return false; // still running
  return weighInsInWeek(p, date).length < requiredInWeek(p, date);
}

export function dayState(p: Plan, date: string, today = toDate()): DayState {
  if (date > today) return 'future';
  if (date < toDate(new Date(p.createdAt))) return 'before';

  const start = weekStart(date);
  // A week-close call lands on the Sunday it was earned; a session call lands on its own day.
  const calledForWeek = (p.escalatedWeeks ?? []).includes(start) && weekdayOf(date) === 0;
  const calledForSession = p.sessions.some((s) => s.date === date && s.escalatedAt);
  if (calledForWeek || calledForSession) return 'called';

  const missedSession = slotsOn(p, date).some((slot) => sessionFor(p, date, slot.id)?.status === 'missed');
  if (missedSession) return 'slipped';

  if (weighInOn(p, date)) return 'clean';

  // A skipped morning only counts against you if the week ended up short — which is the whole
  // point of a weekly floor, and the only way the calendar tells the truth about it.
  return weekCameUpShort(p, date, today) ? 'slipped' : 'quiet';
}

/** Completed weeks that met the floor, oldest first, plus the best unbroken run. */
export function weekHistory(p: Plan, today = toDate()) {
  const created = toDate(new Date(p.createdAt));
  const weeks: { start: string; done: number; required: number; met: boolean; open: boolean }[] = [];
  let cursor = weekStart(created);
  while (cursor <= weekStart(today)) {
    const done = weighInsInWeek(p, cursor).length;
    const required = requiredInWeek(p, cursor);
    weeks.push({
      start: cursor,
      done,
      required,
      met: done >= required,
      open: cursor === weekStart(today),
    });
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

/** The last N days, oldest first, for the strip on the home screen. */
export function recentDays(p: Plan, n: number, date = toDate()) {
  return Array.from({ length: n }, (_, i) => {
    const day = shiftDate(date, i - n + 1);
    return {
      date: day,
      weighIn: weighInOn(p, day),
      sessions: slotsOn(p, day).map((slot) => ({ slot, session: sessionFor(p, day, slot.id) })),
    };
  });
}
