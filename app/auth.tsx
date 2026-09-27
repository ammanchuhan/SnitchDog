import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Ember } from '../src/components/Ember';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { SpeechBubble } from '../src/components/SpeechBubble';
import { Text } from '../src/components/Text';
import { AuthError, signIn, signInWithApple, signUp } from '../src/lib/session';
import { usePlan } from '../src/lib/store';
import { radius, space, useTheme } from '../src/theme';

/** Sign in, or make an account.
 *
 * The account exists for one reason: a plan has to belong to someone, or the server cannot tell
 * whose commitment it is being asked about. So this screen stays out of the way — Ember says what
 * it's for in one line and then asks for the least it can.
 */
export default function Auth() {
  const t = useTheme();
  const router = useRouter();
  const { hydrate } = usePlan();

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
      // The store loaded before anyone was signed in, so it found nothing. Now that there is a
      // token, pull this account's plan down — otherwise signing in on a device with no local
      // copy drops the person into onboarding as though they had never been here.
      await hydrate();
      // Index decides where to land: straight into the plan, or into Ember's sign-up.
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
      <View style={{ alignItems: 'center', paddingTop: space(6), gap: space(4) }}>
        <SpeechBubble
          lines={
            creating
              ? ['Before we start — this is so your plan is yours,', 'and nobody else can see it.']
              : ['Welcome back.']
          }
        />
        <Ember mood={creating ? 'hello' : 'happy'} height={110} />
      </View>

      <View style={{ gap: space(4), marginTop: space(8) }}>
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
