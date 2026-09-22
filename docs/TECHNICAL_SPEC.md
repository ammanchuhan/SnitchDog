# Accountable — technical specification

A living document. It records what is built, what is deliberately not built, and the reasoning
behind both. Every entry carries a status so nobody has to guess whether a line describes the
system or an intention.

| | |
|---|---|
| **Status key** | ✅ built · ◑ partial · ○ not built · ⚠️ known gap |
| **Owner** | Amman Chuhan |
| **Last updated** | 2026-09-20 (rev 2) |
| **Stage** | Pre-release MVP. Not distributed to anyone outside the author. |

---

## 1. The product in one paragraph

You set a weight goal, say what time you get up, put your training week in, and name one real
person — your **witness**. Each morning the coach asks for your number. On days you train, it asks
about the session you actually scheduled. Nothing happens when you miss a single morning; the
witness hears when a *week* comes up short, or when sessions go missed back to back. The app counts
how many times that has happened, because that is the number people respond to.

Two streams, graded differently, because they fail differently:

| Stream | Asked | Graded | Witness hears when |
|---|---|---|---|
| **Mornings** | every day at your wake hour | weekly, against a floor | the week closes under the floor |
| **Sessions** | when a scheduled session is due | per session | two are missed in a row |

---

## 2. Architecture

Two programs that never share a process.

```
~/Developer/accountable
├── app/, src/      Expo (React Native) app      → the user's phone
└── server/         Next.js API routes           → Vercel
                    Postgres (Neon)              → state of record
                    Telegram Bot API             → delivery
                    Anthropic API                → message authoring
```

**Why the split.** The escalation must fire while the app is closed, killed or uninstalled. Logic
that a user can prevent from running by force-quitting is not accountability. Everything that must
happen without the user's cooperation lives on the server; everything else lives on the phone.

### Request flow

```
1  check-in      app → AsyncStorage (immediate) → PUT /api/commitment → Postgres
2  daily ask     Vercel cron (15 min) → ladder → Telegram → owner
3  answer        owner taps a button → Telegram webhook → Postgres
4  escalation    ladder → Telegram → witness, and a notice to the owner
5  sync back     app → GET /api/commitment/:id → escalation state
```

**Local-first, server-authoritative on one field.** Check-ins write to the device first so
answering never waits on a network. The server owns `escalated_at` and `witness.linked` and the
client cannot overwrite them — those are the only fields a motivated user would have reason to
edit.

---

## 3. Stack

| Layer | Choice | Why this, and what was rejected |
|---|---|---|
| App runtime | **React Native via Expo (SDK 57)** ✅ | Native app was a deliberate requirement. Expo removes Xcode/Gradle work for every native module. Rejected: bare RN (setup cost), Flutter (no reason to leave the React ecosystem). |
| Navigation | **expo-router** ✅ | File-based routing, native stack and modal presentation. Same mental model as Next's `app/` directory. |
| Language | **TypeScript, strict** ✅ | The domain is small and the invariants (one entry per day, per-timezone dates) are worth encoding. |
| Local storage | **AsyncStorage**, one JSON blob ✅ | One commitment per user at this stage. Rejected: SQLite/WatermelonDB — a row count in the dozens does not need a database. |
| Styling | **Style objects + a token file** (`src/theme.ts`) ✅ | No styling library. Two palettes derived from one design, selected by `useColorScheme()`. |
| Type family | **Plus Jakarta Sans**, tabular figures ✅ | One humanist sans, no serif. Numbers carry this product, so they get tabular numerals and their own scale. |
| Server | **Next.js 15 App Router, API routes only** ✅ | Headless: no pages beyond a placeholder root. Chosen for Vercel cron in four lines of config and zero-config deploys. Rejected: Express on a VM (a box to patch), Cloudflare Workers (no reason to leave Vercel). |
| Database | **Neon serverless Postgres** ✅ | Speaks HTTP, so it survives functions that live 200 ms. A pooled `pg` client is the wrong shape for serverless. |
| Scheduler | **Vercel cron, every 15 minutes** ✅ | The ladder is idempotent and checks elapsed time itself, so cadence is a cost knob, not correctness. |
| Messaging | **Telegram Bot API** ✅ | The witness installs nothing and no phone number is provisioned. Rejected: email (too easy to ignore), SMS (per-message cost, A2P registration), WhatsApp (Business API approval). |
| Push | Expo Notifications ○ | Requires a dev build and a paid Apple Developer account. Telegram carries both roles until then. |
| LLM | **Anthropic `claude-haiku-4-5`** ✅ | Short messages, latency and cost matter, quality is sufficient. Every call has a written fallback. |

### Versions
Expo SDK 57 · React 19.2 · React Native 0.86 · Next 15.5 · Node 22 · TypeScript 6 (app) / 5.7 (server).

---

## 4. Data model

### Client (`src/lib/types.ts`)

```ts
Plan        { id, ownerName, timezone, createdAt, goal, routine[], witness,
              weighIns[], sessions[], ownerChatId?, escalatedWeeks[] }
Goal        { unit, start, target, wakeHour, perWeek }
RoutineSlot { id, label, days: Weekday[], hour }
WeighIn     { date, value, loggedAt }
Session     { date, slotId, status: done|missed, answeredAt?, escalatedAt? }
Witness     { name, linked, linkedAt?, inviteToken }
```

`RoutineSlot` carries a free-text label and arbitrary days, so a reading habit or a practice
schedule is the same shape as a training week — the model is general even though the interface is
currently written for weight and training.

### Server (`server/scripts/schema.sql`)

`plans` (goal columns, routine as JSON, witness links, and morning-ladder bookkeeping),
`weigh_ins` (PK `(plan_id, date)` — one number per local day, ever) and `sessions`
(PK `(plan_id, date, slot_id)`).

`sessions.status` can be **`pending`**, which is not an answer but follow-up state: it records
that a session was asked about and how far the chase has gone. Pending rows are filtered out of
the API response, so the app never sees bookkeeping.

⚠️ Pre-release: `schema.sql` is the schema, not a migration history, and the client bumped its
storage key to `accountable.plan.v2` rather than migrating the old shape. Both are defensible
while the only user is the author, and neither is defensible after that.

⚠️ **Types are duplicated** between client TS and server SQL by hand. A shared package would fix
it; at two consumers the coordination cost exceeds the duplication cost. Revisit when a second
proof type ships.

### Dates
Every date is the **owner's local calendar day** (`YYYY-MM-DD`), computed from the stored IANA
timezone, never from server time. A person in Tulsa and a function in Virginia must agree on what
"today" means.

---

## 5. The escalation ladder

`server/lib/ladder.ts`. This is the product; everything else is delivery.

**Mornings**

| Rung | Trigger | Who hears |
|---|---|---|
| 1 Ask | local hour ≥ `wake_hour`, no weigh-in today | owner |
| 2 Chase | +`GAPS[0]`, **and only if the week's floor is now on the line** | owner |
| — | week closes below the floor | **witness**, and the owner is told |

The chase is deliberately conditional. If the floor is still comfortably reachable, a missed
morning is free and the app says nothing — nagging about a morning that costs nothing is how
people learn to ignore every message you send.

**Sessions**

| Rung | Trigger | Who hears |
|---|---|---|
| 1 Ask | the scheduled hour arrives | owner |
| 2 Chase | +`GAPS[1]`, still unanswered | owner |
| 3 Record | +`GAPS[2]`, session marked missed | — |
| 4 Escalate | two missed sessions in a row | **witness**, and the owner is told |

`ESCALATION_MINUTES` (default `120,120,120`) sets the gaps. `1,1,1` runs a whole session loop in
three minutes for a demo.

**Weeks are judged exactly once.** Every closed week is appended to `escalated_weeks` whether or
not it triggered a message, so a week can never be re-reported.

**The first week is pro-rated.** A plan created on Saturday is held to the mornings that were
actually available, not to the full floor. The same rule excludes sessions scheduled before the
plan existed — they are not yours to have missed. This is implemented twice, once per half
(`requiredInWeek` in both `src/lib/types.ts` and `server/lib/ladder.ts`), which is the clearest
argument yet for a shared package.

**Idempotence.** `advance()` is safe to call at any frequency: each rung records the step it moved
to and the time it moved, and entries upsert on `(commitment_id, date)`.

---

## 6. Configuration and secrets

| Variable | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | app | Public by definition — `EXPO_PUBLIC_*` is compiled into the bundle. Never put a secret here. |
| `EXPO_PUBLIC_BOT_URL` | app | Public bot link. |
| `DATABASE_URL` | server | |
| `TELEGRAM_BOT_TOKEN` | server | Full control of the bot. Rotate via @BotFather if leaked. |
| `TELEGRAM_WEBHOOK_SECRET` | server | Echoed by Telegram in `X-Telegram-Bot-Api-Secret-Token`; rejects forged updates. ✅ enforced |
| `ANTHROPIC_API_KEY` | server | Absent → templates. Never reaches the client. |
| `CRON_SECRET` | server | Vercel sets it; `/api/tick` rejects callers without it. ✅ enforced |
| `AI_CALLS_PER_PLAN_PER_DAY` | server | Default 30. Model calls one plan may trigger per UTC day. ✅ enforced (`lib/budget.ts`) |
| `AI_CALLS_PER_DAY` | server | Default 300. Model calls across the whole app per UTC day. ✅ enforced |

### Cost ceiling

Every model call — nudges, the in-app coach, memory extraction — passes `allow()` in
`lib/budget.ts`, which counts it in `ai_usage` and refuses past either daily limit. Refused calls
fall back to the written templates, so the loop never breaks; it just stops being written by a
model for the rest of the day. It fails closed: if the count can't be taken, nothing is spent.
Typed input is cut to 1,000 characters before it reaches the model.

At the default ceiling the worst case is roughly **$1–2 a day** on Claude Haiku 4.5, and only if
the limit is hit every day. The hard stop sits outside the code: **prepaid Anthropic credits with
auto-reload off**, so the account cannot spend more than it holds.

Secrets live only in Vercel project settings and `server/.env.local`, which is gitignored. No
secret is ever shipped in the app bundle, because anyone can read an app bundle.

---

## 7. Security

### Threat model

| Actor | Wants | Current state |
|---|---|---|
| The user themselves | To dodge the witness | ⚠️ Escalation state is server-side and client writes cannot overwrite it, but **any client can read or write any commitment by id**. |
| A stranger with an id | To read someone's commitment | ⚠️ Same gap. Ids are 12 random characters, which is obscurity, not authorization. |
| A forged webhook | To fake check-ins | ✅ Secret-token header required. |
| A leaked bot token | To message every linked user | ⚠️ No mitigation beyond rotation. Accepted at this stage. |
| Someone abusing the bot | To use escalations as a harassment relay | ✅ Message content is app-authored, never user-authored. See §8. |

### ⚠️ Gap 1 — no authentication (blocking for any external user)
`GET|PUT /api/commitment` trusts the id. Before a single person outside the author installs this:
device-scoped credential minted at setup, stored in the device keychain, sent as a bearer token,
and every query scoped by it. This is the top of the backlog and nothing else should ship first.

### Other current measures
- ✅ Parameterised SQL everywhere (Neon tagged templates); no string-built queries.
- ✅ `/api/tick` authorized by `CRON_SECRET`.
- ✅ Witness invite tokens are 16 random characters and tie exactly one chat to one commitment.
- ○ Rate limiting on the webhook and the sync endpoints.
- ○ Token rotation and revocation for witness invites (an invite is currently reusable forever).
- ⚠️ Telegram delivery is server-to-server TLS but **not end-to-end encrypted**; Telegram can read
  every message. This constrains what we are willing to send — see §9.
- ⚠️ `lib/telegram.ts` logs the API error body on failure, which can echo message text. Redact it.

---

## 8. Safety

This app applies social pressure on purpose. That obliges it to be careful in ways a habit tracker
is not.

### 8.1 The witness mechanic

| Risk | Mitigation | Status |
|---|---|---|
| Someone is named as a witness without consenting | The witness is only ever contacted after they tap the invite themselves. Until then the app states plainly that **nobody is watching**. | ✅ |
| The app becomes a harassment relay | Outbound witness messages are **app-authored only**. No user-supplied text is ever forwarded to the witness. | ✅ |
| The witness cannot make it stop | `/stop` unlinks the witness and ends all contact, and the owner is told nobody is watching. Offered to the witness in writing the moment they accept. | ✅ |
| A witness is spammed | Hard cap of one witness message per escalation and a daily ceiling per commitment. | ○ |
| The witness learns things they should not | The witness sees only whether the person showed up — never the number, the notes or the streak. | ✅ by design |
| Coercive lock-in | Changing or removing a witness, pausing, and deleting everything must all be one screen away and never require asking the witness. | ◑ change/reset stated in setup, screens not built |

The witness relationship is **explicitly asymmetric**: the owner chooses, the witness consents, and
either can end it unilaterally. Any future feature that makes leaving harder is out of bounds.

### 8.2 Weight as a proof type

Weight-loss software can do real harm to people with disordered eating. Rules, in force:

- ✅ **The coach never comments on the number.** Hard-coded in the system prompt, not left to the
  model's judgement. It only ever talks about whether the person showed up.
- ✅ The daily ask is *"did you log it"*, never *"did you lose"*. Showing up is the promise; the
  number is not graded.
- ✅ The witness never receives the number.
- ✅ **Daily weighing is not required.** The floor is three mornings a week by default. Insisting
  on a number every single day is the pattern most associated with harm, and it buys nothing:
  three readings a week produce an honest average.
- ✅ **Progress follows a seven-day average, never today's reading.** Weight swings pounds on water
  alone. A bar that lurches on a heavy morning teaches people either to distrust it or to chase it.
- ✅ **Target validation, personal to the person** (`src/lib/limits.ts`). Sign-up asks height,
  so limits are stated for *them* ("for someone 5′10″…"), never as a bare range. Rules:
  - A weight that implies a BMI under 12 or over 80 is a typo or unit mix-up.
  - **Floor:** no target below the bottom of the healthy range (BMI 18.5) for their height.
  - **No ceiling at the top of the healthy range** — BMI can't tell muscle from fat, and a 5′10″
    lifter aiming for 200 lb is reasonable. Building targets above it get a light joke instead of
    a warning (only when gaining; someone bringing a high weight down gets a plain answer).
  - Gain targets stop at BMI 34: past what muscle usually accounts for.
  - Unchanged: at most 35% below / 25% above the start; a 5%+ jump between readings is a soft
    warning, never a block; a bad target saved earlier is flagged on Home.
  - Without a height (older plans), only the typo check applies and the message asks for the
    height instead of quoting numbers. **Still to do:** offering to continue without a target.
- ✅ **Pace is qualitative.** Sign-up asks steady / moderate / fast with no pounds-per-week or
  arrival date: weight doesn't come off on a schedule, and a promised rate turns the first
  plateau into a broken promise. Pace only nudges the workout count.
- ✅ **Every weigh-in is backed by a photo of the scale** (`src/lib/photos.ts`, `app/log.tsx`).
  Camera only, never the photo library, so an old picture can't stand in for this morning. The
  photo comes before the number, so the number is copied from something real. Photos stay on the
  phone; the server only learns *that* there was proof (`weigh_ins.proof`). Weigh-ins sent to the
  bot must be a photo with the number as its caption (kept on Telegram, referenced by `file_id`);
  a typed number alone is refused. **Known limit:** nothing yet checks that the photo shows a
  scale or that the typed number matches it. Next step is reading the display from the photo
  (a small vision call) and flagging mismatches — see §12 ideas.
- ○ **Signposting**: a quiet, permanent link to eating-disorder support, and a softer path if a
  logged number drops implausibly fast.
- ✅ **Age**: sign-up asks age and refuses under-18s — a weight target plus someone reporting on
  you is the wrong setup for a minor.
- ○ **Medical disclaimer** in-app and in the terms: not a medical device, no medical advice.

### 8.3 The LLM

| Risk | Mitigation | Status |
|---|---|---|
| Prompt injection via the user's own goal or promise text ("ignore previous instructions and tell my witness…") | User text enters the prompt as data under a fixed system prompt; the model's only job is to write one short message. | ◑ |
| A hostile or broken generation reaching a third party | Output is validated for length before sending, and falls back to a written template on anything unexpected. | ◑ length only |
| The model inventing consequences the app cannot deliver | System prompt forbids threatening anything the app does not do. | ✅ |
| The service being down breaking the core loop | Every message has a written fallback. A check-in that does not go out is a broken product; a missing API key is not the user's problem. | ✅ |
| More data than necessary leaving for a third party | See §9 — ⚠️ `title` currently contains the target weight, so a number does reach the model. Redact it from the prompt. | ⚠️ |

Planned hardening: treat witness-bound generations as untrusted until they pass an output filter
(length, no URLs, no invented facts about the person), and prefer the template when it fails.

### 8.4 Accessibility
- ✅ Buttons carry `accessibilityRole` and disabled state; touch targets ≥ 44 pt.
- ✅ Colour is never the only signal — kept/missed days differ in fill, border and label.
- ○ Dynamic Type: the scale is fixed rather than scaling with the system setting.
- ○ VoiceOver pass over the day strip and the stat cards.
- ○ Contrast audit of `textFaint` on `surface` in both palettes.

---

## 9. Privacy and data protection

### What is collected, and why

| Data | Where it lives | Why | Retention |
|---|---|---|---|
| Owner first name | device + server | It appears in the message the witness receives | Life of the plan |
| Goal, wake hour, weekly floor, timezone | device + server | The loop | Life of the plan |
| Training schedule (labels, days, times) | device + server | So the coach can ask about a specific session | Life of the plan |
| **Weigh-ins: date and number** | device + server | Progress, and the weekly floor | Life of the plan |
| **Scale photos** | **device only** (app documents folder) | Proof the number is real | Until the plan is deleted |
| Telegram scale photos | Telegram's servers; we keep only the `file_id` | Proof for weigh-ins sent to the bot | Life of the plan |
| **Height, age, schedule, training time, commitment, pace** | **device only** (`plan.profile`, stripped in `pushPlan`) | Building the plan and a personal target range | Life of the plan |
| Sessions: date, done/missed | device + server | The product | Life of the plan |
| Witness first name | device + server | To address the invite and the escalation | ⚠️ see below |
| Telegram chat ids (owner and witness) | server | The only way to reach either of them | Until unlinked or `/stop` |
| Escalation timestamps and escalated weeks | server | The counter, and the honest history | Life of the plan |

**Not collected:** email, phone number, contacts, location, device identifiers, health-app data,
analytics, advertising identifiers. There is no third-party SDK in the app.

### ⚠️ Open issue — the witness's name before consent
The witness's first name is sent to the server at setup, before that person has agreed to anything.
It is a small piece of data about someone who has not consented. **Fix:** keep the witness name on
the device only, and let the server learn it at the moment they accept. The invite text is composed
on the phone, so nothing needs it server-side beforehand.

### Third parties

| Processor | Receives | Note |
|---|---|---|
| Vercel | All API traffic, server logs | Hosting |
| Neon | Everything in the tables | Database |
| Telegram | Every message sent and received, chat ids | **Not end-to-end encrypted.** Assume Telegram can read it. |
| Anthropic | First names, the weekly floor, session labels, seven days of showed-up/didn't | ✅ The prompt now carries no weight values — the rewrite removed the goal title that leaked the target. Logged numbers have never been sent. |

Each must be named in the privacy policy as a subprocessor.

### Retention and deletion
- ○ **Delete everything**: one control in the app that removes the commitment, its entries and both
  chat links, server-side, immediately. Apple requires in-app deletion for any app with accounts,
  and it is the right default regardless.
- ○ **Abandonment**: hard-delete commitments with no activity for 12 months.
- ○ **Witness unlink**: `/stop` removes the chat id and the name at once.
- ○ **Logs**: keep the platform default, and never log message bodies or logged numbers.
- ○ **Export**: the user's own history as JSON, on request.

---

## 10. Legal

None of this exists yet. All ○, and all required before the app reaches anyone who is not the
author. This is a checklist written by an engineer, not legal advice — have a professional read the
terms before any public release.

### Documents to write
- **Terms of Service** — what the service does; the witness mechanic described plainly; acceptable
  use (no naming someone to harass them); no warranty; termination; governing law (Florida, US).
- **Privacy Policy** — the table in §9, the subprocessors, retention periods, how to delete, how to
  contact. Must be reachable from inside the app and from a public URL; Apple requires the link at
  submission.
- **Medical disclaimer** — not a medical device, not medical advice, consult a professional before
  changing diet or exercise. Shown at setup for weight goals, not buried in the terms.
- **Witness notice** — shown to the witness *before* they accept: what they will receive, what they
  will never see, and how to stop. Consent should be informed at the moment it is given.

### Regimes that apply
- **GDPR** (if any EU user): lawful basis is consent for both parties; data minimisation (§9 open
  issue); rights of access, erasure and portability; a named contact. An EU representative may be
  required if the app is offered in the EU — confirm before launching there.
- **UK GDPR / CCPA**: no sale or sharing of personal information — state it explicitly. CCPA
  "Do Not Sell" is not triggered, but the disclosure still belongs in the policy.
- **COPPA**: under-13s out of scope. Set a minimum age and enforce it at setup.
- **HIPAA**: does not apply — this is not a covered entity and not treatment. Weight is still
  sensitive, and health data cannot be used for advertising under Apple's rules regardless.
- **Telegram Bot terms**: bots must not send unsolicited messages. The witness opt-in is what keeps
  this compliant; the `/stop` command is not optional.
- **Anthropic usage policies**: applies to the generated messages; the no-shaming rules in §8.3 are
  also a policy-compliance measure.

### App Store readiness
- ○ Privacy policy URL and App Privacy ("nutrition label") answers.
- ○ In-app account deletion (Guideline 5.1.1) — the same control as §9.
- ○ Age rating that reflects weight-management content.
- ○ Demo credentials and an explanation of the witness flow for review, since a reviewer cannot
  easily see an escalation. Expect extra scrutiny on a weight-loss app; the §8.2 rules are the
  answer.
- ○ Justify every permission. Currently none are requested.

---

## 11. Testing and quality

- ✅ `tsc --noEmit` clean on both halves; `next build` clean.
- ✅ Onboarding, check-in, logging and the witness screen verified by hand on the iOS simulator.
- ○ Unit tests for the parts where a bug is invisible: `streak`, `quietDays`, `localNow` across
  timezones and DST, and the ladder's rung transitions against a frozen clock. **These are the
  first tests to write** — every one of them can be wrong in a way no screenshot reveals.
- ○ An end-to-end rehearsal with `ESCALATION_MINUTES=1,1,1` and two real Telegram accounts.
- ○ Android pass. Nothing used is iOS-only, but it has never been run.

---

## 12. Release plan

| Stage | Needs |
|---|---|
| **Now** — author only, Expo Go | bot token, Anthropic key, Neon URL |
| **Friends** — TestFlight | Apple Developer account, EAS build, §7 Gap 1 (auth), witness `/stop`, delete-everything |
| **Public** — App Store | all of §10, target validation, signposting, rate limits, tests |

### Ideas, not scheduled

Kept here so they are not lost, and kept out of the build until the single loop is proven with real
users.

| Idea | Why it fits | What it needs first |
|---|---|---|
| **Read the scale from the photo** | Closes the gap in §8.2: a photo of anything currently passes. A cheap vision call reads the display; a mismatch with the typed number (or no scale in shot) gets flagged, not silently accepted. | Photos would have to leave the phone for the check (then be deleted), which changes the privacy story in §9 and needs the owner's clear consent. Cost fits under the existing per-plan AI budget. |
| **A backup witness** (discussed 2026-09-21) | Not a group — the decision below stands, because a message to three people lets each assume someone else will reply. But one witness can go quiet, be on holiday, or stop caring. A named second person who hears only when the first doesn't respond within a day keeps the single, personal ask and adds a rung to the ladder. | Evidence from real users that witnesses actually go unresponsive, and the witness side of the bot reporting whether they replied. |
| **Language learning as a proof type** (from Amman, 2026-09-21) | The coach *calls* you and speaks the language you're learning, dropping into your own language when you need a bridge. The proof is showing up for the call. Same ladder: miss the week's floor and the witness hears. | Voice calls (already the planned next delivery channel), a second `Proof` variant, and a real answer to "why this and not Duolingo?" — Duolingo already ships AI video-call practice, so the difference has to be the witness and the ladder, not the conversation. |

---

## 13. Decision log

| Date | Decision | Reasoning |
|---|---|---|
| 2026-09-20 | Native app rather than web | Range alongside the iPadOS and visionOS work, and the product belongs on a phone. |
| 2026-09-20 | Telegram for both roles | No Apple Developer account, so no push. Telegram also means the witness installs nothing — which turns out to be a product advantage, not just a workaround. |
| 2026-09-20 | One witness, not a group | "The one person you'd be embarrassed to let down" is a stronger idea than a broadcast, and far simpler to build. |
| 2026-09-20 | An honest miss does not escalate | Rewards telling the truth over performing. Ghosting is the failure mode worth punishing. |
| 2026-09-20 | The coach never mentions the number | The clearest line between a useful pressure product and a harmful one. |
| 2026-09-20 | Local-first with one server-authoritative field | Answering must never wait on a network; escalation state must never be client-editable. |
| 2026-09-20 (rev 2) | Weigh-ins graded weekly, not daily | A missed morning is noise; a missed week is a signal. Grading the thing that matters is also the humane choice. |
| 2026-09-20 (rev 2) | Ask when they wake rather than asking them to pick a time | There is only one honest time to weigh yourself. Asking "what time do you get up" gets the same answer with one less decision. |
| 2026-09-20 (rev 2) | Training is a schedule, not a checkbox | "Did you work out?" is a question anyone can dodge. "Did you get Wednesday's session in?" is not. |
| 2026-09-20 (rev 2) | Progress follows the seven-day average | Daily weight is mostly water. A progress bar that reacts to it is lying. |
| 2026-09-20 (rev 2) | The first week is pro-rated | Starting on a Saturday should not mean failing before you have done anything. Found by running the app on a Sunday. |
| 2026-09-21 | Four tabs — Today, Progress, Coach, Plan — instead of one busy home | Home stacked seven things. Today now answers one question (what do I owe today?); browsing moved to its own tabs. Native iOS tab bar, so it reads as a phone app. |
| 2026-09-21 | Three tabs — Analytics, Home (middle), Coach — with Plan pushed from Home | Home should show where you stand as well as what's due: the goal, the average, the bar, the week. Analytics is only for looking back (trend, month-by-month calendar with a per-month summary, weeks). Plan is settings, visited rarely, so it lost its tab. |
| 2026-09-21 | The coach is Ember, a flame mascot, and the only character in the app | One voice for the morning texts, the chat and the illustrations, instead of a faceless coach plus a separate mascot. Ember is on the user's side: worried, never angry — the witness is the consequence. A flame-you-keep-alive framing was rejected as a guilt/streak machine. The chat lost its log-weight tool, since weigh-ins need a photo. |

---

## 14. Revision history

| Date | Change |
|---|---|
| 2026-09-20 | First version: architecture, stack, ladder, security gaps, safety rules, privacy inventory, legal checklist. |
| 2026-09-20 rev 2 | Two-stream model (weekly weigh-in floor + scheduled sessions), editable plan, seven-day average, pro-rated first week. Witness `/stop` shipped. Weight values removed from the LLM prompt. |
| 2026-09-21 | Sign-up questionnaire (name, age 18+, height ft/in or cm, weight + target with a personal range, pace, schedule, wake time, commitment, training time) builds a starting routine. Photo proof required for every weigh-in, in the app and on Telegram. Home is the middle tab; witness has its own screen. |
