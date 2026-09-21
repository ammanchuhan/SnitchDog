import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Choice } from '../src/components/Choice';
import { Ember, EmberMood } from '../src/components/Ember';
import { Field } from '../src/components/Field';
import { HeightField } from '../src/components/HeightField';
import { HourPicker, hourLabel } from '../src/components/HourPicker';
import { RoutineEditor } from '../src/components/RoutineEditor';
import { Text } from '../src/components/Text';
import { WitnessRole } from '../src/components/WitnessRole';
import { shortId } from '../src/lib/id';
import { checkTarget, checkWeight, floorLine, heightLabel, heightOf, suggestTarget, targetReaction } from '../src/lib/limits';
import { buildRoutine, COMMITMENT, PACE, SCHEDULE, TRAIN_TIME, workoutsFor } from '../src/lib/planner';
import { usePlan } from '../src/lib/store';
import type { Commitment, HeightUnit, Pace, Plan, RoutineSlot, Schedule, TrainTime } from '../src/lib/types';
import { WEEKDAY_LABEL, WEIGH_INS_PER_WEEK } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

const STEPS = [
  'open',
  'name',
  'age',
  'height',
  'weight',
  'target',
  'pace',
  'schedule',
  'wake',
  'commitment',
  'trainTime',
  'plan',
  'witness',
  'deal',
] as const;
type Step = (typeof STEPS)[number];

const keys = <K extends string>(r: Record<K, unknown>) => Object.keys(r) as K[];

const PACE_REPLY: Record<Pace, string> = {
  steady: 'Slow and steady. It’s the version people actually keep.',
  moderate: 'Moderate. What most people can hold, and still see it working.',
  fast: 'Fast it is. I’ll add a workout to your week.',
};
const COMMIT_REPLY: Record<Commitment, [string, EmberMood]> = {
  easing: ['Smart. Habit first, intensity later.', 'happy'],
  serious: ['Three a week. A good place to start.', 'proud'],
  all_in: ['All in. I’ll hold you to that.', 'determined'],
};

/** Sign-up is a conversation with Ember, not a form.
 *
 * One question at a time, in Ember's voice. Each answer becomes a reply bubble and Ember reacts
 * to it — the joke about a 205 lb target, the nod to a steady pace. Tap an earlier answer to go
 * back and change it. What's collected is the same as ever: enough to set a personal target
 * range and build a first week of workouts, shown before anything is saved. */
export default function Setup() {
  const router = useRouter();
  const { start } = usePlan();
  const t = useTheme();
  const scroller = useRef<ScrollView>(null);

  const [step, setStep] = useState(0);
  const [ownerName, setOwnerName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState<number>();
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('ft');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [pace, setPace] = useState<Pace>();
  const [schedule, setSchedule] = useState<Schedule>();
  const [wakeHour, setWakeHour] = useState(7);
  const [commitment, setCommitment] = useState<Commitment>();
  const [trainTime, setTrainTime] = useState<TrainTime>();
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [witnessName, setWitnessName] = useState('');

  const current: Step = STEPS[step];
  const name = ownerName.trim();
  const ageNum = Number(age);
  const startNum = Number(startValue);
  const targetNum = Number(targetValue);
  const height = heightOf({ heightCm, heightUnit });

  const tooYoung = ageNum > 0 && ageNum < 18;
  const startProblem = height ? checkWeight(startNum, unit, height) : null;
  const targetProblem = height ? checkTarget(startNum, targetNum, unit, height) : null;
  const suggested = height && startNum > 0 && !startProblem ? suggestTarget(startNum, unit, height.cm) : null;

  const valid: Record<Step, boolean> = {
    open: true,
    name: name.length > 0,
    age: ageNum >= 18 && ageNum <= 100,
    height: !!height,
    weight: startNum > 0 && !startProblem,
    target: targetNum > 0 && !targetProblem,
    pace: !!pace,
    schedule: !!schedule,
    wake: true,
    commitment: !!commitment,
    trainTime: !!trainTime,
    plan: true,
    witness: witnessName.trim().length > 0,
    deal: true,
  };

  /** What Ember asks at each step, in its voice. */
  const ask = (s: Step): { lines: string[]; mood: EmberMood } => {
    switch (s) {
      case 'open':
        return {
          lines: [
            'Hi, I’m Ember. I’ll be your coach.',
            'Here’s how this works: you weigh in with a photo, train when you said you would, and name one person who hears about it when you don’t.',
            'A few questions first, so the plan fits you.',
          ],
          mood: 'happy',
        };
      case 'name':
        return { lines: ['What should I call you?'], mood: 'happy' };
      case 'age':
        return { lines: [`How old are you, ${name}?`], mood: 'happy' };
      case 'height':
        return { lines: ['How tall are you? It’s how I work out a healthy range for you. It stays on your phone.'], mood: 'happy' };
      case 'weight':
        return { lines: ['What do you weigh right now? Whichever units you use.'], mood: 'happy' };
      case 'target':
        return { lines: ['And where do you want to get to?', ...(height ? [floorLine(unit, height)] : [])], mood: 'proud' };
      case 'pace':
        return {
          lines: ['How fast do you want to see results?', 'Progress won’t be a straight line either way. Some weeks stall, some jump.'],
          mood: 'happy',
        };
      case 'schedule':
        return { lines: ['What does your week look like?'], mood: 'happy' };
      case 'wake':
        return {
          lines: [
            'When do you usually get up?',
            'That’s when I’ll ask for a photo of the scale. First thing, before food and water, is the only honest comparison.',
          ],
          mood: 'sleepy',
        };
      case 'commitment':
        return { lines: ['How committed are you feeling?'], mood: 'determined' };
      case 'trainTime':
        return { lines: ['When do you like to train?'], mood: 'happy' };
      case 'plan':
        return {
          lines: [
            'Here’s what I’d suggest.',
            `${commitment && pace ? workoutsFor(commitment, pace) : 3} workouts a week. At the time below I’ll ask whether you did it. Change anything that doesn’t fit.`,
          ],
          mood: 'proud',
        };
      case 'witness':
        return {
          lines: [
            'Last thing. Who finds out when you don’t?',
            'One person, not a group chat. Someone whose disappointment you’d actually feel.',
          ],
          mood: 'happy',
        };
      case 'deal':
        return { lines: [`Here’s the deal, ${name}.`], mood: 'determined' };
    }
  };

  /** How the person's answer reads as their reply bubble. Null when there's nothing to show. */
  const answer = (s: Step): string | null => {
    switch (s) {
      case 'open':
        return 'Let’s go';
      case 'name':
        return name;
      case 'age':
        return age;
      case 'height':
        return height ? heightLabel(height) : null;
      case 'weight':
        return `${startValue} ${unit}`;
      case 'target':
        return `${targetValue} ${unit}`;
      case 'pace':
        return pace ? PACE[pace].label : null;
      case 'schedule':
        return schedule ? SCHEDULE[schedule] : null;
      case 'wake':
        return hourLabel(wakeHour);
      case 'commitment':
        return commitment ? COMMITMENT[commitment].label : null;
      case 'trainTime':
        return trainTime ? TRAIN_TIME[trainTime] : null;
      case 'plan':
        return 'Looks good';
      case 'witness':
        return witnessName.trim();
      case 'deal':
        return null;
    }
  };

  /** Ember's reaction to an answer, if it has one. */
  const reaction = (s: Step): { line: string; mood: EmberMood } | null => {
    switch (s) {
      case 'name':
        return { line: `Nice to meet you, ${name}.`, mood: 'laugh' };
      case 'target':
        if (!height) return null;
        return { line: targetReaction(startNum, targetNum, unit, height), mood: targetNum > startNum ? 'laugh' : 'proud' };
      case 'pace':
        return pace ? { line: PACE_REPLY[pace], mood: pace === 'fast' ? 'determined' : 'happy' } : null;
      case 'commitment':
        return commitment ? { line: COMMIT_REPLY[commitment][0], mood: COMMIT_REPLY[commitment][1] } : null;
      default:
        return null;
    }
  };

  /** Anything wrong with the current answer, said by Ember rather than printed as a form error. */
  const problem: string | null =
    current === 'age' && tooYoung
      ? 'I’m only for adults. A weight target and someone reporting on you isn’t the right setup under 18.'
      : current === 'weight'
        ? startProblem
        : current === 'target'
          ? targetProblem
          : null;

  function next() {
    // Arriving at the plan builds it from the answers; going back and changing one rebuilds it.
    if (current === 'trainTime' && commitment && pace && schedule && trainTime) {
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
      witness: { name: witnessName.trim(), linked: false, inviteToken: shortId(16) },
      weighIns: [],
      sessions: [],
    };
    await start(plan);
    router.replace('/witness');
  }

  // The control for the current question. Called as a function, not rendered as a component
  // defined in here: a component re-created every render would remount the text field and drop
  // the keyboard on every keystroke.
  function control(s: Step) {
    switch (s) {
      case 'open':
        return null;
      case 'name':
        return (
          <Field
            value={ownerName}
            onChangeText={setOwnerName}
            autoCapitalize="words"
            autoFocus
            placeholder="Your first name"
            returnKeyType="next"
            onSubmitEditing={() => valid.name && next()}
          />
        );
      case 'age':
        return <Field numeric keyboardType="number-pad" maxLength={3} autoFocus placeholder="Age" value={age} onChangeText={setAge} />;
      case 'height':
        return (
          <HeightField
            cm={heightCm}
            unit={heightUnit}
            onChange={(cm, u) => {
              setHeightCm(cm);
              setHeightUnit(u);
              // Someone who thinks in centimetres almost certainly weighs in kilograms. Only a
              // default: the next question has its own switch.
              setUnit(u === 'cm' ? 'kg' : 'lb');
            }}
          />
        );
      case 'weight':
        return (
          <View style={{ gap: space(3) }}>
            <UnitToggle unit={unit} onChange={setUnit} />
            <Field numeric keyboardType="decimal-pad" autoFocus placeholder="0" suffix={unit} value={startValue} onChangeText={setStartValue} />
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
      case 'schedule':
        return <Choice value={schedule} onChange={setSchedule} options={keys(SCHEDULE).map((k) => ({ key: k, label: SCHEDULE[k] }))} />;
      case 'wake':
        return <HourPicker value={wakeHour} onChange={setWakeHour} from={4} to={12} />;
      case 'commitment':
        return (
          <Choice
            value={commitment}
            onChange={setCommitment}
            options={keys(COMMITMENT).map((k) => ({ key: k, label: COMMITMENT[k].label, note: COMMITMENT[k].note }))}
          />
        );
      case 'trainTime':
        return <Choice value={trainTime} onChange={setTrainTime} options={keys(TRAIN_TIME).map((k) => ({ key: k, label: TRAIN_TIME[k] }))} />;
      case 'plan':
        return (
          <View style={{ gap: space(3) }}>
            <RoutineEditor routine={routine} onChange={setRoutine} />
            <Card style={{ gap: space(1) }}>
              <Text variant="bodyStrong">Plus {WEIGH_INS_PER_WEEK} weigh-ins a week</Text>
              <Text variant="small" tone="dim">
                Any {WEIGH_INS_PER_WEEK} mornings, each with a photo of the scale. The photo is what makes the number count.
              </Text>
            </Card>
          </View>
        );
      case 'witness':
        return (
          <View style={{ gap: space(4) }}>
            <WitnessRole name={witnessName} />
            <Field label="Your witness" placeholder="Their first name" value={witnessName} onChangeText={setWitnessName} autoCapitalize="words" />
          </View>
        );
      case 'deal':
        return (
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
                  {routine.map((r) => (
                    <Text key={r.id} variant="small" tone="dim">
                      <Text variant="bodyStrong">{r.label}</Text>
                      {' — '}
                      {r.days.map((d) => WEEKDAY_LABEL[d]).join(', ')}, asked at {hourLabel(r.hour)}
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
              hears about it. Keep your word and they never hear from me.
            </Text>
          </Card>
        );
    }
  }

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [step, problem]);

  const { lines, mood } = ask(current);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', gap: space(1), paddingHorizontal: space(6), paddingTop: space(4), paddingBottom: space(2) }}>
          {STEPS.slice(1).map((s, i) => (
            <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? t.ember : t.surfaceHigh }} />
          ))}
        </View>

        <ScrollView
          ref={scroller}
          contentContainerStyle={{ paddingHorizontal: space(6), paddingTop: space(6), paddingBottom: space(6), gap: space(4) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        >
          <View style={{ alignItems: 'center', paddingBottom: space(2) }}>
            <Ember mood="front" height={150} />
          </View>

          {/* Everything already answered: Ember's question, the reply, Ember's reaction.
              Tapping a reply goes back to that question. */}
          {STEPS.slice(0, step).map((s, i) => {
            const past = ask(s);
            const reply = answer(s);
            const react = reaction(s);
            return (
              <View key={s} style={{ gap: space(3) }}>
                <EmberSays lines={past.lines} mood={past.mood} />
                {reply ? <Reply text={reply} onPress={s === 'open' ? undefined : () => setStep(i)} /> : null}
                {react ? <EmberSays lines={[react.line]} mood={react.mood} /> : null}
              </View>
            );
          })}

          {/* The question being asked now, fading in like a message arriving. */}
          <EmberSays key={current} lines={lines} mood={mood} animate />

          {problem && <EmberSays key={`${current}-${problem}`} lines={[problem]} mood="worried" animate />}

          <FadeIn key={`${current}-input`} delay={lines.length * 250}>
            {control(current)}
          </FadeIn>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: space(3), paddingHorizontal: space(6), paddingTop: space(3), paddingBottom: space(3) }}>
          {step > 0 && (
            <Button label="Back" variant="ghost" onPress={() => setStep((s) => Math.max(s - 1, 0))} style={{ flex: 1 }} />
          )}
          <Button
            label={current === 'open' ? 'Let’s go' : current === 'plan' ? 'Looks good' : current === 'deal' ? 'Make it real' : 'Continue'}
            onPress={current === 'deal' ? begin : next}
            disabled={!valid[current]}
            style={{ flex: 2 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Ember beside a run of speech bubbles, bottom-aligned with the last one, the way a chat app
 *  shows the sender once per run. */
function EmberSays({ lines, mood, animate }: { lines: string[]; mood: EmberMood; animate?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2) }}>
      <FadeIn delay={animate ? (lines.length - 1) * 250 : 0} skip={!animate}>
        <Ember mood={mood} height={52} />
      </FadeIn>
      <View style={{ flex: 1, gap: space(2), paddingRight: space(8) }}>
        {lines.map((line, i) => (
          <FadeIn key={i} delay={animate ? i * 250 : 0} skip={!animate}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.lineSoft,
                borderRadius: radius.lg,
                borderBottomLeftRadius: i === lines.length - 1 ? radius.sm : radius.lg,
                paddingHorizontal: space(4),
                paddingVertical: space(3),
              }}
            >
              <Text variant="body">{line}</Text>
            </View>
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/** The person's answer, on the right. Tappable to go back and change it. */
function Reply({ text, onPress }: { text: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Change this answer' : undefined}
      style={{
        alignSelf: 'flex-end',
        maxWidth: '75%',
        backgroundColor: t.ember,
        borderRadius: radius.lg,
        borderBottomRightRadius: radius.sm,
        paddingHorizontal: space(4),
        paddingVertical: space(3),
      }}
    >
      <Text variant="bodyStrong" tone="onEmber" numeric>
        {text}
      </Text>
    </Pressable>
  );
}

function FadeIn({ children, delay = 0, skip }: { children: React.ReactNode; delay?: number; skip?: boolean }) {
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) return;
    Animated.timing(v, { toValue: 1, duration: 280, delay, useNativeDriver: true }).start();
  }, [v, delay, skip]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

function UnitToggle({ unit, onChange }: { unit: 'lb' | 'kg'; onChange: (u: 'lb' | 'kg') => void }) {
  const t = useTheme();
  return (
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
  );
}
