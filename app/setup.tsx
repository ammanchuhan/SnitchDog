import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Choice } from '../src/components/Choice';
import { Ember, EmberMood } from '../src/components/Ember';
import { Field } from '../src/components/Field';
import { HeightField } from '../src/components/HeightField';
import { HourPicker, hourLabel } from '../src/components/HourPicker';
import { RoutineEditor } from '../src/components/RoutineEditor';
import { SpeechBubble, useSettled } from '../src/components/SpeechBubble';
import { Text } from '../src/components/Text';
import { WitnessRole } from '../src/components/WitnessRole';
import { shortId } from '../src/lib/id';
import { checkTarget, checkWeight, floorLine, heightOf, suggestTarget, targetReaction } from '../src/lib/limits';
import { buildRoutine, COMMITMENT, PACE, SCHEDULE, TRAIN_TIME, workoutsFor } from '../src/lib/planner';
import { usePlan } from '../src/lib/store';
import type { Commitment, HeightUnit, Pace, Plan, RoutineSlot, Schedule, TrainTime } from '../src/lib/types';
import { WEEKDAY_LABEL, WEIGH_INS_PER_WEEK } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** One screen per step, and never more than one or two related questions on it. The explainer
 *  steps ('how', 'data', 'why') ask nothing: they're Ember telling you what you're agreeing to. */
const STEPS = [
  'hello',
  'how',
  'name',
  'age',
  'body',
  'target',
  'data',
  'pace',
  'commitment',
  'day',
  'train',
  'plan',
  'why',
  'witness',
  'deal',
] as const;
type Step = (typeof STEPS)[number];

const keys = <K extends string>(r: Record<K, unknown>) => Object.keys(r) as K[];

const PACE_REPLY: Record<Pace, [string, EmberMood]> = {
  steady: ['Slow and steady.', 'happy'],
  moderate: ['Moderate. Good call.', 'happy'],
  fast: ['Fast it is.', 'determined'],
};
const PACE_MORE: Record<Pace, string> = {
  steady: 'It’s the version people actually keep.',
  moderate: 'It’s what most people can hold, and you’ll still see it working.',
  fast: 'I’ll add a workout to your week. Tell me if it gets to be too much.',
};
const COMMIT_REPLY: Record<Commitment, [string, string, EmberMood]> = {
  easing: ['Smart.', 'Habit first, intensity later. Two workouts a week.', 'happy'],
  serious: ['Serious. I like it.', 'Three workouts a week is a good place to start.', 'proud'],
  all_in: ['All in. I’ll hold you to that.', 'Four workouts a week. Only if your week really has room.', 'determined'],
};

/** Sign-up: Ember asks, you answer, one thing at a time.
 *
 * Big Ember, a comic speech bubble, and the one or two controls the question needs. Ember reacts
 * in the same bubble once you've answered (the joke about a 205 lb target, the nod to a steady
 * pace) and explains, in its own words, what happens to your data and what the witness sees,
 * before asking you to name one. The running chat lives on the Coach tab; this is not that. */
export default function Setup() {
  const router = useRouter();
  const { start } = usePlan();
  const t = useTheme();

  const [step, setStep] = useState(0);
  const [ownerName, setOwnerName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState<number>();
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('ft');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [pace, setPace] = useState<Pace>();
  const [commitment, setCommitment] = useState<Commitment>();
  const [schedule, setSchedule] = useState<Schedule>();
  const [wakeHour, setWakeHour] = useState(7);
  const [trainTime, setTrainTime] = useState<TrainTime>();
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [witnessName, setWitnessName] = useState('');

  const current: Step = STEPS[step];
  const name = ownerName.trim();
  const witness = witnessName.trim();
  const ageNum = Number(age);
  const startNum = Number(startValue);
  const targetNum = Number(targetValue);
  const height = heightOf({ heightCm, heightUnit });

  const startProblem = height ? checkWeight(startNum, unit, height) : null;
  const targetProblem = height ? checkTarget(startNum, targetNum, unit, height) : null;
  // What Ember says reacts to settled answers, not every keystroke: typing 205 shouldn't make it
  // worry about 2 and 20 on the way.
  const settledAge = Number(useSettled(age));
  const settledTarget = Number(useSettled(targetValue));
  const settledStartProblem = useSettled(startProblem);
  const settledTargetProblem = useSettled(targetProblem);
  const suggested = height && startNum > 0 && !startProblem ? suggestTarget(startNum, unit, height.cm) : null;

  const valid: Record<Step, boolean> = {
    hello: true,
    how: true,
    name: name.length > 0,
    age: ageNum >= 18 && ageNum <= 100,
    body: !!height && startNum > 0 && !startProblem,
    target: targetNum > 0 && !targetProblem,
    data: true,
    pace: !!pace,
    commitment: !!commitment,
    day: !!schedule,
    train: !!trainTime,
    plan: true,
    why: true,
    witness: witness.length > 0,
    deal: true,
  };

  /** What Ember says on this screen: the question, or its reaction once you've answered, or its
   *  worry if the answer won't work. First line is the headline; the rest is the explanation. */
  function says(): { lines: string[]; mood: EmberMood } {
    switch (current) {
      case 'hello':
        return { lines: ['Hi, I’m Ember.', 'I’ll be your coach. I’m here to help you keep one promise to yourself.'], mood: 'hello' };
      case 'how':
        return {
          lines: [
            'Here’s how it works.',
            `${WEIGH_INS_PER_WEEK} mornings a week, you send me a photo of the scale. On the days you plan to train, I check in afterwards to ask if you did.`,
            'That’s it. No calorie counting, no streaks to protect.',
          ],
          mood: 'proud',
        };
      case 'name':
        return { lines: ['First, what should I call you?'], mood: 'happy' };
      case 'age':
        return settledAge > 0 && settledAge < 18
          ? { lines: ['I’m only for adults.', 'A weight goal and someone reporting on you isn’t the right setup under 18.'], mood: 'worried' }
          : { lines: [`Nice to meet you, ${name}.`, 'How old are you?'], mood: 'laugh' };
      case 'body':
        return settledStartProblem
          ? { lines: ['Hmm, that doesn’t look right.', settledStartProblem], mood: 'worried' }
          : { lines: ['How tall are you, and what do you weigh today?', 'Your height lets me set a healthy range that’s actually yours.'], mood: 'happy' };
      case 'target':
        if (settledTargetProblem && targetNum > 0) return { lines: ['Let’s pick a different number.', settledTargetProblem], mood: 'worried' };
        if (height && settledTarget > 0 && settledTarget === targetNum && !targetProblem) {
          return { lines: [targetReaction(startNum, targetNum, unit, height)], mood: targetNum > startNum ? 'laugh' : 'proud' };
        }
        return { lines: ['Where do you want to get to?', ...(height ? [floorLine(unit, height)] : [])], mood: 'determined' };
      case 'data':
        return {
          lines: [
            'A quick word about your data.',
            'Your scale photos, your height and your age never leave this phone.',
            'Your plan and your weigh-ins are saved so I can check in on time. The number itself is never shared with anyone, your witness included.',
          ],
          mood: 'happy',
        };
      case 'pace':
        return pace
          ? { lines: [PACE_REPLY[pace][0], PACE_MORE[pace]], mood: PACE_REPLY[pace][1] }
          : { lines: ['How fast do you want to see results?', 'Progress won’t be a straight line either way. Some weeks stall, some jump.'], mood: 'happy' };
      case 'commitment':
        return commitment
          ? { lines: [COMMIT_REPLY[commitment][0], COMMIT_REPLY[commitment][1]], mood: COMMIT_REPLY[commitment][2] }
          : { lines: ['How committed are you feeling?', 'Be honest. A plan you keep beats a plan that sounds good.'], mood: 'determined' };
      case 'day':
        return {
          lines: ['What does your week look like, and when do you get up?', 'I ask for the scale photo when you wake up. First thing, before food and water, is the only honest comparison.'],
          mood: 'sleepy',
        };
      case 'train':
        return { lines: ['When do you like to train?', 'I’ll check in after, not before.'], mood: 'happy' };
      case 'plan':
        return {
          lines: [
            'Here’s what I’d suggest.',
            `${commitment && pace ? workoutsFor(commitment, pace) : 3} workouts a week. Change anything that doesn’t fit your week.`,
          ],
          mood: 'proud',
        };
      case 'why':
        return {
          lines: [
            'Now the part that makes this work.',
            'I’ll nudge you, and I’ll keep nudging. But I’m an AI. You can ignore me, and on a bad week you probably will.',
            'Ignoring someone you respect is much harder. People keep promises because someone whose opinion matters would notice. So you’ll pick one person: your witness.',
            'If you slip, I let them know, so they can check in. If you don’t, they never hear from me.',
          ],
          mood: 'determined',
        };
      case 'witness':
        return witness
          ? { lines: [`${witness}. Good choice.`, 'Here’s exactly what they’ll see.'], mood: 'happy' }
          : { lines: ['Who should it be?', 'Someone whose respect you want, not someone who’d worry or police your plate. A mentor, a coach, a training partner, the sibling who’d give you a hard time.'], mood: 'happy' };
      case 'deal':
        return { lines: [`Here’s the deal, ${name}.`, 'Keep it and nobody hears a thing. Ready?'], mood: 'determined' };
    }
  }

  function next() {
    // The plan is built from the answers when you reach it; change an answer and it's rebuilt.
    if (current === 'train' && commitment && pace && schedule && trainTime) {
      setRoutine(buildRoutine({ commitment, pace, schedule, trainTime, wakeHour }));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function begin() {
    const plan: Plan = {
      id: shortId(12),
      ownerName: name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date().toISOString(),
      goal: { unit, start: startNum, target: targetNum, wakeHour, perWeek: WEIGH_INS_PER_WEEK },
      profile: { heightCm, heightUnit, age: ageNum, schedule, trainTime, commitment, pace },
      routine: routine.filter((s) => s.days.length > 0 && s.label.trim().length > 0),
      witness: { name: witness, linked: false, inviteToken: shortId(16) },
      weighIns: [],
      sessions: [],
    };
    await start(plan);
    router.replace('/witness');
  }

  // The controls for this screen. A plain function, not a component defined in here: a component
  // re-created on every render would remount the text fields and drop the keyboard mid-word.
  function controls() {
    switch (current) {
      case 'name':
        return (
          <Field
            value={ownerName}
            onChangeText={setOwnerName}
            autoCapitalize="words"
            autoFocus
            placeholder="First name"
            returnKeyType="next"
            onSubmitEditing={() => valid.name && next()}
          />
        );
      case 'age':
        return <Field numeric keyboardType="number-pad" maxLength={3} autoFocus placeholder="Age" value={age} onChangeText={setAge} />;
      case 'body':
        return (
          <View style={{ gap: space(5) }}>
            <HeightField
              cm={heightCm}
              unit={heightUnit}
              onChange={(cm, u) => {
                setHeightCm(cm);
                setHeightUnit(u);
                // Someone who thinks in centimetres almost certainly weighs in kilograms. Only a
                // default: the weight has its own switch right below.
                setUnit(u === 'cm' ? 'kg' : 'lb');
              }}
            />
            <View style={{ gap: space(2) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="micro" tone="faint">
                  WEIGHT TODAY
                </Text>
                <Toggle options={['lb', 'kg'] as const} value={unit} onChange={setUnit} />
              </View>
              <Field numeric keyboardType="decimal-pad" placeholder="0" suffix={unit} value={startValue} onChangeText={setStartValue} />
            </View>
          </View>
        );
      case 'target':
        return (
          <View style={{ gap: space(3) }}>
            <Field
              numeric
              keyboardType="decimal-pad"
              autoFocus
              placeholder={suggested ? String(suggested) : '0'}
              suffix={unit}
              value={targetValue}
              onChangeText={setTargetValue}
            />
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
          </View>
        );
      case 'pace':
        return <Choice value={pace} onChange={setPace} options={keys(PACE).map((k) => ({ key: k, label: PACE[k].label, note: PACE[k].note }))} />;
      case 'commitment':
        return (
          <Choice
            value={commitment}
            onChange={setCommitment}
            options={keys(COMMITMENT).map((k) => ({ key: k, label: COMMITMENT[k].label, note: COMMITMENT[k].note }))}
          />
        );
      case 'day':
        return (
          <View style={{ gap: space(5) }}>
            <Choice value={schedule} onChange={setSchedule} options={keys(SCHEDULE).map((k) => ({ key: k, label: SCHEDULE[k] }))} />
            <View style={{ gap: space(2) }}>
              <Text variant="micro" tone="faint">
                I GET UP AROUND
              </Text>
              <HourPicker value={wakeHour} onChange={setWakeHour} from={4} to={12} />
            </View>
          </View>
        );
      case 'train':
        return <Choice value={trainTime} onChange={setTrainTime} options={keys(TRAIN_TIME).map((k) => ({ key: k, label: TRAIN_TIME[k] }))} />;
      case 'plan':
        return (
          <View style={{ gap: space(3) }}>
            <RoutineEditor routine={routine} onChange={setRoutine} />
            <Card style={{ gap: space(1) }}>
              <Text variant="bodyStrong">Plus {WEIGH_INS_PER_WEEK} weigh-ins a week</Text>
              <Text variant="small" tone="dim">
                Any {WEIGH_INS_PER_WEEK} mornings, each with a photo of the scale.
              </Text>
            </Card>
          </View>
        );
      case 'witness':
        return (
          <View style={{ gap: space(4) }}>
            <Field placeholder="Their first name" value={witnessName} onChangeText={setWitnessName} autoCapitalize="words" />
            {witness.length > 0 && <WitnessRole name={witness} />}
          </View>
        );
      case 'deal':
        return (
          <Card tone="ember" style={{ gap: space(4) }}>
            <View style={{ gap: space(1) }}>
              <Text variant="micro" tone="ember">
                MORNINGS AT {hourLabel(wakeHour).toUpperCase()}
              </Text>
              <Text variant="heading">A photo on the scale</Text>
              <Text variant="small" tone="dim">
                {WEIGH_INS_PER_WEEK} mornings a week. The rest are yours.
              </Text>
            </View>
            {routine.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: t.ember, opacity: 0.25 }} />
                <View style={{ gap: space(1) }}>
                  {routine.map((r) => (
                    <Text key={r.id} variant="small" tone="dim">
                      <Text variant="bodyStrong">{r.label}</Text>
                      {' — '}
                      {r.days.map((d) => WEEKDAY_LABEL[d]).join(', ')}, I ask at {hourLabel(r.hour)}
                    </Text>
                  ))}
                </View>
              </>
            )}
            <View style={{ height: 1, backgroundColor: t.ember, opacity: 0.25 }} />
            <Text variant="body" tone="dim">
              Go quiet, or finish a week short, and{' '}
              <Text variant="bodyStrong" tone="ember">
                {witness}
              </Text>{' '}
              hears about it.
            </Text>
          </Card>
        );
      default:
        return null; // the explainer screens ask nothing
    }
  }

  const { lines, mood } = says();
  const explainer = current === 'hello' || current === 'how' || current === 'data' || current === 'why';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', gap: space(1), paddingHorizontal: space(6), paddingTop: space(4) }}>
          {STEPS.slice(1).map((s, i) => (
            <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? t.ember : t.surfaceHigh }} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space(6), paddingTop: space(8), paddingBottom: space(6), gap: space(6) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Ember and what it's saying. The bubble's tail points down at Ember, and Ember takes
              every bit of height the screen's controls leave over. */}
          <SpeechBubble lines={lines} />
          <Ember key={mood} mood={mood} fill style={{ minHeight: explainer ? 260 : 170, marginTop: space(2) }} />

          {controls()}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: space(3), paddingHorizontal: space(6), paddingTop: space(3), paddingBottom: space(3) }}>
          {step > 0 && <Button label="Back" variant="ghost" onPress={() => setStep((s) => Math.max(s - 1, 0))} style={{ flex: 1 }} />}
          <Button
            label={
              current === 'hello'
                ? 'Hi, Ember'
                : explainer
                  ? 'Got it'
                  : current === 'plan'
                    ? 'Looks good'
                    : current === 'deal'
                      ? 'Make it real'
                      : 'Continue'
            }
            onPress={current === 'deal' ? begin : next}
            disabled={!valid[current]}
            style={{ flex: 2 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Toggle<K extends string>({ options, value, onChange }: { options: readonly K[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space(1) }}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o }}
          hitSlop={6}
          style={{
            paddingHorizontal: space(3),
            paddingVertical: space(1),
            borderRadius: radius.pill,
            backgroundColor: value === o ? t.text : 'transparent',
          }}
        >
          <Text variant="label" style={{ color: value === o ? t.bg : t.textDim }}>
            {o}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
