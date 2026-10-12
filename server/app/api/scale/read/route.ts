/** Reads the weight off a photo of the scale (LOG-2).
 *
 * The phone sends a downsized JPEG; Claude reads the display and only the number comes back. The
 * image is never written anywhere: not to the database, not to disk, not to the logs. It exists
 * for the length of this request. If this route can't be reached, the phone falls back to reading
 * the photo itself with Apple's Vision.
 */
import Anthropic from '@anthropic-ai/sdk';

import { allow, MODEL } from '@/lib/budget';
import { authed, bad, readJson } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';
import { parseReading } from '@/lib/scale';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Base64 of a ~1024 px JPEG is well under this; anything bigger isn't what the app sends. */
const MAX_IMAGE_CHARS = 600 * 1024;

const PROMPT = `This is a photo of a bathroom scale. Read the weight on its display.

Reply with only the number exactly as the display shows it, digits and decimal point, for example 209.4.
Scale displays use seven-segment digits and a small decimal point; read them carefully.
If there is no scale display, or you can't read every digit with confidence, reply with exactly: NONE`;

export const POST = authed(
  async (req, { plan }) => {
    const { image } = await readJson(req, MAX_IMAGE_CHARS + 1024);
    if (typeof image !== 'string' || !image || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image)) {
      return bad('That photo didn’t come through. Try again.');
    }
    if (!(await allow(plan.id))) return Response.json({ value: null, reason: 'budget' });

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 16,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      });
      const block = res.content.find((b) => b.type === 'text');
      const value = block && 'text' in block ? parseReading(block.text) : null;
      return Response.json({ value });
    } catch (err) {
      // The image is deliberately never logged; only that the read failed.
      console.error('[scale/read] failed', err instanceof Anthropic.APIError ? err.status : '');
      return Response.json({ value: null, reason: 'unavailable' });
    }
  },
  { limit: LIMITS.scaleRead },
);
