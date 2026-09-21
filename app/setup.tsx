import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Choice } from '../src/components/Choice';
import { Field } from '../src/components/Field';
import { HeightField } from '../src/components/HeightField';
import { HourPicker, hourLabel } from '../src/components/HourPicker';
import { RoutineEditor } from '../src/components/RoutineEditor';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { WitnessRole } from '../src/components/WitnessRole';
import { shortId } from '../src/lib/id';
import { checkTarget, checkWeight, heightOf, suggestTarget, targetNote } from '../src/lib/limits';
import {
  buildRoutine,
  COMMITMENT,
  PACE,
  SCHEDULE,
  TRAIN_TIME,
  workoutsFor,
} from '../src/lib/planner';
import { usePlan } from '../src/lib/store';
import type { Commitment, HeightUnit, Pace, Plan, RoutineSlot, Schedule, TrainTime } from '../src/lib/types';
import { WEEKDAY_LABEL, WEIGH_INS_PER_WEEK } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

const STEPS = ['open', 'you', 'weight', 'pace', 'day', 'training', 'plan', 'witness', 'deal'] as const;
type Step = (typeof STEPS)[number];

const keys = <K extends string>(r: Record<K, unknown>) => Object.keys(r) as K[];

/** Sign-up asks about the person before it asks for a promise. Height makes the target range
 *  theirs; schedule, commitment and pace become a first week of workouts they can see and change
 *  before anything is saved. */
export default function Setup() {
  const router = useRouter();
  const { start } = usePlan();
  const t = useTheme();

  const [step, setStep] = useState(0);
  // you
  const [ownerName, setOwnerName] = useState('');
  const [age, setAge] = useState('');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [heightCm, setHeightCm] = useState<number>();
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('ft');
  // weight
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  // pace, day, training
  const [pace, setPace] = useState<Pace>();
  const [schedule, setSchedule] = useState<Schedule>();
  const [wakeHour, setWakeHour] = useState(7);
  const [commitment, setCommitment] = useState<Commitment>();
  const [trainTime, setTrainTime] = useState<TrainTime>();
  // plan, witness
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [witnessName, setWitnessName] = useState('');

  const current: Step = STEPS[step];
  const startNum = Number(startValue);
  const targetNum = Number(targetValue);
  const ageNum = Number(age);
  const tooYoung = age.length > 0 && ageNum > 0 && ageNum < 18;
  const height = heightOf({ heightCm, heightUnit });
  const weightProblem = height
    ? (checkWeight(startNum, unit, height) ?? checkTarget(startNum, targetNum, unit, height))
    : null;

  const canContinue: Record<Step, boolean> = {
    open: true,
    you: ownerName.trim().length > 0 && ageNum >= 18 && ageNum <= 100 && !!heightCm,
    weight: startNum > 0 && targetNum > 0 && !weightProblem,
    pace: !!pace,
    day: !!schedule,
    training: !!commitment && !!trainTime,
    plan: true,
    witness: witnessName.trim().length > 0,
    deal: true,
  };

  function next() {
    // Arriving at the plan builds it fresh from the answers; going back and changing an answer
    // rebuilds it. Edits made on the plan step itself are kept until then.
    if (current === 'training' && commitment && pace && schedule && trainTime) {
      setRoutine(buildRoutine({ commitment, pace, schedule, trainTime, wakeHour }));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function begin() {
    const plan: Plan = {
      id: shortId(12),
      ownerName: ownerName.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date().toISOString(),
      goal: { unit, start: startNum, target: targetNum, wakeHour, perWeek: WEIGH_INS_PER_WEEK },
      profile: { heightCm, heightUnit, age: ageNum, schedule, trainTime, commitment, pace },
      routine: routine.filter((s) => s.days.length > 0 && s.label.trim().length > 0),
      witness: { name: witnessName.trim(), linked: false, inviteToken: shortId(16) },
      weighIns: [],
      sessions: [],
    };
    await start(plan);
    router.replace('/witness');
  }

  const suggested =
    height && startNum > 0 && !checkWeight(startNum, unit, height) ? suggestTarget(startNum, unit, height.cm) : null;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <View style={{ flexDirection: 'row', gap: space(1), paddingTop: space(4), paddingBottom: space(8) }}>
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
                Weigh in with a photo. Train when you said you would. Name one person who finds out
                when you don&rsquo;t.
              </Text>
              <Text variant="small" tone="faint" style={{ maxWidth: 320 }}>
                A few questions first, so the plan fits your body and your week.
              </Text>
            </View>
          )}

          {current === 'you' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">First, you</Text>
              <Field
                label="Your first name"
                value={ownerName}
                onChangeText={setOwnerName}
                autoCapitalize="words"
                placeholder="First name"
              />
              <Field
                label="Age"
                numeric
                keyboardType="number-pad"
                maxLength={3}
                placeholder="0"
                value={age}
                onChangeText={setAge}
              />
              {tooYoung && (
                <Text variant="small" tone="ember">
                  Accountable is for adults. A weight target and someone reporting on you isn&rsquo;t
                  the right setup under 18.
                </Text>
              )}
              <HeightField
                cm={heightCm}
                unit={heightUnit}
                onChange={(cm, u) => {
                  setHeightCm(cm);
                  setHeightUnit(u);
                  // Someone who thinks in centimetres almost certainly weighs in kilograms. Only a
                  // default: the weight page has its own switch.
                  setUnit(u === 'cm' ? 'kg' : 'lb');
                }}
              />
              <Text variant="small" tone="faint">
                Height sets a healthy range for your target. Your height and age stay on this phone.
              </Text>
            </View>
          )}

          {current === 'weight' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">Where are you now?</Text>
              <UnitToggle unit={unit} onChange={setUnit} />
              <Field
                label="Today"
                numeric
                keyboardType="decimal-pad"
                placeholder="0"
                suffix={unit}
                value={startValue}
                onChangeText={setStartValue}
              />
              <Field
                label="Where you want to get to"
                numeric
                keyboardType="decimal-pad"
                placeholder={suggested ? String(suggested) : '0'}
                suffix={unit}
                value={targetValue}
                onChangeText={setTargetValue}
              />
              {height && !weightProblem && (
                <Text variant="small" tone="dim" numeric>
                  {targetNote(startNum, targetNum, unit, height)}
                </Text>
              )}
              {suggested && !targetValue && (
                <Pressable
                  onPress={() => setTargetValue(String(suggested))}
                  style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: space(4),
                    paddingVertical: space(2),
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: t.ember,
                  }}
                >
                  <Text variant="label" tone="ember" numeric>
                    Start with {suggested} {unit}
                  </Text>
                </Pressable>
              )}
              {weightProblem ? (
                <Text variant="small" tone="ember">
                  {weightProblem}
                </Text>
              ) : null}
            </View>
          )}

          {current === 'pace' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">How fast do you want to see results?</Text>
              <Text variant="body" tone="dim">
                Progress won&rsquo;t be a straight line either way. Weeks stall, some weeks jump. This
                sets how much you&rsquo;re asking of yourself.
              </Text>
              <Choice
                value={pace}
                onChange={setPace}
                options={keys(PACE).map((k) => ({ key: k, label: PACE[k].label, note: PACE[k].note }))}
              />
            </View>
          )}

          {current === 'day' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">What does your week look like?</Text>
              <Choice value={schedule} onChange={setSchedule} options={keys(SCHEDULE).map((k) => ({ key: k, label: SCHEDULE[k] }))} />
              <View style={{ gap: space(3), paddingTop: space(4) }}>
                <Text variant="heading">When do you get up?</Text>
                <Text variant="small" tone="dim">
                  Weight only compares honestly first thing, before food and water. I&rsquo;ll ask you then.
                </Text>
                <HourPicker value={wakeHour} onChange={setWakeHour} from={4} to={12} />
              </View>
            </View>
          )}

          {current === 'training' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">How committed are you?</Text>
              <Choice
                value={commitment}
                onChange={setCommitment}
                options={keys(COMMITMENT).map((k) => ({ key: k, label: COMMITMENT[k].label, note: COMMITMENT[k].note }))}
              />
              <View style={{ gap: space(3), paddingTop: space(4) }}>
                <Text variant="heading">When do you like to train?</Text>
                <Choice
                  value={trainTime}
                  onChange={setTrainTime}
                  options={keys(TRAIN_TIME).map((k) => ({ key: k, label: TRAIN_TIME[k] }))}
                />
              </View>
            </View>
          )}

          {current === 'plan' && commitment && pace && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">Your plan</Text>
              <Text variant="body" tone="dim">
                {workoutsFor(commitment, pace)} workouts a week, built from your answers. At the time
                below I&rsquo;ll ask whether you did it. Change anything that doesn&rsquo;t fit.
              </Text>
              <RoutineEditor routine={routine} onChange={setRoutine} />
              <Card style={{ gap: space(1) }}>
                <Text variant="bodyStrong">Plus {WEIGH_INS_PER_WEEK} weigh-ins a week</Text>
                <Text variant="small" tone="dim">
                  Any {WEIGH_INS_PER_WEEK} mornings, each with a photo of the scale. The photo is what
                  makes the number count.
                </Text>
              </Card>
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
                placeholder="Their first name"
                value={witnessName}
                onChangeText={setWitnessName}
                autoCapitalize="words"
              />
              <WitnessRole name={witnessName} />
            </View>
          )}

          {current === 'deal' && (
            <View style={{ gap: space(5) }}>
              <Text variant="title">The deal</Text>
              <Card tone="ember" style={{ gap: space(4) }}>
                <View style={{ gap: space(1) }}>
                  <Text variant="micro" tone="ember">
                    MORNINGS AT {hourLabel(wakeHour).toUpperCase()}
                  </Text>
                  <Text variant="heading">Photo on the scale</Text>
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
                          {s.days.map((d) => WEEKDAY_LABEL[d]).join(', ')}, asked at {hourLabel(s.hour)}
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
            onPress={current === 'deal' ? begin : next}
            disabled={!canContinue[current]}
          />
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={() => setStep((s) => Math.max(s - 1, 0))} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function UnitToggle({ unit, onChange }: { unit: 'lb' | 'kg'; onChange: (u: 'lb' | 'kg') => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: space(2) }}>
      <Text variant="micro" tone="faint">
        YOU WEIGH IN
      </Text>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        {(['lb', 'kg'] as const).map((u) => (
          <Pressable
            key={u}
            onPress={() => onChange(u)}
            style={{
              paddingHorizontal: space(5),
              paddingVertical: space(2),
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: unit === u ? t.text : t.line,
              backgroundColor: unit === u ? t.text : 'transparent',
            }}
          >
            <Text variant="label" style={{ color: unit === u ? t.bg : t.textDim }}>
              {u === 'lb' ? 'Pounds' : 'Kilograms'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
