/** The bot. Only witnesses use Telegram (TG-1): they arrive through their own invite link, get
 *  the occasional app-authored message, and can always leave with /stop. The owner hears from
 *  Snitch in the app.
 */
import { write } from '@/lib/coach';
import { type PlanRow, type WitnessRow, getPlan, getWitnesses, isWatching, sql, witnessName } from '@/lib/db';
import { tellOwner } from '@/lib/notify';
import { send } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

type Update = {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
};

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('nope', { status: 401 });
  }

  const msg = ((await req.json()) as Update).message;
  if (!msg?.text) return Response.json({ ok: true });
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  if (text.startsWith('/start')) {
    const payload = text.split(' ')[1] ?? '';
    if (!payload.startsWith('w_')) {
      await send(chatId, 'This is how SnitchDog reaches witnesses. If someone asked you to be theirs, open the link they sent you.');
      return Response.json({ ok: true });
    }

    const w = ((await sql`select * from witnesses where token = ${payload.slice(2)} and removed_at is null`)[0] as WitnessRow) ?? null;
    const plan = w ? await getPlan(w.plan_id) : null;
    if (!w || !plan) {
      await send(chatId, 'That invite doesn’t work any more. Ask them to send you a new one.');
      return Response.json({ ok: true });
    }
    if (w.linked_at) {
      await send(chatId, w.chat_id === chatId ? 'You’re already their witness.' : 'That invite has already been used.');
      return Response.json({ ok: true });
    }
    if (new Date(w.expires_at) < new Date()) {
      await send(chatId, 'That invite has expired. Ask them to send you a new one.');
      return Response.json({ ok: true });
    }

    const tgName = msg.from?.first_name?.slice(0, 40) ?? null;
    // Single use: the token is spent the moment someone accepts it (TG-5).
    await sql`
      update witnesses set chat_id = ${chatId}, linked_at = now(), tg_name = ${tgName}, stopped_at = null
       where id = ${w.id}
    `;
    await send(chatId, await write(plan, '', { kind: 'witness_welcome' }));
    await send(chatId, 'Send /stop any time and I’ll never message you again.');
    await tellOwner(plan, `${w.name ?? tgName ?? 'A witness'} accepted. It counts now.`, 'witness_accepted', 'home', { witnessId: w.id });
    return Response.json({ ok: true });
  }

  // The witness's way out, which is not optional (P4, WIT-7).
  if (text === '/stop') {
    const watching = ((await sql`select * from witnesses where chat_id = ${chatId}`) as WitnessRow[]).filter(isWatching);
    for (const w of watching) {
      await sql`update witnesses set stopped_at = now() where id = ${w.id}`;
      const plan = (await getPlan(w.plan_id)) as PlanRow;
      const left = (await getWitnesses(plan.id)).filter(isWatching).length;
      await tellOwner(
        plan,
        left ? `${witnessName(w)} stepped back.` : `${witnessName(w)} stepped back. Nobody is watching until you invite someone.`,
        'witness_stopped',
        'home',
        { witnessId: w.id },
      );
    }
    await send(chatId, watching.length ? 'Done. You won’t hear from me again.' : 'You’re not watching anyone.');
    return Response.json({ ok: true });
  }

  await send(chatId, 'I only send the occasional update here. Send /stop to stop being a witness.');
  return Response.json({ ok: true });
}
