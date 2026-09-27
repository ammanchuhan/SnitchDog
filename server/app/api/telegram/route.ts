/** The bot. Everything a person does outside the app happens here.
 *
 * Owners link their chat from the app, answer session questions with two buttons and log a
 * weigh-in by sending a photo of the scale with the number as the caption. Witnesses arrive through a deep link and never have to learn
 * a single command.
 */
import { write } from '@/lib/coach';
import { byOwnerChat, byWitnessToken, getPlan, getSessions, getWeighIns, sql } from '@/lib/db';
import { ackCallback, clearButtons, send } from '@/lib/telegram';
import { localNow, weekStart } from '@/lib/time';
import { requiredInWeek } from '@/lib/ladder';

export const dynamic = 'force-dynamic';

type Update = {
  message?: {
    chat: { id: number };
    text?: string;
    caption?: string;
    /** Every size Telegram made of a sent photo, smallest first. */
    photo?: { file_id: string }[];
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
};

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('nope', { status: 401 });
  }

  const update = (await req.json()) as Update;

  /* ── a button on a session question ─────────────────────────────────── */
  if (update.callback_query) {
    const q = update.callback_query;
    const chatId = String(q.message?.chat.id ?? '');
    const plan = await byOwnerChat(chatId);
    const [, date, slotId, status] = (q.data ?? '').split('|');

    if (!plan || !date || !slotId || (status !== 'done' && status !== 'missed')) {
      await ackCallback(q.id, 'That one has expired.');
      return Response.json({ ok: true });
    }

    await sql`
      insert into sessions (plan_id, date, slot_id, status, answered_at, asked_step)
      values (${plan.id}, ${date}, ${slotId}, ${status}, now(), 3)
      on conflict (plan_id, date, slot_id) do update
        set status = excluded.status, answered_at = now(), asked_step = 3
    `;
    await ackCallback(q.id, status === 'done' ? 'Logged' : 'Noted');
    if (q.message) await clearButtons(chatId, q.message.message_id);

    const slot = plan.routine.find((s) => s.id === slotId);
    if (status === 'done') {
      await send(chatId, await write(plan, '', { kind: 'session_done', label: slot?.label ?? 'session' }));
    } else {
      await send(chatId, `Noted. Two in a row and ${plan.witness_name} hears about it.`);
    }
    return Response.json({ ok: true });
  }

  /* ── a message ──────────────────────────────────────────────────────── */
  const msg = update.message;
  if (!msg || (!msg.text && !msg.photo)) return Response.json({ ok: true });
  const chatId = String(msg.chat.id);
  const text = (msg.text ?? '').trim();

  if (text.startsWith('/start')) {
    const payload = text.split(' ')[1] ?? '';

    if (payload.startsWith('w_')) {
      const plan = await byWitnessToken(payload.slice(2));
      if (!plan) {
        await send(chatId, 'That invite has expired. Ask them to send you a new one.');
        return Response.json({ ok: true });
      }
      await sql`update plans set witness_chat_id = ${chatId}, witness_linked_at = now() where id = ${plan.id}`;
      await send(chatId, await write(plan, '', { kind: 'witness_welcome' }));
      await send(chatId, 'Send /stop at any time and I will never message you again.');
      if (plan.owner_chat_id) await send(plan.owner_chat_id, `${plan.witness_name} accepted. It counts now.`);
      return Response.json({ ok: true });
    }

    if (payload.startsWith('o_')) {
      const plan = await getPlan(payload.slice(2));
      if (!plan) {
        await send(chatId, 'I could not find that plan.');
        return Response.json({ ok: true });
      }
      await sql`update plans set owner_chat_id = ${chatId} where id = ${plan.id}`;
      await send(
        chatId,
        `Linked. I'll nudge you at ${plan.wake_hour}:00 and when a session is due — the coaching itself lives in the app.\n\nIn a pinch, reply with a number and I'll log it.\n\n${
          plan.witness_chat_id
            ? `${plan.witness_name} is watching.`
            : `${plan.witness_name} hasn't accepted yet — until they do, this is just a reminder.`
        }`,
      );
      return Response.json({ ok: true });
    }

    await send(chatId, 'SnitchDog sends your check-ins here. Open the app to set it up.');
    return Response.json({ ok: true });
  }

  /* ── the witness's way out, which is not optional ───────────────────── */
  if (text === '/stop') {
    const watched = (await sql`select * from plans where witness_chat_id = ${chatId}`) as { id: string; owner_chat_id: string | null; witness_name: string }[];
    for (const plan of watched) {
      await sql`update plans set witness_chat_id = null, witness_linked_at = null where id = ${plan.id}`;
      if (plan.owner_chat_id) {
        await send(plan.owner_chat_id, `${plan.witness_name} has stepped back. Nobody is watching until you name someone else.`);
      }
    }
    await send(chatId, watched.length ? 'Done. You will not hear from me again.' : 'You are not watching anyone.');
    return Response.json({ ok: true });
  }

  const plan = await byOwnerChat(chatId);
  if (!plan) return Response.json({ ok: true });

  if (text === '/status') {
    const [weighIns, sessions] = await Promise.all([getWeighIns(plan.id), getSessions(plan.id)]);
    const { date } = localNow(plan.timezone);
    const thisWeek = weighIns.filter((w) => weekStart(w.date) === weekStart(date)).length;
    const told = sessions.filter((s) => s.escalated_at).length + plan.escalated_weeks.length;
    await send(
      chatId,
      `<b>Get to ${Number(plan.target_value)} ${plan.unit}</b>\n` +
        `${thisWeek} of ${requiredInWeek(plan, date)} weigh-ins this week.\n` +
        `${plan.witness_name} has been told ${told} ${told === 1 ? 'time' : 'times'}.`,
    );
    return Response.json({ ok: true });
  }

  // A weigh-in is a photo of the scale with the number as its caption. A typed number alone
  // doesn't count: it's the one thing anyone could fake, and the app doesn't accept it either.
  const numberIn = (s: string) => {
    const v = Number(s.replace(/[^0-9.]/g, ''));
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  if (msg.photo?.length) {
    const value = numberIn(msg.caption ?? '');
    if (value === null) {
      await send(chatId, 'Got the photo. Send it again with the number as the caption so I can log it.');
      return Response.json({ ok: true });
    }
    const { date } = localNow(plan.timezone);
    const fileId = msg.photo[msg.photo.length - 1].file_id; // the largest size
    await sql`
      insert into weigh_ins (plan_id, date, value, proof, photo_file_id)
      values (${plan.id}, ${date}, ${value}, 'telegram', ${fileId})
      on conflict (plan_id, date) do update
        set value = excluded.value, logged_at = now(), proof = 'telegram', photo_file_id = excluded.photo_file_id
    `;
    await send(chatId, await write(plan, '', { kind: 'weighed' }));
    return Response.json({ ok: true });
  }

  if (numberIn(text) !== null) {
    await send(
      chatId,
      'I need the photo too. Take a picture of the scale showing the number and send it with the number as the caption — or log it in the app.',
    );
  }

  return Response.json({ ok: true });
}
