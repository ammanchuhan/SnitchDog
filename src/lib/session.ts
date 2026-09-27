/** The signed-in account, and the token every API call carries.
 *
 * Until accounts existed the server trusted a plan id, which meant anyone with an id could read
 * or write anyone's commitment. The token is what closes that: it is minted by the server at
 * sign-up or sign-in, kept in the device keychain, and sent as a bearer on every call.
 *
 * Kept deliberately small. The screens own their own loading and error state; this file only
 * knows how to get a token, keep it, and throw it away.
 */
import * as SecureStore from 'expo-secure-store';

const KEY = 'snitchdog.session.v1';

/** AFTER_FIRST_UNLOCK rather than WHEN_UNLOCKED, because a background task — the gym check, when
 *  it lands — has to read this while the phone is locked. THIS_DEVICE_ONLY keeps the token out
 *  of encrypted backups, so restoring a backup onto a second phone does not clone the session. */
const STORE: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

/** Read once at launch, then kept here so every request isn't a keychain round trip. */
let cached: string | null = null;
let loaded = false;

export async function loadToken(): Promise<string | null> {
  if (loaded) return cached;
  try {
    cached = await SecureStore.getItemAsync(KEY, STORE);
  } catch {
    // A keychain that refuses to open is not a reason to crash on launch; it means signed out.
    cached = null;
  }
  loaded = true;
  return cached;
}

/** Synchronous read for the API layer, which cannot await before building a header. */
export const currentToken = () => cached;

export const signedIn = () => cached !== null;

async function keep(token: string) {
  cached = token;
  loaded = true;
  await SecureStore.setItemAsync(KEY, token, STORE);
}

async function forget() {
  cached = null;
  loaded = true;
  await SecureStore.deleteItemAsync(KEY, STORE).catch(() => {});
}

export class AuthError extends Error {}

type AuthResponse = { token: string; accountId: string };

async function post(path: string, body: unknown): Promise<AuthResponse> {
  if (!BASE) throw new AuthError('No server is configured for this build.');

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError('Could not reach the server. Check your connection.');
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    // The server writes these for a person to read, so prefer its wording over our own.
    throw new AuthError(
      typeof data.error === 'string' ? data.error : 'That did not work. Try again.',
    );
  }
  return data as AuthResponse;
}

export async function signUp(email: string, password: string) {
  const { token } = await post('/api/auth/signup', { email, password });
  await keep(token);
}

export async function signIn(email: string, password: string) {
  const { token } = await post('/api/auth/login', { email, password });
  await keep(token);
}

/** Apple gives us the identity token; the server is what decides whether to believe it. */
export async function signInWithApple(identityToken: string, email?: string | null) {
  const { token } = await post('/api/auth/apple', { identityToken, email });
  await keep(token);
}

export async function signInWithGoogle(idToken: string) {
  const { token } = await post('/api/auth/google', { idToken });
  await keep(token);
}

/** Best effort server-side, certain on the device: the token is gone either way.
 *
 *  Reads through `loadToken` rather than the in-memory copy, because the cache is cold on a
 *  fresh launch (and after a fast refresh in development). Trusting it would mean silently
 *  skipping the revoke and leaving a live token on the server. */
export async function signOut() {
  const token = await loadToken();
  await forget();
  if (BASE && token) {
    await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

/** Erasure. The server drops the account and everything that cascades from it — the plan, the
 *  weigh-ins, the sessions, the coach's memory, and both Telegram chat links. The device copy
 *  goes either way: a failed request must never leave someone unable to walk away. */
export async function deleteAccount(): Promise<boolean> {
  // Same reason as signOut: never depend on the cache being warm for something irreversible.
  const token = await loadToken();
  await forget();
  if (!BASE || !token) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/account`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
