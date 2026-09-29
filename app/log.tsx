import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { Snitch } from '../src/components/Snitch';
import { Text } from '../src/components/Text';
import { ApiError } from '../src/lib/api';
import { checkJump, checkWeight, heightOf } from '../src/lib/limits';
import { useDismiss } from '../src/lib/nav';
import { readScale } from '../src/lib/ocr';
import { discardPhoto, takePhoto } from '../src/lib/photos';
import { usePlan } from '../src/lib/store';
import { latestWeighIn } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** Tries before typing is allowed, marked unverified (Q20). */
const TRIES = 3;

type Phase =
  | { kind: 'start' }
  | { kind: 'reading'; uri: string }
  | { kind: 'read'; uri: string; value: number }
  | { kind: 'failed'; uri: string }
  | { kind: 'typing' }
  | { kind: 'saved'; line: string };

/** Log a weigh-in (section 6). Photograph the scale, the phone reads the number, you confirm it.
 *  The number can't be typed over: a wrong reading means Retake (LOG-2). The photo is deleted
 *  the moment the sheet is done with it; only the number is stored (LOG-3). */
export default function Log() {
  const { plan, logWeight } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const [phase, setPhase] = useState<Phase>({ kind: 'start' });
  const [fails, setFails] = useState(0);
  const [typed, setTyped] = useState('');
  const [cameraOff, setCameraOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photo = useRef<string | null>(null);

  // Whatever happens, the scale photo doesn't outlive the sheet.
  useEffect(() => () => discardPhoto(photo.current), []);

  if (!plan) return null;
  const { unit } = plan.goal;
  const height = heightOf(plan.profile);
  const last = latestWeighIn(plan)?.value;

  async function capture() {
    setError(null);
    const result = await takePhoto('back');
    if (!result.ok) {
      if (result.reason === 'denied') setCameraOff(true);
      return;
    }
    setCameraOff(false);
    discardPhoto(photo.current); // a retake replaces the last one
    photo.current = result.uri;
    setPhase({ kind: 'reading', uri: result.uri });
    const value = await readScale(result.uri);
    if (value !== null && !checkWeight(value, unit, height)) {
      setPhase({ kind: 'read', uri: result.uri, value });
    } else {
      setFails((n) => n + 1);
      setPhase({ kind: 'failed', uri: result.uri });
    }
  }

  async function save(value: number, verified: boolean) {
    setBusy(true);
    setError(null);
    try {
      const line = await logWeight(value, verified);
      discardPhoto(photo.current);
      photo.current = null;
      setPhase({ kind: 'saved', line });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t save that. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const typedValue = Number(typed);
  const typedProblem = checkWeight(typedValue, unit, height);
  const readValue = phase.kind === 'read' ? phase.value : phase.kind === 'typing' ? typedValue : 0;
  const jump = readValue > 0 ? checkJump(readValue, last, unit) : null;

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingTop: space(4) }}>
          <Pressable onPress={dismiss} hitSlop={12} accessibilityRole="button">
            <Text variant="label" tone="faint">
              {phase.kind === 'saved' ? 'Done' : 'Close'}
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: space(6), paddingTop: space(4) }}>
          {phase.kind === 'saved' ? (
            <View style={{ flex: 1, justifyContent: 'center', gap: space(5) }}>
              <Snitch mood="proud" height={180} />
              <Text variant="title" center>
                Logged.
              </Text>
              <Text variant="body" tone="dim" center>
                {phase.line}
              </Text>
              <Text variant="small" tone="faint" center>
                The photo is deleted. Only the number is kept.
              </Text>
            </View>
          ) : (
            <>
              <Text variant="title">Weigh-in</Text>

              {phase.kind === 'start' && (
                <Pressable
                  onPress={capture}
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo of the scale"
                  style={{
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: t.ember,
                    backgroundColor: t.emberSoft,
                    paddingVertical: space(10),
                    paddingHorizontal: space(5),
                    alignItems: 'center',
                    gap: space(2),
                  }}
                >
                  <Text variant="heading" tone="ember">
                    Photograph the scale
                  </Text>
                  <Text variant="small" tone="dim" center>
                    Stand on it, then photograph the display. I read the number, then the photo is deleted. It’s never kept.
                  </Text>
                </Pressable>
              )}

              {(phase.kind === 'reading' || phase.kind === 'read' || phase.kind === 'failed') && (
                <Image
                  source={{ uri: phase.uri }}
                  style={{ height: 180, borderRadius: radius.md, backgroundColor: t.surfaceHigh }}
                  resizeMode="cover"
                />
              )}

              {phase.kind === 'reading' && (
                <Text variant="body" tone="dim">
                  Reading it…
                </Text>
              )}

              {phase.kind === 'read' && (
                <View style={{ gap: space(2), alignItems: 'center' }}>
                  <Text variant="hero" numeric>
                    {phase.value.toFixed(1)} {unit}
                  </Text>
                  <Text variant="heading">Right?</Text>
                </View>
              )}

              {phase.kind === 'failed' && (
                <Text variant="body" tone="ember">
                  I can’t read that. Try again with the display in focus.
                </Text>
              )}

              {phase.kind === 'typing' && (
                <View style={{ gap: space(2) }}>
                  <Text variant="body" tone="dim">
                    Type what it says. It’ll show as unverified in your history.
                  </Text>
                  <Field numeric autoFocus keyboardType="decimal-pad" placeholder={last ? String(last) : '0'} suffix={unit} value={typed} onChangeText={setTyped} />
                  {typedValue > 0 && typedProblem ? (
                    <Text variant="small" tone="ember">
                      {typedProblem}
                    </Text>
                  ) : null}
                </View>
              )}

              {jump && (
                <Text variant="small" tone="dim">
                  Big change since last time. Same scale?
                </Text>
              )}

              {cameraOff && (
                <View style={{ gap: space(2) }}>
                  <Text variant="small" tone="ember">
                    Camera access is off, and a weigh-in needs a photo of the scale.
                  </Text>
                  <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
                    <Text variant="label" tone="ember">
                      Turn it on in Settings ›
                    </Text>
                  </Pressable>
                </View>
              )}

              {error && (
                <Text variant="small" tone="ember">
                  {error}
                </Text>
              )}
            </>
          )}
        </View>

        {phase.kind !== 'saved' && (
          <View style={{ gap: space(3), paddingBottom: space(4) }}>
            {phase.kind === 'read' && (
              <>
                <Button label="Save" loading={busy} onPress={() => save(phase.value, true)} />
                <Button label="Retake" variant="secondary" onPress={capture} />
              </>
            )}
            {phase.kind === 'failed' && (
              <>
                <Button label="Retake" onPress={capture} />
                {fails >= TRIES && <Button label="Type it instead" variant="ghost" onPress={() => setPhase({ kind: 'typing' })} />}
              </>
            )}
            {phase.kind === 'typing' && (
              <Button label="Save" loading={busy} disabled={!(typedValue > 0) || !!typedProblem} onPress={() => save(typedValue, false)} />
            )}
            <Text variant="small" tone="faint" center>
              Witnesses hear whether you weighed in, never the number.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
