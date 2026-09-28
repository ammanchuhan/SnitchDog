/** Email, for password reset only (AUTH-9). Sent through Resend from a snitchdog.com address. */

const FROM = process.env.EMAIL_FROM ?? 'Snitch <hello@snitchdog.com>';

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Local development without a key: the code goes to the server log instead. Never in production.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email] to ${to}: ${subject}\n${text}`);
      return true;
    }
    console.error('[email] RESEND_API_KEY is not set');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  });
  if (!res.ok) console.error('[email] send failed', res.status);
  return res.ok;
}
