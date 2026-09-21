# Accountable

Most habit apps punish you with a notification you can swipe away. Accountable puts a person on
the other end of the promise: you name one thing you'll do every day and one person who finds out
when you don't.

> **The loop.** Ask. Nudge. Warn. Then tell them.

## How it works

1. You set one commitment in the app — the promise, the time, and your **witness**.
2. You send the witness a link. They tap it and are in. No app, no account.
3. Every day at your hour the coach asks whether you did it. Two buttons, or a number.
4. Ignore it, and the ladder runs: a sharper nudge, a final ask naming your witness, and then a
   message to the witness themselves. The app counts how many times that has happened, because
   that is the number people actually respond to.

An honest "missed it" is not an escalation. Two in a row is.

## Design decisions worth naming

- **The witness never installs anything.** The escalation lands in a chat they already use.
  Anything heavier and nobody would ever be chosen as a witness.
- **The witness sees whether you showed up, and nothing else.** Not the number on the scale, not
  your notes, not your streak. Handing a friend a diary is a different, worse product.
- **The coach never comments on the number.** Weight is the first proof type; commenting on
  someone's body is how a weight-loss app earns an uninstall. It only ever talks about showing up.
- **Local first.** Check-ins write to the device immediately and sync after, so answering never
  waits on a network. The server owns exactly one thing the client can't: who has been told.
- **Weight loss is a proof type, not the product.** `Proof` is a union — self-reported today,
  a logged metric for weight, photo or integrations later. Everything else generalises already.

Technical decisions, safety rules, privacy inventory and the legal checklist live in
[docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md), which is kept current as the app changes.

## Layout

```
app/        Expo Router: (tabs)/ today, progress, coach, plan; plus setup, log, witness, memories
src/        Domain model, local-first store, design system
server/     Next.js on Vercel: Telegram webhook, escalation ladder, cron
```

The escalation ladder lives in `server/lib/ladder.ts`. It is the product; the rest is delivery.

## Running it

```bash
npm install
npx expo start --ios          # the app, against local state
```

The messaging half needs a bot and a database:

```bash
cd server
cp .env.example .env.local    # bot token, Postgres URL, Anthropic key
npm install
npm run migrate
npx vercel deploy --prod
node --env-file=.env.local scripts/webhook.mjs https://<your-deployment>
```

Then set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_BOT_URL` in the app's `.env` and restart Expo.

Set `ESCALATION_MINUTES=1,1,1` to watch the entire loop run in three minutes instead of six hours.

## Next

- Push notifications as the primary channel, with messaging as the escalation channel only
  (needs a dev build and an Apple Developer account, so Telegram carries both for now).
- A voice call as the last rung, above telling the witness.
- Proof types that don't rely on self-report: a photo, or a health integration.
