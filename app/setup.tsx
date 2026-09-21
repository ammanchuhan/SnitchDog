import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Field } from '../src/components/Field';
import { HourPicker, hourLabel } from '../src/components/HourPicker';
import { RoutineEditor, newSlot } from '../src/components/RoutineEditor';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { shortId } from '../src/lib/id';
import { usePlan } from '../src/lib/store';
import type { Plan, RoutineSlot } from '../src/lib/types';
import { WEEKDAY_LABEL, WEIGH_INS_PER_WEEK } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

const STEPS = ['open', 'weight', 'wake', 'routine', 'witness', 'deal'] as const;

export default function Setup() {
  const router = useRouter();
  const { start } = usePlan();
  const t = useTheme();

  const [step, setStep] = useState(0);
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [wakeHour, setWakeHour] = useState(7);
  const [routine, setRoutine] = useState<RoutineSlot[]>([newSlot()]);
  const [witnessName, setWitnessName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const current = STEPS[step];
  const canContinue = {
    open: true,
    weight: Number(startValue) > 0 && Number(targetValue) > 0,
    wake: true,
    routine: true,
    witness: witnessName.trim().length > 0 && ownerName.trim().length > 0,
    deal: true,
  }[current];

  async function begin() {
    const plan: Plan = {
      id: shortId(12),
      ownerName: ownerName.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date().toISOString(),
      goal: {
        unit,
        start: Number(startValue),
        target: Number(targetValue),
        wakeHour,
        perWeek: WEIGH_INS_PER_WEEK,
      },
      routine: routine.filter((s) => s.days.length > 0 && s.label.trim().length > 0),
      witness: { name: witnessName.trim(), linked: false, inviteToken: shortId(16) },
      weighIns: [],
      sessions: [],
    };
    await start(plan);
    router.replace('/witness');
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <View style={{ flexDirection: 'row', gap: space(2), paddingTop: space(4), paddingBottom: space(8) }}>
          {STEPS.slice(1).map((s, i) => (
            <View
              key={s}
              style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? t.ember : t.surfaceHigh }}
            />
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {current === 'open' && (
            <View style={{ gap: space(5), paddingTop: space(10) }}>
              <Text variant="hero">Accountable</Text>
              <Text variant="body" tone="dim" style={{ maxWidth: 320 }}>
                Weigh in most mornings. Train when you said you would. Name one person who finds
                out when you don&rsquo;t.
              </Text>
            </View>
          )}

          {current === 'weight' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">Where are you now?</Text>
              <View style={{ flexDirection: 'row', gap: space(3) }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Today"
                    numeric
                    keyboardType="decimal-pad"
                    placeholder="0"
                    suffix={unit}
                    value={startValue}
                    onChangeText={setStartValue}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Goal"
                    numeric
                    keyboardType="decimal-pad"
                    placeholder="0"
                    suffix={unit}
                    value={targetValue}
                    onChangeText={setTargetValue}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                {(['lb', 'kg'] as const).map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={{
                      paddingHorizontal: space(4),
                      paddingVertical: space(2),
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: unit === u ? t.text : t.line,
                      backgroundColor: unit === u ? t.text : 'transparent',
                    }}
                  >
                    <Text variant="label" style={{ color: unit === u ? t.bg : t.textDim }}>
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text variant="small" tone="faint">
                Progress is measured on a seven-day average, so a heavy morning doesn&rsquo;t count
                against you.
              </Text>
            </View>
          )}

          {current === 'wake' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">What time do you get up?</Text>
              <Text variant="body" tone="dim">
                Weight only compares honestly first thing, before food and water. I&rsquo;ll ask
                you then.
              </Text>
              <HourPicker value={wakeHour} onChange={setWakeHour} from={4} to={12} />

              <View style={{ gap: space(3), paddingTop: space(6) }}>
                <Text variant="heading">I&rsquo;ll ask every morning.</Text>
                <Text variant="body" tone="dim">
                  You have to stand on the scale{' '}
                  <Text variant="bodyStrong">{WEIGH_INS_PER_WEEK} of those mornings</Text>. Miss
                  one and nothing happens. Finish a week short and your witness hears about it.
                </Text>
                <Text variant="small" tone="faint">
                  Three isn&rsquo;t adjustable. A number you can lower isn&rsquo;t a commitment.
                </Text>
              </View>
            </View>
          )}

          {current === 'routine' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">When do you train?</Text>
              <Text variant="body" tone="dim">
                Put your week in and I&rsquo;ll ask about the session you actually planned, not
                whether you &ldquo;did something&rdquo;.
              </Text>
              <RoutineEditor routine={routine} onChange={setRoutine} />
              <Pressable onPress={() => setRoutine([])} hitSlop={8}>
                <Text variant="small" tone="faint">
                  Skip for now — you can add this later
                </Text>
              </Pressable>
            </View>
          )}

          {current === 'witness' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">Who finds out when you don&rsquo;t?</Text>
              <Text variant="body" tone="dim">
                One person, not a group chat. Someone whose disappointment you&rsquo;d actually feel.
              </Text>
              <Field
                label="Your witness"
                placeholder="First name"
                value={witnessName}
                onChangeText={setWitnessName}
                autoCapitalize="words"
              />
              <Field
                label="And you are"
                placeholder="Your first name"
                value={ownerName}
                onChangeText={setOwnerName}
                autoCapitalize="words"
              />
              <Text variant="small" tone="faint">
                They don&rsquo;t install anything. They get a message, and only when it matters.
              </Text>
            </View>
          )}

          {current === 'deal' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">The deal</Text>
              <Card tone="ember" style={{ gap: space(4) }}>
                <View style={{ gap: space(1) }}>
                  <Text variant="micro" tone="ember">
                    EVERY MORNING AT {hourLabel(wakeHour).toUpperCase()}
                  </Text>
                  <Text variant="heading">Step on the scale</Text>
                  <Text variant="small" tone="dim">
                    {WEIGH_INS_PER_WEEK} mornings a week. The rest are yours.
                  </Text>
                </View>
                {routine.length > 0 && (
                  <>
                    <View style={{ height: 1, backgroundColor: t.ember, opacity: 0.25 }} />
                    <View style={{ gap: space(1) }}>
                      {routine.map((s) => (
                        <Text key={s.id} variant="small" tone="dim">
                          <Text variant="bodyStrong">{s.label}</Text>
                          {' — '}
                          {s.days.map((d) => WEEKDAY_LABEL[d]).join(', ')} by {hourLabel(s.hour)}
                        </Text>
                      ))}
                    </View>
                  </>
                )}
                <View style={{ height: 1, backgroundColor: t.ember, opacity: 0.25 }} />
                <Text variant="body" tone="dim">
                  Go quiet, or finish a week short, and{' '}
                  <Text variant="bodyStrong" tone="ember">
                    {witnessName.trim()}
                  </Text>{' '}
                  hears about it. That&rsquo;s the whole product.
                </Text>
              </Card>
              <Text variant="small" tone="faint">
                All of this is editable later. Changing your witness resets the count.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={{ gap: space(3), paddingTop: space(4) }}>
          <Button
            label={current === 'deal' ? 'Make it real' : current === 'open' ? 'Start' : 'Continue'}
            onPress={current === 'deal' ? begin : () => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
            disabled={!canContinue}
          />
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={() => setStep((s) => Math.max(s - 1, 0))} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
