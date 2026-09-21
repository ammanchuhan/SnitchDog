/** What counts as a plausible body weight, and a goal the app will hold someone to.
 *
 * A weight-loss app that happily builds a plan around "get to 10 lb" is either broken or
 * dangerous, and both read the same to the person using it. These limits are deliberately
 * generous — they exist to catch typos and plainly harmful targets, not to second-guess anyone's
 * body. A tighter, BMI-based floor needs height, which the app doesn't ask for yet (spec §8.2).
 */
import type { Goal } from './types';

type Unit = Goal['unit'];

/** Any single number outside this is a typo or a unit mix-up, not a body weight. */
export const WEIGHT_RANGE: Record<Unit, readonly [number, number]> = { lb: [70, 700], kg: [32, 320] };

/** The furthest a target may sit from where someone starts. Past this it's a different plan —
 *  set a new target on arrival instead. */
const MAX_LOSS = 0.35;
const MAX_GAIN = 0.25;

/** A single reading that moves more than this from the last one is worth a second look. */
const JUMP = 0.05;

const round = (v: number) => Math.round(v * 10) / 10;
const LB_PER_KG = 2.20462;

export const convert = (v: number, from: Unit, to: Unit) =>
  from === to ? v : from === 'lb' ? v / LB_PER_KG : v * LB_PER_KG;

/** Null when the number could be a body weight; otherwise, what's wrong with it. */
export function checkWeight(value: number, unit: Unit): string | null {
  if (!(value > 0)) return null; // empty field — nothing to say yet
  const [lo, hi] = WEIGHT_RANGE[unit];
  if (value < lo || value > hi) {
    return `That doesn't look like a body weight. It should be between ${lo} and ${hi} ${unit}.`;
  }
  return null;
}

/** Null when the target is one the app will hold someone to; otherwise, why not. */
export function checkTarget(start: number, target: number, unit: Unit): string | null {
  if (!(start > 0) || !(target > 0)) return null;
  const bad = checkWeight(target, unit);
  if (bad) return bad;
  if (round(target) === round(start)) return 'That’s where you are now. Pick where you want to get to.';

  const change = (target - start) / start;
  if (change < -MAX_LOSS) {
    return `That’s ${Math.round(-change * 100)}% below where you’re starting. Aim no lower than ${round(
      start * (1 - MAX_LOSS),
    )} ${unit} for now — you can set a new target when you get there.`;
  }
  if (change > MAX_GAIN) {
    return `That’s ${Math.round(change * 100)}% above where you’re starting. Aim no higher than ${round(
      start * (1 + MAX_GAIN),
    )} ${unit} for now.`;
  }
  return null;
}

/** A soft warning, never a block: the scale said what it said. */
export function checkJump(value: number, last: number | undefined, unit: Unit): string | null {
  if (!(value > 0) || !last) return null;
  const diff = value - last;
  if (Math.abs(diff) / last > JUMP) {
    return `That’s ${diff > 0 ? '+' : ''}${round(diff)} ${unit} from your last entry. Worth a second look before you log it.`;
  }
  return null;
}
