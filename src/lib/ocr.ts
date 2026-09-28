/** Reading the number off a photo of the scale, on the phone (LOG-3).
 *
 * Vision (modules/scale-reader) returns every line of text it sees. A scale's display is the
 * biggest text in the frame, so the weight is the tallest confident line that parses as a number
 * with one decimal at most. Anything else on the scale (a brand name, "kg", a BMI readout in
 * smaller print) loses on height. When nothing plausible is found the reading fails, and the
 * sheet asks for a retake; after three, typing is allowed and marked unverified (Q20).
 */
import ScaleReader, { type TextLine } from '../../modules/scale-reader';

const NUMBER = /(\d{2,3})(?:[.,](\d))?/;

/** The weight in a set of recognised lines, or null. Exported for tests. */
export function pickWeight(lines: TextLine[], min = 40, max = 700): number | null {
  const candidates = lines
    .filter((l) => l.confidence >= 0.3)
    .map((l) => {
      // Seven-segment displays are often read with stray spaces or an O for a zero.
      const cleaned = l.text.replace(/[oO]/g, '0').replace(/\s+/g, '');
      const m = cleaned.match(NUMBER);
      if (!m) return null;
      const value = Number(`${m[1]}.${m[2] ?? '0'}`);
      return value >= min && value <= max ? { value, height: l.height, confidence: l.confidence } : null;
    })
    .filter((c): c is { value: number; height: number; confidence: number } => !!c)
    .sort((a, b) => b.height - a.height || b.confidence - a.confidence);
  return candidates[0]?.value ?? null;
}

export async function readScale(uri: string): Promise<number | null> {
  if (!ScaleReader) return null;
  try {
    return pickWeight(await ScaleReader.recognize(uri));
  } catch {
    return null;
  }
}
