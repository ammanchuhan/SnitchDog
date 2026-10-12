/** Reading the number off a photo of the scale (LOG-2, LOG-3).
 *
 * The photo is shrunk on the phone and sent to our server, where Claude reads the display; only
 * the number comes back and the image isn't kept anywhere. Scale displays use seven-segment
 * digits that Apple's on-device text recognition often misreads, which is why this goes to a
 * model. Without a connection, the phone falls back to reading it itself with Vision
 * (modules/scale-reader), so an offline weigh-in still works.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import ScaleReader, { type TextLine } from '../../modules/scale-reader';
import { ApiError, readScalePhoto } from './api';

/** Long edge of the photo sent to the server: enough to read a display, about 100 KB. */
const SEND_WIDTH = 1024;

const NUMBER = /(\d{2,3})(?:[.,](\d))?/;

/** The weight in a set of lines Vision recognised, or null. The display is the tallest text. */
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

async function readOnPhone(uri: string): Promise<number | null> {
  if (!ScaleReader) return null;
  try {
    return pickWeight(await ScaleReader.recognize(uri));
  } catch {
    return null;
  }
}

export async function readScale(uri: string): Promise<number | null> {
  let image: string | undefined;
  try {
    const rendered = await ImageManipulator.manipulate(uri).resize({ width: SEND_WIDTH }).renderAsync();
    image = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true })).base64;
  } catch {
    return readOnPhone(uri);
  }
  if (!image) return readOnPhone(uri);

  try {
    const { value } = await readScalePhoto(image);
    return value;
  } catch (err) {
    // No connection: read it here instead. Any other failure is a failed read (retake).
    if (err instanceof ApiError && err.status === 0) return readOnPhone(uri);
    return null;
  }
}
