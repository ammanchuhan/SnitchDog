import { neon, NeonQueryFunction } from '@neondatabase/serverless';

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

export type RoutineSlot = { id: string; label: string; days: number[]; hour: number };

export type PlanRow = {
  id: string;
  owner_name: string;
  timezone: string;
  created_at: string;
  unit: string;
  start_value: string;
  target_value: string;
  wake_hour: number;
  per_week: number;
  routine: RoutineSlot[];
  witness_name: string;
  witness_token: string;
  witness_chat_id: string | null;
  witness_linked_at: string | null;
  owner_chat_id: string | null;
  morning_date: string | null;
  morning_step: number;
  morning_at: string | null;
  escalated_weeks: string[];
};

export type WeighInRow = { plan_id: string; date: string; value: string; logged_at: string };

export type SessionRow = {
  plan_id: string;
  date: string;
  slot_id: string;
  /** 'pending' means asked but not yet answered — it holds the follow-up state. */
  status: 'pending' | 'done' | 'missed';
  answered_at: string | null;
  escalated_at: string | null;
  asked_step: number;
  asked_at: string | null;
};

export const getPlan = async (id: string) =>
  ((await sql`select * from plans where id = ${id}`)[0] as PlanRow) ?? null;

export const getWeighIns = async (id: string) =>
  (await sql`select * from weigh_ins where plan_id = ${id} order by date`) as WeighInRow[];

export const getSessions = async (id: string) =>
  (await sql`select * from sessions where plan_id = ${id} order by date`) as SessionRow[];

export const byWitnessToken = async (token: string) =>
  ((await sql`select * from plans where witness_token = ${token}`)[0] as PlanRow) ?? null;

export const byOwnerChat = async (chatId: string) =>
  ((await sql`
      select * from plans where owner_chat_id = ${chatId} order by created_at desc limit 1
    `)[0] as PlanRow) ?? null;
