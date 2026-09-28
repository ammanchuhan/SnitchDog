import { authed } from '@/lib/http';
import { suggestSteps, suggestWorkouts } from '@/lib/suggest';

export const dynamic = 'force-dynamic';

/** Numbers for Snitch to suggest while building the plan (COACH-3). The phone passes its recent
 *  Apple Health step average, since only the phone can read Health. */
export const GET = authed(async (req, c) => {
  const avg = Number(new URL(req.url).searchParams.get('stepsAverage'));
  return Response.json({ workoutsPerWeek: suggestWorkouts(c.plan), stepsGoal: suggestSteps(avg) });
});
