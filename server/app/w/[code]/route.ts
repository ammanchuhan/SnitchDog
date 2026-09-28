import { open } from '@/lib/http';
import { LIMITS } from '@/lib/ratelimit';

/** snitchdog.com/w/<code>: the witness invite link. Redirects into the bot with the code, so the
 *  link in the text message is ours and the bot can be renamed without breaking old invites. */
export const dynamic = 'force-dynamic';

export const GET = open(async (_req, { params }) => {
  const { code } = await params;
  const bot = process.env.TELEGRAM_BOT_USERNAME ?? 'AccountableCoach_bot';
  if (!/^[\w-]{8,40}$/.test(code)) return new Response('Not an invite', { status: 404 });
  return Response.redirect(`https://t.me/${bot}?start=w_${code}`, 302);
}, LIMITS.invite);
