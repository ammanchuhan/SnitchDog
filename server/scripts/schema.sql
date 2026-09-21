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
