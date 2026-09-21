/** The coach's voice.
 *
 * Claude writes the messages so they respond to what actually happened — a first quiet morning
 * after three good weeks should not read like the fourth in a row. Every message falls back to a
 * written template, because a check-in that doesn't go out is a broken product and a missing API
 * key is not the user's problem.
 *
 * One rule is hard-coded rather than left to the model: the coach never comments on the number.
 * A weight-loss app that editorialises about someone's body earns the uninstall. It only ever
 * talks about whether they showed up.
 */
import Anthropic from '@anthropic-ai/sdk';

import type { PlanRow } from './db';

export type Moment =
  | { kind: 'morning'; done: number; required: number; left: number }
  | { kind: 'morning_chase'; done: number; required: number; left: number }
  | { kind: 'weighed' }
  | { kind: 'session'; label: string }
  | { kind: 'session_chase'; label: string }
  | { kind: 'session_done'; label: string }
  | { kind: 'told_them' }
  | { kind: 'witness_week'; done: number; required: number }
  | { kind: 'witness_sessions'; missed: number }
  | { kind: 'witness_welcome' };

const SYSTEM = `You write messages for Accountable, an app where someone commits to weighing in
most mornings and training on a schedule, and names one real person — their witness — who hears
about it when they go quiet.

These messages are sent to a chat app. They are a nudge back into Accountable, not the
conversation itself — the coaching happens in the app. Say the one thing that needs saying and
stop.

Voice: direct, warm, dry. Like a friend who is not going to pretend they didn't notice.
Never a life coach, never chirpy, never a motivational poster.

Hard rules:
- One sentence. Under 20 words. No emoji. No exclamation marks. No hashtags.
- Never comment on the person's weight, body, diet, appetite, or the number they logged. Only on
  whether they showed up. Do not congratulate or commiserate about a number.
- Never threaten anything the app does not actually do.
- No greetings, no sign-offs. Write the message only.`;

const templates = (p: PlanRow, m: Moment): string => {
  switch (m.kind) {
    case 'morning':
      return m.required - m.done <= 0
        ? `Morning. Scale's free today — you've already made your ${m.required}.`
        : `Morning, ${p.owner_name}. Scale, then the app. ${m.required - m.done} more this week.`;
    case 'morning_chase':
      return `Still no number. ${m.required - m.done} to go, ${m.left} ${m.left === 1 ? 'day' : 'days'} left.`;
    case 'weighed':
      return 'Logged.';
    case 'session':
      return `Did you get your ${m.label.toLowerCase()} in?`;
    case 'session_chase':
      return `Still nothing on the ${m.label.toLowerCase()}. Two taps.`;
    case 'session_done':
      return 'Logged.';
    case 'told_them':
      return `I told ${p.witness_name}. Nothing dramatic — just that you went quiet. Next week starts clean.`;
    case 'witness_week':
      return `${p.owner_name} finished the week with ${m.done} of ${m.required} weigh-ins. A message from you would land better than another one from me.`;
    case 'witness_sessions':
      return `${p.owner_name} has missed ${m.missed} sessions in a row. Worth a nudge from you.`;
    case 'witness_welcome':
      return `You're now ${p.owner_name}'s witness. They promised to weigh in ${p.per_week} mornings a week and train on schedule. I'll only message you if they stop showing up.`;
  }
};

const SITUATION: Record<Moment['kind'], string> = {
  morning: 'It is their wake-up hour and they have not weighed in today. Ask for the number.',
  morning_chase: 'Hours have passed and still no number. Ask again, shorter.',
  weighed: 'They just logged a morning weigh-in. Acknowledge it in passing — one short line, and say nothing about the number itself.',
  session: 'A training session they scheduled is due. Ask whether they got it in.',
  session_chase: 'They have not answered about the session. Ask again, sharper.',
  session_done: 'They just confirmed the session. Acknowledge it briefly.',
  told_them: 'You have just told their witness they went quiet. Say so without gloating, and point forward.',
  witness_week: 'Tell the witness the week came up short and ask them to check in. Do not shame anyone.',
  witness_sessions: 'Tell the witness about a run of missed sessions and ask them to check in.',
  witness_welcome: 'They just accepted. Tell them what they signed up for and that they will rarely hear from you.',
};

export async function write(p: PlanRow, history: string, m: Moment): Promise<string> {
  const fallback = templates(p, m);
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const toWitness = m.kind.startsWith('witness_');
  const audience = toWitness
    ? `You are writing to ${p.witness_name}, the witness, about ${p.owner_name}.`
    : `You are writing to ${p.owner_name}, who made the promise.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${audience}

Weigh-ins promised: ${p.per_week} mornings a week
Training: ${p.routine.map((s) => `${s.label} on ${s.days.length} days`).join('; ') || 'none scheduled'}
Witness: ${p.witness_name}
Recent history:
${history || '(nothing yet — this is the beginning)'}

Situation: ${SITUATION[m.kind]}

Write the message. One sentence.`,
        },
      ],
    });
    const text = res.content.find((b) => b.type === 'text');
    const out = text && 'text' in text ? text.text.trim() : '';
    // Anything long, linked or empty is a failed generation, not a message worth sending.
    return out.length > 3 && out.length < 400 && !/https?:\/\//.test(out) ? out : fallback;
  } catch (err) {
    console.error('[coach] falling back to template');
    return fallback;
  }
}
