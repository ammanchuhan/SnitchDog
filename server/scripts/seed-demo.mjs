// Creates a ready-to-use account: plan confirmed with a gym, today's weigh-in, one witness who
// accepted. For screenshots, design review and the App Store reviewer's demo login.
//
//   node --env-file=.env.local scripts/seed-demo.mjs <base url> <email> <password>
//
// Talks to the API like the app does; the witness accepts through the bot's webhook, so the
// server's TELEGRAM_WEBHOOK_SECRET must match this one.
const [base, email, password] = process.argv.slice(2);
if (!base || !email || !password) throw new Error('usage: seed-demo.mjs <base url> <email> <password>');
const B = base.replace(/\/$/, '');

async function call(method, path, token, body, headers = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const { token } = await call('POST', '/api/auth/signup', null, { email, password });
const plan = await call('POST', '/api/plan', token, {
  ownerName: 'Sam', timezone: 'America/Los_Angeles', unit: 'lb', start: 212, target: 185,
  heightCm: 178, heightUnit: 'ft', age: 32, gender: 'man', witnesses: 2,
});
await call('PATCH', '/api/plan', token, {
  routine: [{ id: 'workout', label: 'Workout', days: [1, 3, 5, 6], hour: 18 }],
  gym: { name: 'Iron Works', lat: 37.3318, lng: -122.0312, radius: 150 },
  stepsGoal: 8000,
  style: 'balanced',
});
await call('POST', '/api/weigh-ins', token, { value: 208.6, verified: true });

// The first witness accepts on Telegram.
await call('POST', '/api/telegram', null,
  { message: { chat: { id: -7000001 }, from: { first_name: 'Alex' }, text: `/start w_${plan.witnesses[0].inviteToken}` } },
  { 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET ?? '' });

console.log(`ready: ${email}`);
