import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { checkJump, checkWeight, heightOf } from '../src/lib/limits';
import { useDismiss } from '../src/lib/nav';
import { deletePhoto, photoUri, takeScalePhoto } from '../src/lib/photos';
import { usePlan } from '../src/lib/store';
import { currentAverage, latestWeighIn, toDate } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** A photo of the scale, then the number on it.
 *
 * The photo is what keeps this honest: typing a number is easy to fudge, a photo of the display
 * taken right now isn't. It comes first so the number is copied from something real. */
export default function Log() {
  const { plan, logWeight } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const [value, setValue] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraOff, setCameraOff] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!plan) return null;
  const { unit, start, target } = plan.goal;
  const height = heightOf(plan.profile);
  const last = latestWeighIn(plan)?.value ?? start;
  const average = currentAverage(plan);
  const parsed = Number(value);
  const problem = checkWeight(parsed, unit, height);
  const warning = problem ? null : checkJump(parsed, latestWeighIn(plan)?.value, unit);
  const valid = parsed > 0 && !problem && !!photo;
  const delta = parsed > 0 && !problem ? parsed - last : 0;

  async function capture() {
    setBusy(true);
    const result = await takeScalePhoto(toDate());
    setBusy(false);
    if (result.ok) {
      deletePhoto(photo ?? undefined); // a retake replaces the last one
      setPhoto(result.name);
      setCameraOff(false);
    } else if (result.reason === 'denied') {
      setCameraOff(true);
    }
  }

  function close() {
    deletePhoto(photo ?? undefined); // taken but never logged
    dismiss();
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space(4) }}>
          <Pressable onPress={close} hitSlop={12}>
            <Text variant="label" tone="faint">
              Close
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: space(6), paddingTop: space(6) }}>
          <View style={{ gap: space(2) }}>
            <Text variant="title">This morning</Text>
            <Text variant="body" tone="dim" numeric>
              {average !== undefined
                ? `Your seven-day average is ${average.toFixed(1)} ${unit}. Target ${target} ${unit}.`
                : `Starting at ${start} ${unit}. Target ${target} ${unit}.`}
            </Text>
          </View>

          {!photo ? (
            <Pressable
              onPress={capture}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Take a photo of the scale"
              style={{
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: t.ember,
                backgroundColor: t.emberSoft,
                paddingVertical: space(8),
                paddingHorizontal: space(5),
                alignItems: 'center',
                gap: space(2),
              }}
            >
              <Text variant="micro" tone="ember">
                STEP 1
              </Text>
              <Text variant="heading" tone="ember">
                Photograph the scale
              </Text>
              <Text variant="small" tone="dim" center>
                Stand on it, then take the photo with the number showing and your feet in the shot.
              </Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: space(4), alignItems: 'center' }}>
              <Image
                source={{ uri: photoUri(photo) }}
                style={{ width: 96, height: 128, borderRadius: radius.md, backgroundColor: t.surfaceHigh }}
              />
              <View style={{ flex: 1, gap: space(2) }}>
                <Text variant="bodyStrong">Photo taken</Text>
                <Text variant="small" tone="dim">
                  Now type the number it shows. The photo stays on your phone.
                </Text>
                <Pressable onPress={capture} hitSlop={8}>
                  <Text variant="label" tone="ember">
                    Retake
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {cameraOff && (
            <View style={{ gap: space(2) }}>
              <Text variant="small" tone="ember">
                Camera access is off, and a weigh-in needs a photo.
              </Text>
              <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
                <Text variant="label" tone="ember">
                  Turn it on in Settings ›
                </Text>
              </Pressable>
            </View>
          )}

          {photo && (
            <Field
              numeric
              autoFocus
              keyboardType="decimal-pad"
              placeholder={String(last)}
              suffix={unit}
              value={value}
              onChangeText={setValue}
              returnKeyType="done"
            />
          )}

          {(problem || warning) && (
            <Text variant="small" tone="ember">
              {problem ?? warning}
            </Text>
          )}

          {parsed > 0 && !problem && !warning && delta !== 0 && (
            <Text variant="label" numeric tone={Math.sign(delta) === Math.sign(target - start) ? 'good' : 'dim'}>
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)} {unit} since your last entry
            </Text>
          )}
        </View>

        <View style={{ gap: space(3), paddingBottom: space(4) }}>
          <Button
            label="Log it"
            disabled={!valid}
            onPress={async () => {
              if (!photo) return;
              await logWeight(parsed, photo);
              dismiss();
            }}
          />
          <Text variant="small" tone="faint" center>
            Your witness is told whether you weighed in, never what it said. They never see the photo.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
