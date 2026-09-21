/** Development only: six weeks of plausible history.
 *
 * Empty states are easy to design and easy to fool yourself with. Most of this app's decisions
 * — the weekly floor, the rolling average, what a "slipped" day looks like — only show whether
 * they work against a real-looking run of weeks, including a bad one. Long-press the day
 * counter on the home screen in a dev build.
 */
import { checkTarget } from './limits';
import type { Plan, Session, WeighIn } from './types';
import { shiftDate, slotsOn, toDate, weekStart } from './types';

export function seeded(original: Plan): Plan {
  // A test plan saved with a nonsense target would seed a nonsense trend; swap in a sane one.
  const plan = checkTarget(original.goal.start, original.goal.target, original.goal.unit)
    ? { ...original, goal: { ...original.goal, target: Math.round(original.goal.start * 0.9) } }
    : original;
  const today = toDate();
  const start = shiftDate(today, -41);
  const weighIns: WeighIn[] = [];
  const sessions: Session[] = [];

  let weight = plan.goal.start;
  const drift = (plan.goal.target - plan.goal.start) / 90; // a slow, believable trend

  for (let i = 0; i < 42; i += 1) {
    const date = shiftDate(start, i);
    const week = Math.floor(i / 7);
    weight += drift + (Math.sin(i * 1.7) * 0.5 + Math.cos(i * 0.9) * 0.4); // water, salt, life

    // Week 3 is the week that went wrong — one weigh-in, two missed sessions.
    // Four or five mornings most weeks; week 3 is the one that went wrong, with a single
    // weigh-in, so the failure states have something real to render.
    const weighed = week === 3 ? i % 7 === 2 : Math.abs(Math.sin(i * 12.9898)) > 0.42;
    if (weighed) {
      weighIns.push({
        date,
        value: Math.round(weight * 10) / 10,
        // No trailing Z: these are meant to read as local mornings, not UTC.
        loggedAt: `${date}T07:${String(10 + (i % 40)).padStart(2, '0')}:00`,
      });
    }

    for (const slot of slotsOn(plan, date)) {
      const missed = week === 3 ? i % 3 !== 0 : Math.abs(Math.cos(i * 7.31)) > 0.86;
      sessions.push({
        date,
        slotId: slot.id,
        status: missed ? 'missed' : 'done',
        answeredAt: `${date}T18:30:00`,
      });
    }
  }

  // The bad week is the one the witness heard about — twice, which is the point of the counter.
  const badWeek = weekStart(shiftDate(start, 21));
  const lastMissed = [...sessions].reverse().find((s) => s.date < today && s.status === 'missed');

  return {
    ...plan,
    createdAt: `${start}T08:00:00`,
    weighIns,
    sessions: sessions.map((s) =>
      lastMissed && s.date === lastMissed.date && s.slotId === lastMissed.slotId
        ? { ...s, escalatedAt: `${s.date}T21:00:00` }
        : s,
    ),
    escalatedWeeks: [badWeek],
  };
}
