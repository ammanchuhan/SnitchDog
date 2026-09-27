/** Accounts and bearer tokens.
 *
 * Before this existed, `/api/plan` trusted whatever id it was handed, so any client could read
 * or write any commitment (spec §7 Gap 1). A plan now belongs to an account, and every route the
 * app calls resolves the caller from an opaque bearer token before it touches a row.
 *
 * Tokens are random and stored only as a sha256 digest: a leaked database yields no live session.
 * Passwords use scrypt from node:crypto — no native dependency to build on Vercel.
 */
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { sql } from './db';

export type Account = {
  id: string;
  email: string | null;
  apple_user_id: string | null;
  google_user_id?: string | null;
};

const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'));
  const expected = Buffer.from(keyHex, 'hex');
  // Lengths must match before timingSafeEqual, which throws on a mismatch.
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

/** Mints a session. The plaintext is returned once and never stored. */
export async function issueToken(accountId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await sql`insert into auth_tokens (token_hash, account_id) values (${digest(token)}, ${accountId})`;
  return token;
}

export async function revokeToken(token: string): Promise<void> {
  await sql`delete from auth_tokens where token_hash = ${digest(token)}`;
}

export const bearer = (req: Request): string | null => {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
};

/** The caller, or null. Routes translate null into a 401 themselves. */
export async function accountFor(req: Request): Promise<Account | null> {
  const token = bearer(req);
  if (!token) return null;

  const rows = (await sql`
    select a.id, a.email, a.apple_user_id
      from auth_tokens t join accounts a on a.id = t.account_id
     where t.token_hash = ${digest(token)}
  `) as Account[];
  if (!rows.length) return null;

  await sql`update auth_tokens set last_seen_at = now() where token_hash = ${digest(token)}`;
  return rows[0];
}

export const unauthorized = () => new Response('unauthorized', { status: 401 });

/** A provider sign-in collided with a password account for the same address. */
export class EmailTakenError extends Error {}

/** True when this plan is the caller's. Used by every per-plan route. */
export async function ownsPlan(accountId: string, planId: string): Promise<boolean> {
  const rows = (await sql`
    select 1 from plans where id = ${planId} and account_id = ${accountId}
  `) as unknown[];
  return rows.length > 0;
}

// ── Accounts ───────────────────────────────────────────────────────────────────────────────

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export async function findByEmail(email: string) {
  const rows = (await sql`
    select id, email, password_hash, apple_user_id from accounts where email = ${normaliseEmail(email)}
  `) as (Account & { password_hash: string | null })[];
  return rows[0] ?? null;
}

export async function createAccount(opts: {
  email?: string | null;
  passwordHash?: string | null;
  appleUserId?: string | null;
  googleUserId?: string | null;
}): Promise<Account> {
  const id = randomUUID();
  await sql`
    insert into accounts (id, email, password_hash, apple_user_id, google_user_id)
    values (${id}, ${opts.email ? normaliseEmail(opts.email) : null},
            ${opts.passwordHash ?? null}, ${opts.appleUserId ?? null}, ${opts.googleUserId ?? null})
  `;
  return {
    id,
    email: opts.email ? normaliseEmail(opts.email) : null,
    apple_user_id: opts.appleUserId ?? null,
    google_user_id: opts.googleUserId ?? null,
  };
}

// ── Sign in with Apple ─────────────────────────────────────────────────────────────────────

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/** Verifies an identity token against Apple's published keys and returns the stable user id.
 *
 *  `sub` is the only field we can rely on: Apple sends email and name on the *first* sign-in
 *  only, so the client forwards those separately and we treat them as a bonus, never a key. */
export async function verifyAppleToken(identityToken: string): Promise<{ sub: string; email: string | null }> {
  const audience = process.env.APPLE_BUNDLE_ID || 'com.ammanchuhan.accountable';
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: 'https://appleid.apple.com',
    audience,
  });
  if (!payload.sub) throw new Error('apple token has no sub');
  // Same rule as Google: an address Apple has not vouched for is not a key to anything.
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  return { sub: payload.sub, email: verified ? ((payload.email as string | undefined) ?? null) : null };
}

// ── Sign in with Google ────────────────────────────────────────────────────────────────────

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Verifies a Google ID token. Accepts any of the configured client ids as the audience, because
 *  the iOS app and a web flow present different ones for the same person. */
export async function verifyGoogleToken(idToken: string): Promise<{ sub: string; email: string | null }> {
  const audiences = (process.env.GOOGLE_CLIENT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!audiences.length) throw new Error('GOOGLE_CLIENT_IDS is not set');

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: audiences,
  });
  if (!payload.sub) throw new Error('google token has no sub');
  // Google tells us whether it has actually verified the address; an unverified one must never
  // be used to link to an existing account, or it becomes an account-takeover route.
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  return { sub: payload.sub, email: verified ? ((payload.email as string | undefined) ?? null) : null };
}

// ── Shared provider sign-in ────────────────────────────────────────────────────────────────

/** Resolves a verified provider identity to an account, creating one if this is a first sign-in.
 *
 *  Order matters. The provider's subject is checked first because it is the only stable key.
 *  Email is used to link to an account the person already made with a password — but only when
 *  the provider vouched for that address, or anyone able to claim an address could seize the
 *  account behind it. */
export async function linkOrCreate(
  provider: 'apple' | 'google',
  sub: string,
  email: string | null,
): Promise<Account> {
  // Two explicit queries rather than one with an interpolated column name: §7 says every query
  // is parameterised, and a column name cannot be a parameter.
  const existing = (
    provider === 'apple'
      ? await sql`select id, email, apple_user_id, google_user_id from accounts where apple_user_id = ${sub}`
      : await sql`select id, email, apple_user_id, google_user_id from accounts where google_user_id = ${sub}`
  ) as Account[];
  if (existing.length) return existing[0];

  if (email) {
    const byEmail = await findByEmail(email);
    // Linking by email is only safe when both sides proved they own it. A password account has
    // proved nothing — nobody verifies that address at sign-up — so merging into one would let
    // somebody register a victim's email and inherit their account the moment the victim used a
    // provider. Refuse instead, and say why. Revisit when email verification exists.
    if (byEmail && byEmail.password_hash) throw new EmailTakenError();
    if (byEmail) {
      if (provider === 'apple') {
        await sql`update accounts set apple_user_id = ${sub} where id = ${byEmail.id}`;
      } else {
        await sql`update accounts set google_user_id = ${sub} where id = ${byEmail.id}`;
      }
      return byEmail;
    }
  }

  return createAccount(
    provider === 'apple' ? { email, appleUserId: sub } : { email, googleUserId: sub },
  );
}
