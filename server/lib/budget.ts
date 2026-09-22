/** The spending ceiling on the model, checked before every call.
 *
 * Two daily limits: one per plan, so a single person (or anyone who has learned a plan id) can't
 * run up the bill, and one across the whole app, so nothing can. Over either limit the caller
 * falls back to a written template — a nudge that goes out in plain words is fine; a bill nobody
 * expected is not.
 *
 * This is the in-app half. The hard stop is on Anthropic's side: prepaid credits with auto-reload
 * off, so the account cannot spend more than it holds whatever this code does.
 */
import { sql } from './db';

export const MODEL = 'claude-haiku-4-5';

const PER_PLAN = Number(process.env.AI_CALLS_PER_PLAN_PER_DAY ?? 30);
const TOTAL = Number(process.env.AI_CALLS_PER_DAY ?? 300);

/** True if this call may go to the model. Counts the call either way; fails closed. */
export async function allow(planId: string): Promise<boolean> {
  if (!process.env.ANTHROPIC_API_KEY) return false;
  const day = new Date().toISOString().slice(0, 10); // UTC — a spending day, not the owner's day
  try {
    const rows = (await sql`
      insert into ai_usage (day, scope, calls) values (${day}, ${planId}, 1), (${day}, '*', 1)
      on conflict (day, scope) do update set calls = ai_usage.calls + 1
      returning scope, calls
    `) as { scope: string; calls: number }[];
    const mine = rows.find((r) => r.scope === planId)?.calls ?? Infinity;
    const all = rows.find((r) => r.scope === '*')?.calls ?? Infinity;
    return mine <= PER_PLAN && all <= TOTAL;
  } catch {
    console.error('[budget] could not count; not spending');
    return false;
  }
}

/** Anything a person types is cut to this before it reaches the model. */
export const MAX_INPUT_CHARS = 1000;
export const clip = (s: unknown) => String(s ?? '').slice(0, MAX_INPUT_CHARS);
