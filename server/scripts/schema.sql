-- Pre-release: this file is the schema, not a migration history. Re-running it is safe.

create table if not exists plans (
  id                text primary key,
  owner_name        text        not null,
  timezone          text        not null,
  created_at        timestamptz not null default now(),

  -- goal
  unit              text        not null,
  start_value       numeric     not null,
  target_value      numeric     not null,
  wake_hour         int         not null,
  per_week          int         not null default 3,

  -- routine: [{ id, label, days:[0-6], hour }]
  routine           jsonb       not null default '[]',

  witness_name      text        not null,
  witness_token     text        not null unique,
  witness_chat_id   text,
  witness_linked_at timestamptz,
  owner_chat_id     text,

  -- morning ladder, reset each local day
  morning_date      text,
  morning_step      int         not null default 0,
  morning_at        timestamptz,

  -- weeks already reported to the witness, so a bad week is escalated once
  escalated_weeks   text[]      not null default '{}'
);

create index if not exists plans_owner_chat on plans (owner_chat_id);

create table if not exists weigh_ins (
  plan_id   text        not null references plans (id) on delete cascade,
  date      text        not null,      -- local YYYY-MM-DD
  value     numeric     not null,
  logged_at timestamptz not null default now(),
  primary key (plan_id, date)
);

-- Every weigh-in is backed by a photo of the scale. 'camera' photos stay on the owner's phone
-- (only the fact of them is synced); 'telegram' photos stay on Telegram's servers, referenced by
-- file id, so this database never stores an image.
alter table weigh_ins add column if not exists proof text;
alter table weigh_ins add column if not exists photo_file_id text;

create table if not exists sessions (
  plan_id      text        not null references plans (id) on delete cascade,
  date         text        not null,
  slot_id      text        not null,
  status       text        not null default 'pending',  -- pending | done | missed
  answered_at  timestamptz,
  escalated_at timestamptz,
  -- how far the follow-up for this session has gone: 0 unasked, 1 asked, 2 chased
  asked_step   int         not null default 0,
  asked_at     timestamptz,
  primary key (plan_id, date, slot_id)
);

-- The coach's conversation and the small set of things it chooses to remember.
create table if not exists coach_messages (
  id         bigserial primary key,
  plan_id    text        not null references plans (id) on delete cascade,
  role       text        not null,    -- user | coach
  text       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_plan on coach_messages (plan_id, id);

create table if not exists coach_memories (
  id         bigserial primary key,
  plan_id    text        not null references plans (id) on delete cascade,
  fact       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_memories_plan on coach_memories (plan_id, id);

-- Model calls counted per UTC day, per plan and in total ('*'), so spend has a ceiling.
create table if not exists ai_usage (
  day   text not null,
  scope text not null,
  calls int  not null default 0,
  primary key (day, scope)
);

-- ── Accounts ────────────────────────────────────────────────────────────────────────────
-- Added 2026-09-23. Until now any client could read or write any plan by id (spec §7 Gap 1).
-- A plan now belongs to an account, and every client query is scoped by the bearer token.

create table if not exists accounts (
  id            text primary key,
  -- Null when the account is Apple-only and the person chose to hide their email.
  email         text unique,
  -- Null for Apple-only accounts. scrypt, stored as salt:hash.
  password_hash text,
  -- Apple's stable 'sub' claim: unique per developer team, never reused.
  apple_user_id text unique,
  created_at    timestamptz not null default now()
);

-- Opaque bearer tokens, stored as sha256 so a database leak does not hand over live sessions.
create table if not exists auth_tokens (
  token_hash   text primary key,
  account_id   text        not null references accounts (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists auth_tokens_account on auth_tokens (account_id);

alter table plans add column if not exists account_id text references accounts (id) on delete cascade;
create index if not exists plans_account on plans (account_id);

-- Sign in with Google. Same shape as Apple: the provider's stable subject is the key, and the
-- email is only ever a convenience for linking an account the person already made.
alter table accounts add column if not exists google_user_id text unique;

-- ── SnitchDog v1 (requirements rev 3, 2026-09-27) ──────────────────────────────────────────
-- Additive only: the deployed server still runs the old code against this database.

-- Witnesses move to their own table (one to three per plan). The old single-witness columns on
-- plans stay for the old code and are no longer written.
alter table plans alter column witness_name drop not null;
alter table plans alter column witness_token drop not null;
alter table plans alter column wake_hour set default 4;

create table if not exists witnesses (
  id           text primary key,
  plan_id      text        not null references plans (id) on delete cascade,
  token        text        not null unique,
  -- The owner's name for them stays on the phone until they accept (WIT-8); the app sends it
  -- once they have. tg_name is what Telegram says they're called, used until then.
  name         text,
  tg_name      text,
  chat_id      text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  linked_at    timestamptz,
  -- They sent /stop. The row stays so the owner can see who stepped back.
  stopped_at   timestamptz,
  -- The owner removed them (P4: everyone is told).
  removed_at   timestamptz
);

create index if not exists witnesses_plan on witnesses (plan_id);
create index if not exists witnesses_chat on witnesses (chat_id);

-- About the person: used to suggest a plan, never sent to a witness or the model's witness copy.
alter table plans add column if not exists height_cm numeric;
alter table plans add column if not exists height_unit text;
alter table plans add column if not exists age int;
alter table plans add column if not exists gender text;

-- The plan Snitch builds in chat. Null until confirmed; the Home banner shows until then.
alter table plans add column if not exists plan_confirmed_at timestamptz;
alter table plans add column if not exists steps_goal int;
-- { name, lat, lng, radius } — the geofence every workout is verified against.
alter table plans add column if not exists gym jsonb;

-- Gentle | balanced | tough. Changes tone, never the rules.
alter table plans add column if not exists style text not null default 'balanced';

-- A pause (illness, travel): dates inclusive, local. Nothing is judged inside it.
alter table plans add column if not exists paused_from text;
alter table plans add column if not exists paused_until text;
alter table plans add column if not exists pause_reason text;

-- Weeks the owner has been asked for a mirror photo in, so the ask goes out once a week.
alter table plans add column if not exists mirror_asked_week text;

-- Weigh-ins: proof is now 'ocr' (read off a photo on the phone) or 'typed' (OCR failed three
-- times, shown as unverified). Older rows say 'camera' or 'telegram'.

-- Workouts are the old sessions, verified by GPS instead of a button.
alter table sessions add column if not exists minutes int;
alter table sessions add column if not exists verified_at timestamptz;

-- Passes the coach granted for a missed week or workout, with the reason it accepted.
create table if not exists passes (
  id         bigserial primary key,
  plan_id    text        not null references plans (id) on delete cascade,
  kind       text        not null,   -- week | workout
  ref        text        not null,   -- the week's Monday, or date:slot_id
  reason     text        not null,
  created_at timestamptz not null default now(),
  unique (plan_id, kind, ref)
);

create table if not exists steps (
  plan_id text not null references plans (id) on delete cascade,
  date    text not null,
  steps   int  not null,
  primary key (plan_id, date)
);

-- Snitch's messages to the owner are chat messages first and pushes second.
alter table coach_messages add column if not exists kind text;
alter table coach_messages add column if not exists data jsonb;

create table if not exists push_tokens (
  token      text primary key,
  account_id text        not null references accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists push_tokens_account on push_tokens (account_id);

-- Password reset codes: one live code per account, stored hashed, 15 minutes, 5 attempts.
create table if not exists password_resets (
  account_id text primary key references accounts (id) on delete cascade,
  code_hash  text        not null,
  expires_at timestamptz not null,
  attempts   int         not null default 0
);

-- Plans made before v1 had their one witness on the plan row; carry it over once.
insert into witnesses (id, plan_id, token, name, chat_id, created_at, linked_at)
select p.id || '-w1', p.id, p.witness_token, p.witness_name, p.witness_chat_id, p.created_at, p.witness_linked_at
  from plans p
 where p.witness_token is not null
   and not exists (select 1 from witnesses w where w.plan_id = p.id)
on conflict do nothing;

-- Messages sent to witnesses per plan per local day, for the daily cap (TG-4).
create table if not exists witness_sends (
  plan_id text not null references plans (id) on delete cascade,
  day     text not null,
  sent    int  not null default 0,
  primary key (plan_id, day)
);

-- ── Row-level security (2026-09-28) ─────────────────────────────────────────────────────────
-- The app connects as snitchdog_app (see scripts/create-app-role.mjs): it can read and write
-- rows but not change the schema, and it can't bypass these policies. Every query runs in a
-- context the server sets on the same transaction (lib/db.ts):
--   app.account_id  the signed-in account: it sees only its own rows
--   app.system      'on' for the ladder, the Telegram bot and sign-in lookups
-- With neither set, a query sees nothing, so a missing context fails closed. The owner role
-- (used only for migrations) bypasses all of this.

create or replace function app_account() returns text language sql stable as $$ select nullif(current_setting('app.account_id', true), '') $$;
create or replace function app_system() returns boolean language sql stable as $$ select coalesce(current_setting('app.system', true), '') = 'on' $$;
create or replace function app_owns_plan(p text) returns boolean language sql stable as $$ select exists (select 1 from plans where id = p and account_id = app_account()) $$;

-- Fixed-window rate limits (lib/ratelimit.ts).
create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int         not null default 0
);

alter table accounts         enable row level security;
alter table auth_tokens      enable row level security;
alter table push_tokens      enable row level security;
alter table password_resets  enable row level security;
alter table plans            enable row level security;
alter table witnesses        enable row level security;
alter table weigh_ins        enable row level security;
alter table sessions         enable row level security;
alter table passes           enable row level security;
alter table steps            enable row level security;
alter table coach_messages   enable row level security;
alter table coach_memories   enable row level security;
alter table witness_sends    enable row level security;
alter table ai_usage         enable row level security;
alter table rate_limits      enable row level security;

alter table accounts         force row level security;
alter table auth_tokens      force row level security;
alter table push_tokens      force row level security;
alter table password_resets  force row level security;
alter table plans            force row level security;
alter table witnesses        force row level security;
alter table weigh_ins        force row level security;
alter table sessions         force row level security;
alter table passes           force row level security;
alter table steps            force row level security;
alter table coach_messages   force row level security;
alter table coach_memories   force row level security;
alter table witness_sends    force row level security;
alter table ai_usage         force row level security;
alter table rate_limits      force row level security;

drop policy if exists own on accounts;
create policy own on accounts using (app_system() or id = app_account()) with check (app_system() or id = app_account());
drop policy if exists own on auth_tokens;
create policy own on auth_tokens using (app_system() or account_id = app_account()) with check (app_system() or account_id = app_account());
drop policy if exists own on push_tokens;
create policy own on push_tokens using (app_system() or account_id = app_account()) with check (app_system() or account_id = app_account());
drop policy if exists own on password_resets;
create policy own on password_resets using (app_system()) with check (app_system());
drop policy if exists own on plans;
create policy own on plans using (app_system() or account_id = app_account()) with check (app_system() or account_id = app_account());
drop policy if exists own on witnesses;
create policy own on witnesses using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on weigh_ins;
create policy own on weigh_ins using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on sessions;
create policy own on sessions using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on passes;
create policy own on passes using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on steps;
create policy own on steps using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on coach_messages;
create policy own on coach_messages using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on coach_memories;
create policy own on coach_memories using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on witness_sends;
create policy own on witness_sends using (app_system() or app_owns_plan(plan_id)) with check (app_system() or app_owns_plan(plan_id));
drop policy if exists own on ai_usage;
create policy own on ai_usage using (app_system()) with check (app_system());
drop policy if exists own on rate_limits;
create policy own on rate_limits using (app_system()) with check (app_system());

-- Nothing is granted to PUBLIC: other roles on this database (neon_auth, anything added
-- later) see no tables at all.
revoke all on all tables in schema public from public;
