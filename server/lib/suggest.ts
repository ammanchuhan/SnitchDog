/** The plan's numbers, computed in code (DATA-5). Snitch proposes and explains them; it doesn't
 *  invent them. Deliberately simple and conservative: a first plan should be easy to keep. */
import type { PlanRow } from './db';

export function suggestWorkouts(p: Pick<PlanRow, 'age' | 'start_value' | 'target_value'>): number {
  const gaining = Number(p.target_value) > Number(p.start_value);
  // Building muscle needs the sessions; losing leans on consistency more than volume.
  let n = gaining ? 4 : 3;
  if ((p.age ?? 30) >= 60) n -= 1;
  return Math.max(2, Math.min(5, n));
}

/** A step goal a little above what they already do, rounded to 500, between 5,000 and 12,000. */
export function suggestSteps(recentAverage?: number | null): number {
  if (!recentAverage || recentAverage < 1000) return 7000;
  const next = Math.ceil((recentAverage * 1.1) / 500) * 500;
  return Math.max(5000, Math.min(12000, next));
}
