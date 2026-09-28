/** Steps from Apple Health (HOME-7): the daily total for the last two weeks, sent to the server
 *  so Home and Analytics can show it. Tracked only: missing the goal never reaches a witness (Q28). */
import HealthSteps from '../../modules/health-steps';
import { reportSteps } from './api';

const DAYS = 14;

export const healthAvailable = () => !!HealthSteps?.isAvailable();

/** Asks once (Apple shows its sheet only the first time), reads, and sends the totals. */
export async function syncSteps(): Promise<boolean> {
  if (!HealthSteps?.isAvailable()) return false;
  try {
    if (!(await HealthSteps.requestAccess())) return false;
    const days = await HealthSteps.dailySteps(DAYS);
    if (days.length) await reportSteps(days);
    return true;
  } catch {
    return false;
  }
}

/** The recent daily average, not counting today, for Snitch's step-goal suggestion (COACH-3). */
export async function recentStepsAverage(): Promise<number | undefined> {
  if (!HealthSteps?.isAvailable()) return undefined;
  try {
    await HealthSteps.requestAccess();
    const days = (await HealthSteps.dailySteps(DAYS)).slice(0, -1).filter((d) => d.steps > 0);
    if (!days.length) return undefined;
    return days.reduce((n, d) => n + d.steps, 0) / days.length;
  } catch {
    return undefined;
  }
}
