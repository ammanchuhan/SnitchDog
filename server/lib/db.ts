import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/** Built on first use, not at import time: the build runs without a DATABASE_URL and a
 *  connection made at module load would fail it. */
let client: NeonQueryFunction<false, false> | null = null;
const connect = () => (client ??= neon(process.env.DATABASE_URL!));

export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply: (_t, _this, args: any[]) => (connect() as any)(...args),
    get: (_t, prop) => (connect() as any)[prop],
  },
);

/** A scheduled workout: "Lift, Mon/Wed/Fri, by 6 pm". Verified by being at the gym that day. */
export type RoutineSlot = { id: string; label: string; days: number[]; hour: number };

export type Gym = { name: string; lat: number; lng: number; radius: number };

export type Style = 'gentle' | 'balanced' | 'tough';

export type PlanRow = {
  id: string;
  account_id: string | null;
  owner_name: string;
  timezone: string;
  created_at: string;
  unit: string;
  start_value: string;
  target_value: string;
  per_week: number;
  routine: RoutineSlot[];
  height_cm: string | null;
  height_unit: string | null;
  age: number | null;
  gender: string | null;
  plan_confirmed_at: string | null;
  steps_goal: number | null;
  gym: Gym | null;
  style: Style;
  paused_from: string | null;
  paused_until: string | null;
  pause_reason: string | null;
  mirror_asked_week: string | null;
  morning_date: string | null;
  morning_step: number;
  morning_at: string | null;
  escalated_weeks: string[];
};

export type WitnessRow = {
  id: string;
  plan_id: string;
  token: string;
  name: string | null;
  tg_name: string | null;
  chat_id: string | null;
  created_at: string;
  expires_at: string;
  linked_at: string | null;
  stopped_at: string | null;
  removed_at: string | null;
};

export type WeighInRow = {
  plan_id: string;
  date: string;
  value: string;
  logged_at: string;
  /** 'ocr' or 'typed' from v1 on; 'camera' and 'telegram' on older rows. */
  proof: string | null;
};

export type SessionRow = {
  plan_id: string;
  date: string;
  slot_id: string;
  /** 'pending' holds reminder bookkeeping before a workout is verified or missed. */
  status: 'pending' | 'done' | 'missed' | 'excused';
  answered_at: string | null;
  escalated_at: string | null;
  asked_step: number;
  asked_at: string | null;
  minutes: number | null;
  verified_at: string | null;
};

export type PassRow = { id: string; plan_id: string; kind: 'week' | 'workout'; ref: string; reason: string; created_at: string };

export const getPlan = async (id: string) =>
  ((await sql`select * from plans where id = ${id}`)[0] as PlanRow) ?? null;

export const planForAccount = async (accountId: string) =>
  ((await sql`
      select * from plans where account_id = ${accountId} order by created_at limit 1
    `)[0] as PlanRow) ?? null;

export const getWeighIns = async (id: string) =>
  (await sql`select * from weigh_ins where plan_id = ${id} order by date`) as WeighInRow[];

export const getSessions = async (id: string) =>
  (await sql`select * from sessions where plan_id = ${id} order by date`) as SessionRow[];

export const getPasses = async (id: string) =>
  (await sql`select id::text, plan_id, kind, ref, reason, created_at from passes where plan_id = ${id} order by id`) as PassRow[];

export const getSteps = async (id: string) =>
  (await sql`select date, steps from steps where plan_id = ${id} order by date`) as { date: string; steps: number }[];

/** Every witness the owner ever named, including ones who left or were removed. */
export const getWitnesses = async (planId: string) =>
  (await sql`select * from witnesses where plan_id = ${planId} order by created_at`) as WitnessRow[];

/** Witnesses who accepted and are still watching: the only people Snitch ever messages. */
export const isWatching = (w: WitnessRow) => !!w.chat_id && !!w.linked_at && !w.stopped_at && !w.removed_at;

/** The name to use for a witness: the owner's name for them, or Telegram's until the app sends it. */
export const witnessName = (w: WitnessRow) => w.name ?? w.tg_name ?? 'your witness';
