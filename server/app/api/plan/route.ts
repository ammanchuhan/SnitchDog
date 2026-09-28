import { randomBytes } from 'node:crypto';

import { type Gym, type PlanRow, type RoutineSlot, sql } from '@/lib/db';
import { authed, bad, planResponse, plausibleWeight, readJson, signedIn } from '@/lib/http';

export const dynamic = 'force-dynamic';

const token = () => randomBytes(12).toString('base64url');
const GENDERS = ['woman', 'man', 'non_binary', 'prefer_not'];
const STYLES = ['gentle', 'balanced', 'tough'];

/** The signed-in account's plan. 404 means they haven't finished sign-up. */
export const GET = authed(async (req, c) => {
  return planResponse(c.plan);
});

/** Finishing sign-up creates the plan and one invite per witness (SIGNUP-5). The witnesses'
 *  names stay on the phone until they accept (WIT-8), so only the count comes up. */
export const POST = signedIn(async (req, c) => {
  if (c.plan) return bad('This account already has a plan.', 409);

  const b = await readJson(req);
  const unit = b.unit === 'kg' ? 'kg' : 'lb';
  const heightCm = typeof b.heightCm === 'number' && b.heightCm >= 90 && b.heightCm <= 250 ? b.heightCm : null;
  const age = Number.isInteger(b.age) && b.age >= 18 && b.age <= 100 ? b.age : null;
  const witnesses = Number(b.witnesses);

  if (typeof b.ownerName !== 'string' || !b.ownerName.trim()) return bad('A first name is needed.');
  if (!age) return bad('SnitchDog is for adults, 18 and over.');
  if (!heightCm) return bad('That height doesn’t look right.');
  if (!plausibleWeight(b.start, unit, heightCm) || !plausibleWeight(b.target, unit, heightCm)) {
    return bad('That weight doesn’t look right.');
  }
  if (!(witnesses >= 1 && witnesses <= 3)) return bad('Name one to three witnesses.');
  if (typeof b.timezone !== 'string' || !b.timezone) return bad('Missing timezone.');

  const id = token().slice(0, 12);
  await sql`
    insert into plans
      (id, account_id, owner_name, timezone, unit, start_value, target_value, per_week,
       height_cm, height_unit, age, gender)
    values
      (${id}, ${c.account.id}, ${b.ownerName.trim().slice(0, 40)}, ${b.timezone}, ${unit},
       ${b.start}, ${b.target}, 3, ${heightCm}, ${b.heightUnit === 'cm' ? 'cm' : 'ft'}, ${age},
       ${GENDERS.includes(b.gender) ? b.gender : null})
  `;
  for (let i = 0; i < witnesses; i += 1) {
    await sql`insert into witnesses (id, plan_id, token) values (${token()}, ${id}, ${token()})`;
  }
  const plan = (await sql`select * from plans where id = ${id}`)[0] as PlanRow;
  return planResponse(plan);
});

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

/** "4 workouts: Mon, Wed, Fri, Sat at Iron Works by 6 pm · 8,000 steps a day" (COACH-5). */
function planSummary(routine: RoutineSlot[], gym: Gym | null, stepsGoal: number | null) {
  const parts = routine.map((s) => {
    const days = [...s.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY[d]).join(', ');
    return `${s.days.length} workout${s.days.length === 1 ? '' : 's'}: ${days}${gym ? ` at ${gym.name}` : ''} by ${hourLabel(s.hour)}`;
  });
  if (stepsGoal) parts.push(`${stepsGoal.toLocaleString('en-US')} steps a day`);
  return parts.join(' · ');
}

const validSlot = (s: any): s is RoutineSlot =>
  s &&
  typeof s.id === 'string' &&
  typeof s.label === 'string' &&
  Array.isArray(s.days) &&
  s.days.length > 0 &&
  s.days.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6) &&
  Number.isInteger(s.hour) &&
  s.hour >= 5 &&
  s.hour <= 23;

const validGym = (g: any): g is Gym =>
  g &&
  typeof g.name === 'string' &&
  Math.abs(g.lat) <= 90 &&
  Math.abs(g.lng) <= 180 &&
  typeof g.radius === 'number' &&
  g.radius >= 50 &&
  g.radius <= 500;

/** Edits from Profile › Your plan and Snitch's style, and confirming the plan Snitch proposed.
 *  The weekly floor and the 4 am push aren't editable (PROF-2). */
export const PATCH = authed(async (req, c) => {
  const p = c.plan;
  const b = await readJson(req);

  if (b.heightCm !== undefined) {
    if (!(typeof b.heightCm === 'number' && b.heightCm >= 90 && b.heightCm <= 250)) return bad('That height doesn’t look right.');
    await sql`update plans set height_cm = ${b.heightCm}, height_unit = ${b.heightUnit === 'cm' ? 'cm' : 'ft'} where id = ${p.id}`;
    p.height_cm = String(b.heightCm);
  }
  if (b.target !== undefined) {
    if (!plausibleWeight(b.target, p.unit, p.height_cm ? Number(p.height_cm) : null)) return bad('That weight doesn’t look right.');
    await sql`update plans set target_value = ${b.target} where id = ${p.id}`;
  }
  if (b.style !== undefined) {
    if (!STYLES.includes(b.style)) return bad('Unknown style.');
    await sql`update plans set style = ${b.style} where id = ${p.id}`;
  }
  if (b.timezone !== undefined && typeof b.timezone === 'string') {
    await sql`update plans set timezone = ${b.timezone} where id = ${p.id}`;
  }

  // The plan itself: a whole new routine, gym and steps goal at once, as Snitch's card proposes it.
  if (b.routine !== undefined || b.gym !== undefined || b.stepsGoal !== undefined) {
    const routine = b.routine ?? p.routine;
    const gym = b.gym ?? p.gym;
    const stepsGoal = b.stepsGoal ?? p.steps_goal;
    if (!Array.isArray(routine) || routine.length > 7 || !routine.every(validSlot)) return bad('That workout schedule doesn’t work.');
    if (routine.length && !validGym(gym)) return bad('Every workout needs a place to happen.');
    if (stepsGoal !== null && !(Number.isInteger(stepsGoal) && stepsGoal >= 1000 && stepsGoal <= 40000)) return bad('That step goal doesn’t look right.');
    await sql`
      update plans
         set routine = ${JSON.stringify(routine)}, gym = ${gym ? JSON.stringify(gym) : null},
             steps_goal = ${stepsGoal}, plan_confirmed_at = coalesce(plan_confirmed_at, now())
       where id = ${p.id}
    `;
    // The chat keeps a record of what was agreed (COACH-5); no push, they just confirmed it.
    await sql`
      insert into coach_messages (plan_id, role, text, kind)
      values (${p.id}, 'coach', ${`Plan set. ${planSummary(routine, gym, stepsGoal)}`}, 'plan_confirmed')
    `;
  }

  return planResponse((await sql`select * from plans where id = ${p.id}`)[0] as PlanRow);
});
