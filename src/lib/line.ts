/** The line the coach leaves on the home screen.
 *
 * Not a quote. Generic inspiration is the most disposable content in this category, and asking
 * a model for "motivation" produces exactly the poster voice the rest of the app refuses. Every
 * line here is drawn from what the person actually did this week, which is the only thing that
 * earns a second reading.
 *
 * Each line has a *kind*, and the thumbs teach us which kinds land. Voting down "streak" and up
 * "blunt" changes what gets picked tomorrow, without a server and without a model. When the
 * server is configured it writes the line instead, using the same kinds and the same votes.
 */
import type { Plan } from './types';
import {
  escalationCount,
  sessionFor,
  slotsOn,
  toDate,
  weekStatus,
  weighInOn,
} from './types';

export type LineKind =
  | 'witness'   // nobody is watching yet
  | 'blunt'     // the week is on the line
  | 'recovery'  // right after a bad week
  | 'streak'    // a run worth naming
  | 'progress'  // the numbers are moving
  | 'plain';    // nothing remarkable; say something small and true

export type CoachLine = { kind: LineKind; text: string };

/** Stable per day, so the line doesn't change under you while you read it. */
const pick = <T,>(options: T[], seed: string): T => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return options[Math.abs(h) % options.length];
};

type Candidate = CoachLine & { weight: number };

export function localLine(plan: Plan, date = toDate()): CoachLine {
  const week = weekStatus(plan, date);
  const told = escalationCount(plan);
  const openSession = slotsOn(plan, date).find((s) => !sessionFor(plan, date, s.id));
  const weighedToday = !!weighInOn(plan, date);
  const votes = plan.lineVotes ?? {};

  const candidates: Candidate[] = [];

  if (!plan.witness.linked) {
    candidates.push({
      kind: 'witness',
      weight: 10,
      text: pick(
        [
          `Until ${plan.witness.name} accepts, this is a diary. Diaries don't work.`,
          `Nobody is watching yet. That's the one thing here you can fix in ten seconds.`,
        ],
        date,
      ),
    });
  }

  if (week.impossible) {
    candidates.push({
      kind: 'recovery',
      weight: 9,
      text: `This week is already short. Weigh in anyway — ${plan.witness.name} hearing about it doesn't undo tomorrow.`,
    });
  } else if (week.needed > 0 && week.needed >= week.left) {
    candidates.push({
      kind: 'blunt',
      weight: 8,
      text:
        week.left === 1
          ? `Last day. One weigh-in between you and a clean week.`
          : `${week.needed} weigh-ins, ${week.left} days. No slack left.`,
    });
  }

  if (told > 0 && week.done > 0) {
    candidates.push({
      kind: 'recovery',
      weight: 6,
      text: `${plan.witness.name} has been called ${told === 1 ? 'once' : `${told} times`}. This week is how that number stops going up.`,
    });
  }

  if (week.met) {
    candidates.push({
      kind: 'streak',
      weight: 7,
      text: pick(
        [`Week's clean. Anything else you do is profit.`, `You've made your three. The rest of the week is yours.`],
        date,
      ),
    });
  }

  if (openSession) {
    candidates.push({
      kind: 'blunt',
      weight: 5,
      text: `${openSession.label} is still open today. It gets harder the later it gets.`,
    });
  }

  const moved = plan.weighIns.length >= 4;
  if (moved) {
    const first = plan.weighIns[0].value;
    const last = plan.weighIns[plan.weighIns.length - 1].value;
    const delta = last - first;
    const towardTarget = Math.sign(delta) === Math.sign(plan.goal.target - plan.goal.start);
    candidates.push({
      kind: 'progress',
      weight: 4,
      text: towardTarget
        ? `${Math.abs(delta).toFixed(1)} ${plan.goal.unit} of movement since you started, on ${plan.weighIns.length} readings. Keep feeding it numbers.`
        : `The average hasn't moved much yet. ${plan.weighIns.length} readings in, that's information, not a verdict.`,
    });
  }

  candidates.push({
    kind: 'plain',
    weight: 1,
    text: weighedToday
      ? pick(
          [`Logged. That's the whole job today.`, `Number's in. Nothing else owed.`],
          date,
        )
      : pick(
          [`Scale first, opinions later.`, `One number and you're done with me for the day.`],
          date,
        ),
  });

  // Votes nudge the ordering; they never silence a line that genuinely needs saying.
  const best = candidates.sort(
    (a, b) => b.weight + (votes[b.kind] ?? 0) - (a.weight + (votes[a.kind] ?? 0)),
  )[0];

  return { kind: best.kind, text: best.text };
}
