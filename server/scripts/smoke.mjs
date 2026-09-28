// End-to-end check of the API, including the security rules, against a running server.
//
//   node --env-file=.env.local scripts/smoke.mjs [base url]    (default http://localhost:3111)
//
// Makes two throwaway accounts, exercises every route, checks that neither can touch the
// other's data, that limits and secrets hold, and deletes both accounts at the end.
const BASE = (process.argv[2] ?? 'http://localhost:3111').replace(/\/$/, '');
const stamp = Date.now();
let failures = 0;

const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures += 1;
};

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

async function newAccount(label) {
  const email = `smoke+${label}-${stamp}@example.com`;
  const r = await call('POST', '/api/auth/signup', { body: { email, password: 'smoke-test-password' } });
  check(`sign up ${label}`, r.status === 200, r.text);
  return { email, token: r.json?.token };
}

const newPlan = (token) =>
  call('POST', '/api/plan', {
    token,
    body: { ownerName: 'Smoke', timezone: 'America/New_York', unit: 'lb', start: 210, target: 185, heightCm: 178, heightUnit: 'ft', age: 34, witnesses: 2 },
  });

const a = await newAccount('a');
const b = await newAccount('b');

// Plans
check('no plan yet is a 404', (await call('GET', '/api/plan', { token: a.token })).status === 404);
const pa = await newPlan(a.token);
check('create plan', pa.status === 200 && pa.json?.witnesses?.length === 2, pa.text);
const pb = await newPlan(b.token);
check('second account creates its own plan', pb.status === 200);
check('one plan per account', (await newPlan(a.token)).status === 409);

// The core loop
const w = await call('POST', '/api/weigh-ins', { token: a.token, body: { value: 209.4, verified: true } });
check('weigh in', w.status === 200 && w.json?.plan?.weighIns?.length === 1, w.text);
check('impossible weight refused', (await call('POST', '/api/weigh-ins', { token: a.token, body: { value: 20 } })).status === 400);
const confirm = await call('PATCH', '/api/plan', {
  token: a.token,
  body: { routine: [{ id: 'w', label: 'Workout', days: [1, 3, 5], hour: 18 }], gym: { name: 'Gym', lat: 40.7, lng: -74, radius: 150 }, stepsGoal: 7000, style: 'tough' },
});
check('confirm plan', confirm.status === 200 && !!confirm.json?.confirmedAt, confirm.text);
check('chat history readable', (await call('GET', '/api/coach/chat', { token: a.token })).status === 200);
check('steps', (await call('POST', '/api/steps', { token: a.token, body: { days: [{ date: w.json.plan.today, steps: 4321 }] } })).status === 200);

// Isolation: B can't see or change A's things, even knowing their ids
const aWitness = pa.json.witnesses[0].id;
check("B can't rename A's witness", (await call('PATCH', `/api/witnesses/${aWitness}`, { token: b.token, body: { renew: true } })).status === 404);
check("B can't remove A's witness", (await call('DELETE', `/api/witnesses/${aWitness}`, { token: b.token })).status === 404);
const bView = await call('GET', '/api/plan', { token: b.token });
check("B's plan shows only B's data", bView.json?.id === pb.json.id && bView.json?.weighIns?.length === 0);
check('a made-up token is refused', (await call('GET', '/api/plan', { token: 'x'.repeat(64) })).status === 401);
check('no token is refused', (await call('GET', '/api/plan')).status === 401);

// Secrets are required
check('tick without the cron secret is refused', (await call('GET', '/api/tick')).status === 401);
check('bot without the webhook secret is refused', (await call('POST', '/api/telegram', { body: { message: { chat: { id: 1 }, text: '/stop' } } })).status === 401);

// Limits
let limited = false;
for (let i = 0; i < 12 && !limited; i += 1) {
  const r = await call('POST', '/api/auth/login', { body: { email: a.email, password: 'wrong-password-123' } });
  limited = r.status === 429 && !!r.headers.get('retry-after');
}
check('login attempts are rate limited', limited);

// Headers
const page = await call('GET', '/privacy');
check('security headers', !!page.headers.get('strict-transport-security') && !!page.headers.get('content-security-policy') && !page.headers.get('x-powered-by'));
check('invite link redirects', (await call('GET', `/w/${pa.json.witnesses[1].inviteToken}`)).status === 302);

// Leaving erases everything
for (const [label, t] of [['a', a.token], ['b', b.token]]) {
  check(`delete ${label}`, (await call('DELETE', '/api/auth/account', { token: t })).status === 200);
  check(`${label}'s token is gone`, (await call('GET', '/api/plan', { token: t })).status === 401);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
