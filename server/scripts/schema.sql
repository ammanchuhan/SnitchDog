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
