import { callerWithPlan } from '@/lib/http';
import { suggestSteps, suggestWorkouts } from '@/lib/suggest';

export const dynamic = 'force-dynamic';

/** Numbers for Snitch to suggest while building the plan (COACH-3). The phone passes its recent
 *  Apple Health step average, since only the phone can read Health. */
export async function GET(req: Request) {
  const c = await callerWithPlan(req);
  if (c instanceof Response) return c;
  const avg = Number(new URL(req.url).searchParams.get('stepsAverage'));
  return Response.json({ workoutsPerWeek: suggestWorkouts(c.plan), stepsGoal: suggestSteps(avg) });
}
