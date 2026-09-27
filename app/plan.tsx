import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { HeightField } from '../src/components/HeightField';
import { HourPicker, hourLabel } from '../src/components/HourPicker';
import { RoutineEditor } from '../src/components/RoutineEditor';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { ownerLinkUrl } from '../src/lib/api';
import { deleteAccount, signOut } from '../src/lib/session';
import { checkTarget, convert, heightOf, targetNote } from '../src/lib/limits';
import { usePlan } from '../src/lib/store';
import { useDismiss } from '../src/lib/nav';
import type { HeightUnit, RoutineSlot } from '../src/lib/types';
import { WEIGH_INS_PER_WEEK, currentAverage } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** Everything set during onboarding, changeable afterwards. Reached from the gear on Home: it's
 *  visited a few times a month, which doesn't earn it a tab. A goal you can't edit is a goal
 *  people abandon the app over rather than adjust. */
export default function PlanScreen() {
  const { plan } = usePlan();
  // This screen can mount before the plan has loaded from the phone. The form seeds its
  // fields once, so it must not exist until there's a plan to seed them from — otherwise it
  // shows blanks, and saving would write the blanks over the real plan.
  if (!plan) return null;
  return <PlanForm key={plan.id} />;
}

function PlanForm() {
  const { plan, update, clear } = usePlan();
  const router = useRouter();
  const dismiss = useDismiss();
  const t = useTheme();

  const [target, setTarget] = useState(plan ? String(plan.goal.target) : '');
  const [unit, setUnit] = useState<'lb' | 'kg'>(plan?.goal.unit ?? 'lb');
  const [wakeHour, setWakeHour] = useState(plan?.goal.wakeHour ?? 7);
  const [routine, setRoutine] = useState<RoutineSlot[]>(plan?.routine ?? []);
  const [heightCm, setHeightCm] = useState(plan?.profile?.heightCm);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(plan?.profile?.heightUnit ?? 'ft');
  const height = heightOf({ heightCm, heightUnit });
  const [saved, setSaved] = useState(false);
  // Any edit after a save means there's something to save again.
  useEffect(() => setSaved(false), [target, unit, wakeHour, routine, heightCm, heightUnit]);

  if (!plan) return null;
  // Same basis as the progress bar: an average, never a single morning.
  const average = currentAverage(plan);
  const reachedTarget =
    average !== undefined &&
    (plan.goal.target <= plan.goal.start ? average <= plan.goal.target : average >= plan.goal.target);

  // The start stays in the unit it was recorded in; compare like with like.
  const targetProblem = checkTarget(convert(plan.goal.start, plan.goal.unit, unit), Number(target), unit, height);
  const valid = Number(target) > 0 && !targetProblem;

  async function save() {
    if (!plan) return;
    await update({
      goal: { ...plan.goal, target: Number(target), unit, wakeHour },
      profile: { ...plan.profile, heightCm, heightUnit },
      routine: routine.filter((s) => s.days.length > 0 && s.label.trim().length > 0),
    });
    setSaved(true);
  }

  return (
    <Screen style={{ paddingBottom: space(16) }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', paddingTop: space(4) }}>
          <Pressable onPress={dismiss} hitSlop={12}>
            <Text variant="label" tone="faint">
              Back
            </Text>
          </Pressable>
        </View>
        <Text variant="display" style={{ paddingTop: space(6), paddingBottom: space(8) }}>
          Your plan
        </Text>

        <Section title="THE GOAL">
          <View style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Target"
                numeric
                keyboardType="decimal-pad"
                suffix={unit}
                value={target}
                onChangeText={setTarget}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: space(2), paddingBottom: space(2) }}>
              {(['lb', 'kg'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  style={{
                    paddingHorizontal: space(4),
                    height: 40,
                    justifyContent: 'center',
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
          </View>
          <HeightField
            cm={heightCm}
            unit={heightUnit}
            onChange={(cm, u) => {
              setHeightCm(cm);
              setHeightUnit(u);
            }}
          />
          {targetProblem ? (
            <Text variant="small" tone="ember">
              {targetProblem}
            </Text>
          ) : height ? (
            <Text variant="small" tone="dim" numeric>
              {targetNote(convert(plan.goal.start, plan.goal.unit, unit), Number(target), unit, height)}
            </Text>
          ) : (
            <Text variant="small" tone="dim">
              Add your height and the target range becomes yours instead of a guess.
            </Text>
          )}
          <Text variant="small" tone="faint" numeric>
            Started at {plan.goal.start} {plan.goal.unit}. That number stays as it is — it&rsquo;s
            where you began.
          </Text>
        </Section>

        <Section title={`MORNINGS · ${hourLabel(wakeHour).toUpperCase()}`}>
          <HourPicker value={wakeHour} onChange={setWakeHour} from={4} to={12} />
          <Text variant="small" tone="faint">
            {WEIGH_INS_PER_WEEK} weigh-ins a week, every week. That part isn&rsquo;t adjustable.
          </Text>
        </Section>

        <Section title="ROUTINE">
          <RoutineEditor routine={routine} onChange={setRoutine} />
        </Section>

        <View style={{ gap: space(3), paddingTop: space(4), paddingBottom: space(10) }}>
          <Button label={saved ? 'Saved' : 'Save'} onPress={save} disabled={!valid || saved} />
        </View>

        <Section title="CHECK-INS">
          {plan.ownerChatId ? (
            <Text variant="body" tone="dim">
              Connected to Telegram. The morning ask and session check-ins arrive there.
            </Text>
          ) : (
            <View style={{ gap: space(3) }}>
              <Text variant="small" tone="dim">
                The morning ask arrives as a message, so you can answer it without opening this app.
              </Text>
              <Button
                label="Connect Telegram"
                variant="secondary"
                onPress={() => Linking.openURL(ownerLinkUrl(plan.id))}
              />
            </View>
          )}
        </Section>


        {/* Leaving, in two strengths. Signing out is reversible and says so; erasure is not,
            and is worded so nobody reaches for it expecting a fresh week. */}
        <View style={{ paddingTop: space(12), gap: space(3) }}>
          <Text variant="micro" tone="faint">
            ACCOUNT
          </Text>
          <Text variant="small" tone="dim">
            Signing out leaves everything where it is. Your witness keeps watching, and the
            check-ins keep arriving — sign back in on any phone to pick it up.
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert('Sign out?', 'Your plan stays on our server and nothing stops.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  onPress: async () => {
                    await signOut();
                    // The device copy goes too: the next person to open this phone is not
                    // necessarily the person whose weigh-ins these are.
                    await clear();
                    router.replace('/');
                  },
                },
              ])
            }
            hitSlop={8}
          >
            <Text variant="label" tone="ember">
              Sign out
            </Text>
          </Pressable>
        </View>

        {/* Not a reset. History is append-only — wiping a bad week is cheating with extra
            steps — but erasure has to exist, so it lives here, named for what it is. */}
        <View style={{ paddingTop: space(10), gap: space(3) }}>
          <Text variant="micro" tone="faint">
            YOUR DATA
          </Text>
          <Text variant="small" tone="dim">
            Weigh-ins and sessions can&rsquo;t be edited or removed one by one — a record you can
            rewrite isn&rsquo;t a record. You can delete everything, permanently.
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Delete your account and data?',
                // What the witness hears is stated plainly, because it is the one fact that
                // changes the decision. Disclosure, not a hurdle: §8.1 puts anything that makes
                // leaving harder out of bounds, so there are no extra taps and no guilt.
                'Every weigh-in, every session and your witness link are erased from this phone and from our server. This is permanent, and it is not a way to start the week again.' +
                  (plan.witness.linked
                    ? reachedTarget
                      ? `\n\n${plan.witness.name} will be told you reached what you set out to do, and then nothing more.`
                      : `\n\n${plan.witness.name} will be told the promise has ended.`
                    : ''),
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete everything',
                    style: 'destructive',
                    onPress: async () => {
                      // Deleting the account cascades the plan, the entries, the coach's
                      // memory and both chat links. The device is cleared either way.
                      await deleteAccount();
                      await clear();
                      router.replace('/');
                    },
                  },
                ],
              )
            }
            hitSlop={8}
          >
            <Text variant="label" tone="ember">
              Delete my account and data
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: space(3), paddingBottom: space(8) }}>
      <Text variant="micro" tone="faint">
        {title}
      </Text>
      {children}
      <View style={{ height: 1, backgroundColor: t.lineSoft, marginTop: space(2) }} />
    </View>
  );
}
