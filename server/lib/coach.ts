/** Snitch's voice.
 *
 * Claude writes the nudges so they respond to what actually happened: a first quiet morning
 * after three good weeks should not read like the fourth in a row. Every message has a written
 * fallback (NFR-7), because a nudge that doesn't go out is a broken product and a missing API key
 * or a spent budget is not the user's problem.
 *
 * Some messages are always the written line, never the model: anything that states numbers the
 * person acts on (how many weigh-ins are left), because a model that miscounts is worse than a
 * plain sentence that doesn't.
 *
 * One rule is hard-coded rather than left to the model: Snitch never comments on the number.
 */
import Anthropic from '@anthropic-ai/sdk';

import { allow, MODEL } from './budget';
import type { PlanRow, Style } from './db';
import type { WeekMath } from './rules';

export type Moment =
  // to the owner
  | { kind: 'morning'; week: WeekMath }
  | { kind: 'morning_chase'; week: WeekMath }
  | { kind: 'workout_reminder'; label: string; gym: string; hour: number }
  | { kind: 'workout_missed'; label: string; run: number }
  | { kind: 'told_them'; names: string[]; why: 'week' | 'workouts' }
  | { kind: 'mirror_intro' }
  | { kind: 'mirror_weekly' }
  // to a witness
  | { kind: 'witness_welcome' }
  | { kind: 'witness_week'; done: number; required: number }
  | { kind: 'witness_workouts'; missed: number }
  | { kind: 'witness_removed' }
  | { kind: 'witness_paused'; days: number; reason: string }
  | { kind: 'witness_ended' }
  | { kind: 'witness_finished' };

/** Snitch's personality, shared by the nudges and the chat so it's one character (VIS-5). */
export const SNITCH_VOICE = `You are Snitch, the coach in SnitchDog: a muscular German Shepherd in a white tank top with
a whistle round your neck. You're on the person's side, and you are going to tell their witnesses
if they stop showing up. Say it short when short is all it takes. Motivate: sometimes that means
blunt, sometimes kind; read which one the moment needs. Dry rather than chirpy. Never a
motivational poster, never guilt-tripping: the witnesses are the consequence, not you. You're an
AI and never pretend to be a person.`;

export const STYLE_NOTE: Record<Style, string> = {
  gentle: 'Style the person chose: Gentle. Lead with encouragement; soften the push, but still say what is true.',
  balanced: 'Style the person chose: Balanced. Warm and direct in equal measure.',
  tough: 'Style the person chose: Tough love. Blunt and short; no cushioning, never cruel.',
};

const SYSTEM = `${SNITCH_VOICE}

You are writing one message. Messages to the owner arrive as a push notification and in the
chat; messages to a witness arrive in Telegram.

When the message is to a witness, you are writing to a friend of the person, not the person:
brief, kind about them, and asking the witness to check in, never embarrassing them.

Hard rules:
- One sentence. Under 20 words. No emoji. No exclamation marks. No hashtags.
- Never comment on the person's weight, body, diet, appetite, or the number they logged. Only on
  whether they showed up.
- Never threaten anything the app does not actually do.
- No greetings, no sign-offs. Write the message only.`;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

export const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** The week, in one line: what's left and whether there's any room (Flow C). */
export function weekLine(w: WeekMath): string {
  if (!w.counting) return "It doesn't count until a witness accepts, but the habit starts now.";
  if (w.met) return `That's ${w.done} of ${w.required}. The rest of the week is free.`;
  if (w.impossible) return `This week is short no matter what now: ${w.needed} needed, ${plural(w.left - (w.todayDone ? 1 : 0), 'day')} left.`;
  if (w.noRoom) return `${w.needed} more, and every day left is needed. No more room to skip.`;
  return `${w.needed} more this week, ${plural(w.todayDone ? w.leftAfterToday : w.left, 'day')} to do it.`;
}

function template(p: PlanRow, m: Moment): string {
  const tough = p.style === 'tough';
  const gentle = p.style === 'gentle';
  switch (m.kind) {
    case 'morning':
      if (m.week.met) return "Morning. You've made the week already; the scale is optional today.";
      return `${tough ? 'Up.' : gentle ? `Morning, ${p.owner_name}.` : 'Morning.'} Step on the scale. ${weekLine(m.week)}`;
    case 'morning_chase':
      return `Still no weigh-in. ${weekLine(m.week)}`;
    case 'workout_reminder':
      return `${m.label} today. Be at ${m.gym} by ${hourLabel(m.hour)}; I'll see you get there.`;
    case 'workout_missed':
      return m.run >= 2
        ? `${m.label} missed. That's ${m.run} in a row.`
        : `${m.label} missed yesterday. One more in a row and your witnesses hear about it.`;
    case 'told_them':
      return `I told ${joinNames(m.names)}. ${m.why === 'week' ? 'Next week starts clean.' : 'Next workout is a fresh start.'}`;
    case 'mirror_intro':
      return "One more thing, now you've done a week: take a mirror photo each Sunday. It stays on your phone; I never see it. In a few months you'll be glad you did.";
    case 'mirror_weekly':
      return "Sunday. Mirror photo: it stays on your phone.";
    case 'witness_welcome':
      return `I'm Snitch, ${p.owner_name}'s coach. You're one of their witnesses: they promised to weigh in ${p.per_week} mornings a week and do their workouts. If they keep their word, you won't hear from me again.`;
    case 'witness_week':
      return `${p.owner_name} finished the week with ${m.done} of ${m.required} weigh-ins. A message from you would land better than another one from me.`;
    case 'witness_workouts':
      return `${p.owner_name} has missed ${m.missed} workouts in a row. Worth a nudge from you.`;
    case 'witness_removed':
      return `${p.owner_name} removed a witness from their plan.`;
    case 'witness_paused':
      return `${p.owner_name} has paused their plan for ${plural(m.days, 'day')} (${m.reason.toLowerCase()}). I'll pick it back up after that.`;
    case 'witness_ended':
      return `${p.owner_name} has quit the promise they asked you to witness. You won't hear from me again.`;
    case 'witness_finished':
      return `${p.owner_name} reached what they set out to do. You were their witness for it. You won't hear from me again.`;
  }
}

/** Situations the model writes; the rest are always the template. */
const SITUATION: Partial<Record<Moment['kind'], string>> = {
  workout_reminder: 'A scheduled workout is today. Remind them, naming the place and the time.',
  workout_missed: 'They missed a scheduled workout yesterday (the phone never saw them at the gym). Say so.',
  told_them: 'You have just told their witnesses they went quiet. Say so without gloating, and point forward.',
  witness_week: 'Tell the witness the week came up short and ask them to check in. Do not shame anyone.',
  witness_workouts: 'Tell the witness about a run of missed workouts and ask them to check in.',
};

/** Fixed wording (the doc's decided copy, or numbers the person acts on). */
const FIXED = new Set<Moment['kind']>([
  'morning', 'morning_chase', 'mirror_intro', 'mirror_weekly',
  'witness_welcome', 'witness_removed', 'witness_paused', 'witness_ended', 'witness_finished',
]);

export async function write(p: PlanRow, history: string, m: Moment, to?: string): Promise<string> {
  const fallback = template(p, m);
  if (FIXED.has(m.kind) || !SITUATION[m.kind]) return fallback;
  if (!(await allow(p.id))) return fallback;

  const toWitness = m.kind.startsWith('witness_');
  const audience = toWitness
    ? `You are writing to ${to ?? 'a witness'}, one of ${p.owner_name}'s witnesses.`
    : `You are writing to ${p.owner_name}, who made the promise. ${STYLE_NOTE[p.style]}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 120,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${audience}

Weigh-ins promised: ${p.per_week} mornings a week
Workouts: ${p.routine.map((s) => `${s.label} on ${s.days.length} days`).join('; ') || 'none scheduled'}
Recent history:
${history || '(nothing yet: this is the beginning)'}

Situation: ${SITUATION[m.kind]}
Facts for this message: ${JSON.stringify(m)}

A plain version, for reference: "${fallback}"

Write the message. One sentence.`,
        },
      ],
    });
    const text = res.content.find((b) => b.type === 'text');
    const out = text && 'text' in text ? text.text.trim() : '';
    // Anything long, linked or empty is a failed generation, not a message worth sending.
    return out.length > 3 && out.length < 400 && !/https?:\/\//.test(out) ? out : fallback;
  } catch {
    console.error('[coach] falling back to template');
    return fallback;
  }
}
