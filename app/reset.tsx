import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { AuthError, confirmReset, requestReset } from '../src/lib/session';
import { radius, space, useTheme } from '../src/theme';

const MIN_PASSWORD = 10;

/** Forgot password (AUTH-8): email → a six-digit code → a new password → signed in. The
 *  confirmation reads the same whether or not the account exists. */
export default function Reset() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (work: () => Promise<void>) => {
    // Out of the way, so an error below the fields isn't hidden behind the keyboard.
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const short = password.length > 0 && password.length < MIN_PASSWORD;

  return (
    <Screen>
      <View style={{ gap: space(4), paddingTop: space(6) }}>
        <Text variant="title">{sent ? 'Check your email' : 'Reset your password'}</Text>
        <Text variant="body" tone="dim">
          {sent
            ? `If there’s an account for ${email.trim()}, we’ve sent a code. It works for 15 minutes.`
            : 'We’ll email you a six-digit code.'}
        </Text>

        {!sent ? (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoFocus={!email}
            />
            <Button
              label="Send the code"
              loading={busy}
              disabled={!email.includes('@')}
              onPress={() => run(async () => { await requestReset(email.trim()); setSent(true); })}
            />
          </>
        ) : (
          <>
            <Field
              label="Code"
              numeric
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              placeholder="000000"
              testID="code"
              autoFocus
            />
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder={`At least ${MIN_PASSWORD} characters`}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              testID="new-password"
            />
            {short ? (
              <Text variant="small" tone="dim" style={{ marginTop: -space(2) }}>
                {MIN_PASSWORD - password.length} more {MIN_PASSWORD - password.length === 1 ? 'character' : 'characters'}.
              </Text>
            ) : null}
            {error ? (
              <View style={{ backgroundColor: t.emberSoft, borderRadius: radius.md, padding: space(4) }}>
                <Text variant="small" tone="ember">{error}</Text>
              </View>
            ) : null}
            <Button
              label="Set password and sign in"
              loading={busy}
              disabled={code.length !== 6 || password.length < MIN_PASSWORD}
              onPress={() => run(async () => { await confirmReset(email.trim(), code, password); router.replace('/'); })}
            />
            <Button label="Send a new code" variant="ghost" onPress={() => run(() => requestReset(email.trim()))} />
          </>
        )}
      </View>
    </Screen>
  );
}
