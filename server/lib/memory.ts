/** What the coach remembers between conversations.
 *
 * A coach that starts from zero every time is a reminder with a personality. These are a small
 * number of durable facts — travels on Thursdays, bad knee, hates being called champ — written
 * by the model after a conversation and shown to the person in the app, where they can delete
 * any of them.
 *
 * Hard rule enforced by where this is called, not by the prompt: memories only ever enter
 * messages written TO THE OWNER. They never reach a witness-bound generation, because anything
 * a person can type would otherwise become a way to steer what gets sent to someone else.
 */
import Anthropic from '@anthropic-ai/sdk';

import { sql } from './db';

const LIMIT = 25;

export type Memory = { id: string; fact: string; created_at: string };

export const getMemories = async (planId: string) =>
  (await sql`
     select id::text, fact, created_at from coach_memories
      where plan_id = ${planId} order by id desc limit ${LIMIT}
   `) as Memory[];

export const forget = (planId: string, id: string) =>
  sql`delete from coach_memories where plan_id = ${planId} and id = ${Number(id)}`;

const EXTRACT = `You keep notes for a fitness coach. Read the exchange and write any durable
facts worth remembering about this person — things that would still be true next month and would
change how a good coach talks to them.

Good: schedule constraints, injuries, what they respond to, what they hate, why they started,
what keeps derailing them.
Bad: today's weight, today's mood, anything already in their plan, anything you are guessing.

Reply with one short fact per line, at most three lines. If there is nothing durable, reply with
exactly: none`;

/** Writes new memories after an exchange. Best effort — a failure here must never break a reply. */
export async function remember(planId: string, exchange: string, existing: Memory[]) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: EXTRACT,
      messages: [
        {
          role: 'user',
          content: `Already known:\n${existing.map((m) => `- ${m.fact}`).join('\n') || '(nothing yet)'}\n\nExchange:\n${exchange}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const text = block && 'text' in block ? block.text.trim() : 'none';
    if (/^none$/i.test(text)) return;

    const known = new Set(existing.map((m) => m.fact.toLowerCase()));
    for (const line of text.split('\n').map((l) => l.replace(/^[-*\d.\s]+/, '').trim()).slice(0, 3)) {
      if (line.length < 4 || line.length > 200 || known.has(line.toLowerCase())) continue;
      await sql`insert into coach_memories (plan_id, fact) values (${planId}, ${line})`;
    }
    // Keep the set small enough to stay useful and cheap to read.
    await sql`
      delete from coach_memories
       where plan_id = ${planId}
         and id not in (select id from coach_memories where plan_id = ${planId} order by id desc limit ${LIMIT})
    `;
  } catch (err) {
    console.error('[memory] extraction failed');
  }
}
