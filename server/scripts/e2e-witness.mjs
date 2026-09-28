// Plays a witness on Telegram for the e2e account: sends the bot what Telegram would send.
//   node --env-file=.env.local scripts/e2e-witness.mjs   (from server/) <email> accept <n> <first name>
//   node --env-file=.env.local scripts/e2e-witness.mjs   (from server/) <email> stop <n>
import { neon } from '@neondatabase/serverless';

const [email, action, n, firstName] = process.argv.slice(2);
const sql = neon(process.env.DATABASE_URL);
const API = process.env.API ?? 'http://localhost:3111';

const witnesses = await sql`
  select w.token, w.chat_id from witnesses w
    join plans p on p.id = w.plan_id join accounts a on a.id = p.account_id
   where a.email = ${email} and w.removed_at is null
   order by w.created_at`;
const w = witnesses[Number(n) - 1];
if (!w) throw new Error(`no witness ${n} for ${email}`);

// A fake chat id per witness: sending to it fails at Telegram, which the bot tolerates.
const chat = -1_000_000 - Number(n);
const text = action === 'accept' ? `/start w_${w.token}` : '/stop';
const res = await fetch(`${API}/api/telegram`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET ?? '' },
  body: JSON.stringify({ message: { chat: { id: chat }, from: { first_name: firstName ?? 'Witness' }, text } }),
});
console.log(action, n, res.status);
