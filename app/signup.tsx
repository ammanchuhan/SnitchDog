import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { HeightField } from '../src/components/HeightField';
import { Snitch, SnitchMood } from '../src/components/Snitch';
import { SpeechBubble, useSettled } from '../src/components/SpeechBubble';
import { Text } from '../src/components/Text';
import { WitnessRole } from '../src/components/WitnessRole';
import { ApiError } from '../src/lib/api';
import { checkTarget, checkWeight, floorLine, heightOf, suggestTarget, targetReaction } from '../src/lib/limits';
import { loadToken, signOut } from '../src/lib/session';
import { usePlan } from '../src/lib/store';
import type { Gender, HeightUnit, Unit } from '../src/lib/types';
import { WEIGH_INS_PER_WEEK } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** Eight steps (Q6). The explainers ('hello', 'how', 'data') ask nothing. */
const STEPS = ['hello', 'how', 'name', 'age', 'body', 'target', 'data', 'witnesses'] as const;
type Step = (typeof STEPS)[number];

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'woman', label: 'Woman' },
  { key: 'man', label: 'Man' },
  { key: 'non_binary', label: 'Non-binary' },
  { key: 'prefer_not', label: 'Prefer not to say' },
];

const MAX_WITNESSES = 3;

/** Sign-up: Snitch asks, you answer, one thing a screen (section 3).
 *
 * Every step fits on one screen with no scrolling, down to an iPhone SE with the keyboard up
 * (SIGNUP-1): when the keyboard shows, Snitch steps out of the way. The training plan isn't built
 * here; Snitch builds it with you in chat right after. */
export default function SignUp() {
  const router = useRouter();
  const { create } = usePlan();
  const t = useTheme();

  const [step, setStep] = useState(0);
  const [ownerName, setOwnerName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState<number>();
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('ft');
  const [unit, setUnit] = useState<Unit>('lb');
  const [startValue, setStartValue] = useState('');
  const [gender, setGender] = useState<Gender>();
  const [targetValue, setTargetValue] = useState('');
  const [witnesses, setWitnesses] = useState<string[]>(['']);
  const [keyboard, setKeyboard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign-up makes the account's plan, so it needs an account (a deep link can land here without).
  useEffect(() => {
    loadToken().then((token) => !token && router.replace('/auth'));
  }, [router]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const current: Step = STEPS[step];
  const name = ownerName.trim();
  const ageNum = Number(age);
  const startNum = Number(startValue);
  const targetNum = Number(targetValue);
  const height = heightOf({ heightCm, heightUnit });
  const named = witnesses.map((w) => w.trim()).filter(Boolean);

  const startProblem = height ? checkWeight(startNum, unit, height) : null;
  const targetProblem = height ? checkTarget(startNum, targetNum, unit, height) : null;
  // Snitch reacts to settled answers, not every keystroke (SIGNUP-6).
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
    witnesses: named.length >= 1,
  };

  function says(): { lines: string[]; mood: SnitchMood } {
    switch (current) {
      case 'hello':
        return { lines: ['Hi, I’m Snitch.', 'I’ll be your coach.'], mood: 'hello' };
      case 'how':
        return {
          lines: [
            'Here’s how it works.',
            `${WEIGH_INS_PER_WEEK} mornings a week, a photo of the scale as proof. Workouts verified by GPS.`,
            'We’ll build your training plan together right after this.',
          ],
          mood: 'ready',
        };
      case 'name':
        return { lines: ['What should I call you?'], mood: 'happy' };
      case 'age':
        return settledAge > 0 && settledAge < 18
          ? { lines: ['I’m only for adults.', 'A weight goal and people reporting on you isn’t the right setup under 18.'], mood: 'worried' }
          : { lines: [`Nice to meet you, ${name}.`, 'How old are you?'], mood: 'grin' };
      case 'body':
        return settledStartProblem
          ? { lines: ['Hmm, that doesn’t look right.', settledStartProblem], mood: 'worried' }
          : { lines: ['Height, weight, and gender if you want to share it.'], mood: 'ready' };
      case 'target':
        if (settledTargetProblem && targetNum > 0) return { lines: ['Let’s pick a different number.', settledTargetProblem], mood: 'worried' };
        if (height && settledTarget > 0 && settledTarget === targetNum && !targetProblem) {
          return { lines: [targetReaction(startNum, targetNum, unit, height)], mood: targetNum > startNum ? 'grin' : 'proud' };
        }
        return { lines: ['Where do you want to get to?', ...(height ? [floorLine(unit, height)] : [])], mood: 'ready' };
      case 'data':
        return {
          lines: [
            'A quick word about your data.',
            'Scale photos are read for the number, then deleted. Your plan and weigh-ins are stored on our server so I can keep an eye on things. Witnesses never see the number.',
          ],
          mood: 'calm',
        };
      case 'witnesses':
        return {
          lines: [
            'You’ll probably ignore me. You won’t ignore them.',
            'Name one to three people whose respect you want. If you slip, I tell them.',
          ],
          mood: 'sly',
        };
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await create({
        ownerName: name,
        age: ageNum,
        heightCm: heightCm!,
        heightUnit,
        gender,
        unit,
        start: startNum,
        target: targetNum,
        witnessNames: named,
      });
      router.replace('/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const next = () => (current === 'witnesses' ? finish() : setStep((s) => s + 1));

  // A plain function, not a component defined in here: a component re-created on every render
  // would remount the text fields and drop the keyboard mid-word.
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
        // Height and weight share a row so the step fits above the keyboard on an SE (SIGNUP-1).
        return (
          <View style={{ gap: space(3) }}>
            <View style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-end' }}>
              <View style={{ flex: 2 }}>
                <HeightField
                  compact
                  cm={heightCm}
                  unit={heightUnit}
                  onChange={(cm, u) => {
                    setHeightCm(cm);
                    setHeightUnit(u);
                    setUnit(u === 'cm' ? 'kg' : 'lb');
                  }}
                />
              </View>
              <View style={{ flex: 1.2, gap: space(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="micro" tone="faint">
                    WEIGHT
                  </Text>
                  <Toggle options={['lb', 'kg'] as const} value={unit} onChange={setUnit} />
                </View>
                <Field compact numeric keyboardType="decimal-pad" placeholder="0" suffix={unit} value={startValue} onChangeText={setStartValue} testID="weight" />
              </View>
            </View>
            <View style={{ gap: space(2) }}>
              <Text variant="micro" tone="faint">
                GENDER (OPTIONAL) · ONLY USED TO SHAPE YOUR WORKOUT PLAN
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                {GENDERS.map((g) => (
                  <Chip key={g.key} label={g.label} on={gender === g.key} onPress={() => setGender(gender === g.key ? undefined : g.key)} />
                ))}
              </View>
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
            {suggested && !targetValue ? (
              <Pressable
                onPress={() => setTargetValue(String(suggested))}
                style={{ alignSelf: 'flex-start', paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: t.ember }}
              >
                <Text variant="label" tone="ember" numeric>
                  Start with {suggested} {unit}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      case 'witnesses':
        return (
          <View style={{ gap: space(3) }}>
            {witnesses.map((w, i) => (
              <Field
                key={i}
                placeholder={i === 0 ? 'First name' : 'Another first name'}
                value={w}
                autoCapitalize="words"
                autoFocus={i > 0}
                onChangeText={(v) => setWitnesses((all) => all.map((x, j) => (j === i ? v : x)))}
              />
            ))}
            {witnesses.length < MAX_WITNESSES && witnesses[witnesses.length - 1].trim() ? (
              <Pressable onPress={() => setWitnesses((all) => [...all, ''])} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                <Text variant="label" tone="dim">
                  + Add another
                </Text>
              </Pressable>
            ) : null}
            {!keyboard && <WitnessRole compact />}
            {error ? (
              <Text variant="small" tone="ember">
                {error}
              </Text>
            ) : null}
          </View>
        );
      default:
        return null;
    }
  }

  const { lines, mood } = says();
  const explainer = current === 'hello' || current === 'how' || current === 'data';
  // With the keyboard up Snitch hides; the body and witness steps have the most controls, so
  // Snitch is smaller there.
  const snitchHeight = explainer ? 220 : current === 'body' || current === 'witnesses' ? 96 : 150;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', gap: space(1), paddingHorizontal: space(6), paddingTop: space(3) }}>
          {STEPS.slice(1).map((s, i) => (
            <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? t.ember : t.surfaceHigh }} />
          ))}
        </View>

        <View style={{ flex: 1, paddingHorizontal: space(6), paddingTop: space(5), gap: space(4) }}>
          {keyboard ? (
            // With the keyboard up there's no room for the bubble: Snitch's words as a heading.
            <View accessible accessibilityLabel={`Snitch: ${lines.join(' ')}`} style={{ gap: space(1) }}>
              <Text variant="heading">{lines[0]}</Text>
              {lines.slice(1).map((l, i) => (
                <Text key={i} variant="small" tone="dim">
                  {l}
                </Text>
              ))}
            </View>
          ) : (
            <SpeechBubble lines={lines} />
          )}
          {!keyboard ? (
            <View style={{ flex: 1, justifyContent: 'center', minHeight: 0 }}>
              <Snitch key={mood} mood={mood} height={snitchHeight} />
            </View>
          ) : (
            <View style={{ height: space(2) }} />
          )}
          {controls()}
          {keyboard && <View style={{ flex: 1 }} />}
          {current === 'hello' && (
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace('/auth');
              }}
              hitSlop={8}
              style={{ alignSelf: 'center' }}
            >
              <Text variant="small" tone="dim">
                Use a different account
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: space(3), paddingHorizontal: space(6), paddingVertical: space(3) }}>
          {step > 0 && <Button label="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />}
          <Button
            label={current === 'hello' ? 'Hi, Snitch' : explainer ? 'Got it' : current === 'witnesses' ? 'Finish' : 'Continue'}
            onPress={next}
            disabled={!valid[current]}
            loading={busy}
            style={{ flex: 2 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={{
        paddingHorizontal: space(3),
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: on ? t.text : t.line,
        backgroundColor: on ? t.text : 'transparent',
      }}
    >
      <Text variant="label" style={{ color: on ? t.bg : t.textDim }}>
        {label}
      </Text>
    </Pressable>
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
          style={{ paddingHorizontal: space(3), paddingVertical: space(1), borderRadius: radius.pill, backgroundColor: value === o ? t.text : 'transparent' }}
        >
          <Text variant="label" style={{ color: value === o ? t.bg : t.textDim }}>
            {o}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
