/** Point the bot at a deployment (or remove the webhook with `node scripts/webhook.mjs delete`).
 *
 *   node --env-file=.env.local scripts/webhook.mjs https://accountable-server.vercel.app
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
const arg = process.argv[2];

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const call = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
};

if (arg === 'delete') {
  console.log(await call('deleteWebhook'));
} else if (arg === 'info') {
  console.log(await call('getWebhookInfo'));
} else if (arg) {
  console.log(
    await call('setWebhook', {
      url: `${arg.replace(/\/$/, '')}/api/telegram`,
      secret_token: secret || undefined,
      allowed_updates: ['message', 'callback_query'],
    }),
  );
} else {
  console.log('usage: webhook.mjs <https://your-deployment> | info | delete');
}
