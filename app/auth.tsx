import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { Snitch } from '../src/components/Snitch';
import { Text } from '../src/components/Text';
import { AuthError, signIn, signInWithApple, signUp } from '../src/lib/session';
import { radius, space, useTheme } from '../src/theme';

/** Sign in, or make an account (AUTH-1..7).
 *
 * The account exists so a plan belongs to someone. This screen stays out of the way: Snitch is
 * here, but silent (AUTH-2), a different pose per mode, and it asks for the least it can.
 */
export default function Auth() {
  const t = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    // Simulators without an iCloud account, and every Android device, have no Apple button.
    AppleAuthentication.isAvailableAsync().then(setAppleReady).catch(() => setAppleReady(false));
  }, []);

  const creating = mode === 'up';
  /** Long, not clever — the same floor the server enforces. */
  const MIN_PASSWORD = 10;
  const short = creating && password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit =
    email.trim().length > 3 && password.length >= (creating ? MIN_PASSWORD : 1) && !busy;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      // Index decides where to land, asking the server for this account's plan first.
      router.replace('/');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(() => (creating ? signUp(email.trim(), password) : signIn(email.trim(), password)));

  const withApple = () =>
    run(async () => {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) throw new AuthError('Apple did not return a sign-in.');
        // Apple sends the email on the first sign-in only, so pass it along while we have it.
        await signInWithApple(credential.identityToken, credential.email);
      } catch (err) {
        // Backing out of the Apple sheet is not an error worth shouting about.
        if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
        throw err;
      }
    });

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: space(8), gap: space(4) }}>
        <Snitch mood={creating ? 'hello' : 'ready'} height={150} />
        <Text variant="title" center>
          {creating ? 'Make your account' : 'Welcome back'}
        </Text>
      </View>

      <View style={{ gap: space(4), marginTop: space(6) }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={creating ? `At least ${MIN_PASSWORD} characters` : ''}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          // 'newPassword' lets the keychain offer to generate and save one.
          textContentType={creating ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={() => canSubmit && submit()}
        />

        {/* The placeholder states the rule, then disappears the moment you type — leaving the
            button greyed out with nothing explaining why. Count down instead, so the reason for
            a dead button is always on screen. Dim, not ember: this is not an error yet. */}
        {!creating ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/reset', params: { email: email.trim() } })}
            hitSlop={8}
            style={{ alignSelf: 'flex-start', marginTop: -space(2) }}
          >
            <Text variant="small" tone="dim">
              Forgot password?
            </Text>
          </Pressable>
        ) : null}

        {short ? (
          <Text variant="small" tone="dim" style={{ marginTop: -space(2) }}>
            {MIN_PASSWORD - password.length} more{' '}
            {MIN_PASSWORD - password.length === 1 ? 'character' : 'characters'}.
          </Text>
        ) : null}

        {error ? (
          <View
            style={{
              backgroundColor: t.emberSoft,
              borderRadius: radius.md,
              padding: space(4),
            }}
          >
            <Text variant="small" tone="ember">
              {error}
            </Text>
          </View>
        ) : null}

        <Button
          label={creating ? 'Create account' : 'Sign in'}
          onPress={submit}
          disabled={!canSubmit}
          loading={busy}
        />

        {appleReady && Platform.OS === 'ios' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
              <Text variant="micro" tone="faint">
                OR
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
            </View>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                creating
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                t.scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={radius.pill}
              style={{ height: 54 }}
              onPress={withApple}
            />
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMode(creating ? 'in' : 'up');
            setError(null);
          }}
          style={{ paddingVertical: space(3), alignItems: 'center' }}
        >
          <Text variant="small" tone="dim">
            {creating ? 'I already have an account' : 'I need an account'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
