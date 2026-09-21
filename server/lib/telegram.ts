/** Telegram is the delivery channel: the owner gets check-ins there and the witness gets
 *  the escalation, without installing anything. */
const API = (method: string) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

type Button = { text: string; data: string };

export async function send(chatId: string, text: string, buttons?: Button[]) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  };
  if (buttons?.length) {
    body.reply_markup = {
      inline_keyboard: [buttons.map((b) => ({ text: b.text, callback_data: b.data }))],
    };
  }
  const res = await fetch(API('sendMessage'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error('[telegram] send failed', await res.text());
  return res.ok;
}

/** Stops the button spinner and, optionally, leaves a toast. */
export async function ackCallback(id: string, text?: string) {
  await fetch(API('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

/** Removes the buttons from a message that has been answered, so it can't be answered twice. */
export async function clearButtons(chatId: string, messageId: number) {
  await fetch(API('editMessageReplyMarkup'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  });
}
