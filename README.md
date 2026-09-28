# SnitchDog

An AI can't hold you accountable. The people you respect can.

You set a weight goal and build a workout plan with Snitch, the app's coach. You name one to three
real people as your witnesses. Keep your word and they never hear a thing. Go quiet, and Snitch
tells them.

## How it works

1. **Sign up** in eight short screens: name, age, height, weight, target, and your witnesses.
2. **Invite your witnesses.** Each gets a link that opens Telegram. No app, no account. Each is
   messaged on their own, and none is told who the others are.
3. **Build the plan with Snitch** in the Coach tab: workouts a week, which days, a pin on your
   gym, and a daily step goal.
4. **Weigh in three mornings a week.** Photograph the scale; the phone reads the number with
   Apple's Vision framework and deletes the photo.
5. **Workouts are verified by GPS.** A geofence around the gym: stay 30 minutes and it counts.
6. **Snitch snitches.** A week under three weigh-ins, or two workouts missed in a row, and every
   witness gets a Telegram message. An honest miss with a good reason can get a pass (two a month).

You can't leave quietly: removing a witness or deleting your account tells every witness, unless
you reached your goal.

## Design decisions worth naming

- **Witnesses see whether you showed up, and nothing else.** Never the number, the photos, your
  chats or your streak. Nothing you type is ever forwarded to them.
- **Snitch never comments on the number.** It talks about showing up. Weight is never sent to the
  model, and the numbers in a plan are computed in code; Snitch only explains them.
- **Photos stay on the phone.** Scale photos are read and deleted; weekly mirror photos live only
  in the app's storage.
- **The server is the source of truth.** The ladder has to run while the app is closed, so the
  plan lives on the server and the phone caches it (and queues a weigh-in taken offline).

The product requirements, with a wireframe for every screen, are kept in a separate requirements
doc; requirement ids (HOME-3, Q20…) in the code refer to it.

## Layout

```
app/          Expo Router: (tabs)/ home, analytics, coach, profile; profile/ drill-downs;
              signup, auth, reset, log (weigh-in), mirror, history, photos
src/          Domain types, the API client and store, components (Snitch, the plan builder…)
modules/      Local native modules: scale-reader (Vision OCR), health-steps (HealthKit)
plugins/      Config plugins (the iOS 27 scene life cycle)
server/       Next.js on Vercel: the API, the ladder, the Telegram bot, the site
e2e/          Maestro flows that go through every screen on the simulator
```

The ladder lives in `server/lib/ladder.ts` and the rules it judges by in `server/lib/rules.ts`.

## Running it

The app needs a development build (it uses the camera, Vision, GPS geofences, Apple Health and
push, none of which run in Expo Go). With Xcode and a booted iOS simulator:

```bash
npm install
npm run ios:sim                       # builds and installs the dev client
npx expo start --dev-client           # Metro
```

The server, with a Postgres database, a Telegram bot and an Anthropic key:

```bash
cd server
cp .env.example .env.local
npm install
npm run migrate
npm run dev                           # http://localhost:3111
npm test
```

Point the app at it with `EXPO_PUBLIC_API_URL=http://localhost:3111` in `.env.local`.

The end-to-end flows need [Maestro](https://maestro.dev), the server and Metro running:
`sh e2e/run.sh`.

In production, `/api/tick` runs the ladder. `.github/workflows/tick.yml` calls it every 15
minutes (set the `TICK_URL` and `CRON_SECRET` repository secrets); Vercel's daily cron is a
backstop. Set `ESCALATION_MINUTES=1` to shorten the wait before a morning chase when rehearsing.

## License

MIT
