/** What counts as a plausible body weight, and a goal the app will hold someone to.
 *
 * A weight-loss app that happily builds a plan around "get to 10 lb" is either broken or
 * dangerous, and both read the same to the person using it. With a height, the limits are
 * personal: a target has to sit at or above the bottom of the healthy range for that height
 * (BMI 18.5). Without one — plans made before sign-up asked — only typos and plainly harmful
 * targets are caught. The limits never quote a bare range like "70 to 700": a number that isn't
 * about you reads as a form, not advice.
 */
import type { Goal, HeightUnit } from './types';

type Unit = Goal['unit'];

const LB_PER_KG = 2.20462;
const round = (v: number) => Math.round(v * 10) / 10;

export const convert = (v: number, from: Unit, to: Unit) =>
  from === to ? v : from === 'lb' ? v / LB_PER_KG : v * LB_PER_KG;

/** The healthy range for a height, in BMI. */
const HEALTHY = [18.5, 24.9] as const;
/** Outside this, the number is a typo or a unit mix-up, not a body. Deliberately very wide. */
const PLAUSIBLE_BMI = [12, 80] as const;
/** Used only when there's no height to be personal with. */
const PLAUSIBLE_WEIGHT: Record<Unit, readonly [number, number]> = { lb: [50, 800], kg: [23, 360] };

/** The furthest a target may sit from where someone starts. Past this it's a different plan —
 *  set a new target on arrival instead. */
const MAX_LOSS = 0.35;
const MAX_GAIN = 0.25;
/** The heaviest target the app will set for someone putting weight on. Strongmen go past it;
 *  a first target shouldn't. */
const MAX_BUILD_BMI = 34;

/** A single reading that moves more than this from the last one is worth a second look. */
const JUMP = 0.05;

/** The weight at a given BMI for a height, in the unit asked for. */
export const weightAt = (bmi: number, heightCm: number, unit: Unit) =>
  convert(bmi * (heightCm / 100) ** 2, 'kg', unit);

export const bmiOf = (value: number, unit: Unit, heightCm: number) =>
  convert(value, unit, 'kg') / (heightCm / 100) ** 2;

/** The healthy range for this height, rounded to whole numbers for reading. */
export const healthyRange = (heightCm: number, unit: Unit) =>
  [Math.ceil(weightAt(HEALTHY[0], heightCm, unit)), Math.floor(weightAt(HEALTHY[1], heightCm, unit))] as const;

/** A height and the way its owner reads heights, so messages quote it back the same way. */
export type Height = { cm: number; unit: HeightUnit };

/** Build one from a profile, when there's a height to build it from. */
export const heightOf = (p?: { heightCm?: number; heightUnit?: HeightUnit }): Height | undefined =>
  p?.heightCm ? { cm: p.heightCm, unit: p.heightUnit ?? 'ft' } : undefined;

/** 5′10″ or 178 cm, whichever they entered it in. */
export function heightLabel({ cm: heightCm, unit }: Height) {
  if (unit === 'cm') return `${Math.round(heightCm)} cm`;
  const inches = Math.round(heightCm / 2.54);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

/** Null when the number could be this person's weight; otherwise, what's wrong with it. */
export function checkWeight(value: number, unit: Unit, height?: Height): string | null {
  if (!(value > 0)) return null; // empty field — nothing to say yet
  if (height) {
    const bmi = bmiOf(value, unit, height.cm);
    if (bmi < PLAUSIBLE_BMI[0] || bmi > PLAUSIBLE_BMI[1]) {
      return `${value} ${unit} doesn’t look right for someone ${heightLabel(height)}. Check the number, and that it’s in ${unit}.`;
    }
    return null;
  }
  const [lo, hi] = PLAUSIBLE_WEIGHT[unit];
  if (value < lo || value > hi) return `That doesn’t look like a body weight in ${unit}. Check the number and the unit.`;
  return null;
}

/** Null when the target is one the app will hold someone to; otherwise, why not. */
export function checkTarget(start: number, target: number, unit: Unit, height?: Height): string | null {
  if (!(start > 0) || !(target > 0)) return null;
  const bad = checkWeight(target, unit, height);
  if (bad) return bad;
  if (round(target) === round(start)) return 'That’s where you are now. Pick where you want to get to.';

  if (height && target < start) {
    const [floor] = healthyRange(height.cm, unit);
    if (target < floor) {
      return `For someone ${heightLabel(height)}, a healthy weight starts around ${floor}\u00a0${unit}. Aim no lower than that.`;
    }
  }

  // Building muscle can carry someone well past the top of the healthy range, not this far.
  if (height && target > start && bmiOf(target, unit, height.cm) > MAX_BUILD_BMI) {
    if (bmiOf(start, unit, height.cm) > MAX_BUILD_BMI) {
      return `At ${heightLabel(height)}, ${start}\u00a0${unit} is already past what muscle usually accounts for. Set a target below where you are.`;
    }
    return `Even for someone who lifts, ${target}\u00a0${unit} at ${heightLabel(height)} is more than muscle usually accounts for. Aim no higher than ${Math.floor(
      weightAt(MAX_BUILD_BMI, height.cm, unit),
    )}\u00a0${unit}.`;
  }

  const change = (target - start) / start;
  if (change < -MAX_LOSS) {
    return `That’s ${Math.round(-change * 100)}% below where you’re starting. Aim no lower than ${Math.ceil(
      start * (1 - MAX_LOSS),
    )} ${unit} for now — you can set a new target when you get there.`;
  }
  if (change > MAX_GAIN) {
    return `That’s ${Math.round(change * 100)}% above where you’re starting. Aim no higher than ${Math.floor(
      start * (1 + MAX_GAIN),
    )} ${unit} for now.`;
  }
  return null;
}

/** The line under the target field when nothing is wrong. The bottom of the healthy range is a
 *  real floor; the top isn't a ceiling — BMI can't tell muscle from fat, and a 5′10″ lifter at
 *  200 lb is chasing something entirely reasonable. So a heavy target gets a nod, not a warning. */
export function targetNote(start: number, target: number, unit: Unit, height: Height): string {
  const [floor, top] = healthyRange(height.cm, unit);
  const h = heightLabel(height);
  if (!(target > 0) || !(start > 0)) {
    return `For someone ${h}, a healthy weight starts around ${floor}\u00a0${unit}. Above ${top} is fine if it\u2019s muscle.`;
  }
  const bmi = bmiOf(target, unit, height.cm);
  const gaining = target > start;
  // Jokes are for building up. Someone bringing a high weight down gets a straight answer.
  if (!gaining) return `For someone ${h}, a healthy weight starts around ${floor}\u00a0${unit}. ${target} is a solid first stop.`;
  if (bmi >= 31) return `${target}\u00a0${unit} at ${h}. That\u2019s offensive-line territory. The scale won\u2019t know it\u2019s muscle, but the squat rack will.`;
  if (bmi >= 28) return `${target}\u00a0${unit} at ${h}? Somebody\u2019s planning to pick up heavy things. Respect.`;
  if (bmi >= 25) return `Building, then. ${target}\u00a0${unit} at ${h} is a lot of muscle to go and get. Eat, lift, repeat.`;
  return `Putting weight on. Most of it should come from the gym, not the drive-through.`;
}

/** A first target worth suggesting: about 10% down, never below the healthy range; or, for
 *  someone under it, the bottom of the range. Whole numbers, because nobody aims for 171.3. */
export function suggestTarget(start: number, unit: Unit, heightCm: number): number {
  const [floor, top] = healthyRange(heightCm, unit);
  if (start < floor) return floor;
  if (start > top) return Math.round(Math.max(start * 0.9, top));
  return Math.round(Math.max(start * 0.95, floor));
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
