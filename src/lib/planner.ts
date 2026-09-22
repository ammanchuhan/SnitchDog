/** Turns the sign-up answers into a starting plan: how many workouts a week, on which days, and
 *  when to ask whether they happened. A suggestion, shown before it's saved and editable after —
 *  the point is that nobody has to face an empty week grid on day one.
 */
import { shortId } from './id';
import type { Commitment, Pace, RoutineSlot, Schedule, TrainTime, Weekday } from './types';

export const COMMITMENT: Record<Commitment, { label: string; note: string; workouts: number }> = {
  easing: { label: 'Easing in', note: 'Two workouts a week. Build the habit first.', workouts: 2 },
  serious: { label: 'Serious', note: 'Three a week. The usual place to start.', workouts: 3 },
  all_in: { label: 'All in', note: 'Four a week. Only if your week has room for it.', workouts: 4 },
};

/** How hard they want to push. Deliberately no numbers: weight doesn't come off on a schedule,
 *  and a promised "1 lb a week" turns the first plateau into a broken promise. */
export const PACE: Record<Pace, { label: string; note: string }> = {
  steady: { label: 'Steady', note: 'Slow and sustainable. Changes you barely notice week to week, and keep.' },
  moderate: { label: 'Moderate', note: 'Noticeable month to month without taking over your life.' },
  fast: { label: 'Fast', note: 'As quick as is healthy. Harder to keep, and it adds a workout to your week.' },
};

export const SCHEDULE: Record<Schedule, string> = {
  day: 'Weekdays, office hours',
  early: 'Early shifts',
  late: 'Late or night shifts',
  varies: 'It changes week to week',
  home: 'I set my own hours',
};

export const TRAIN_TIME: Record<TrainTime, string> = {
  morning: 'Mornings',
  midday: 'Middle of the day',
  evening: 'Evenings',
  any: 'Whenever I can',
};

export const workoutsFor = (commitment: Commitment, pace: Pace) =>
  Math.min(COMMITMENT[commitment].workouts + (pace === 'fast' ? 1 : 0), 5);

/** Spread across the week with rest between. Office workers get a weekend day, because that's
 *  where their free time is; everyone else gets weekdays and keeps weekends as slack. */
export function daysFor(count: number, schedule: Schedule): Weekday[] {
  const weekendFriendly: Record<number, Weekday[]> = {
    2: [3, 6],
    3: [1, 3, 6],
    4: [1, 2, 4, 6],
    5: [1, 2, 3, 5, 6],
  };
  const weekdays: Record<number, Weekday[]> = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
  };
  return (schedule === 'day' ? weekendFriendly : weekdays)[count] ?? [1, 3, 5];
}

/** When to ask "did you do it?" — at the end of the window they said they train in, so the
 *  question arrives after the workout would have happened, not before. */
export function checkInHour(trainTime: TrainTime, schedule: Schedule, wakeHour: number): number {
  if (trainTime === 'morning') return Math.min(wakeHour + 4, 12);
  if (trainTime === 'midday') return 15;
  return schedule === 'late' ? 22 : 21;
}

export function buildRoutine(a: {
  commitment: Commitment;
  pace: Pace;
  schedule: Schedule;
  trainTime: TrainTime;
  wakeHour: number;
}): RoutineSlot[] {
  return [
    {
      id: shortId(8),
      label: 'Workout',
      days: daysFor(workoutsFor(a.commitment, a.pace), a.schedule),
      hour: checkInHour(a.trainTime, a.schedule, a.wakeHour),
    },
  ];
}
