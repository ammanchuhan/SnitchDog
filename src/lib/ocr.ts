/** Reading the number off a photo of the scale, on the phone (LOG-3).
 *
 * Not wired up yet: the Apple Vision module lands with the native features (section 7 of the
 * build order). Until then every read fails, which exercises the "can't read it" path and the
 * typed, unverified fallback after three tries (Q20).
 */
export async function readScale(_uri: string): Promise<number | null> {
  return null;
}
