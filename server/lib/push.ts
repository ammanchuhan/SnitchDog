/** Push notifications to the owner's phones, through Expo's push service (DATA-7). */
import { sql } from './db';

export type PushData = { tab: 'home' | 'coach' };

export async function pushTo(accountId: string, body: string, data: PushData) {
  const tokens = (await sql`select token from push_tokens where account_id = ${accountId}`) as { token: string }[];
  if (!tokens.length) return;

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: 'Snitch', body, data, sound: 'default' }))),
    });
    const out = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
    // A token for an uninstalled app never works again; stop sending to it.
    for (const [i, ticket] of (out.data ?? []).entries()) {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await sql`delete from push_tokens where token = ${tokens[i].token}`;
      }
    }
  } catch {
    // Body left out on purpose: it can name the owner's witnesses.
    console.error('[push] send failed');
  }
}
