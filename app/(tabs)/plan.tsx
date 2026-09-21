import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Field } from '../../src/components/Field';
import { HourPicker, hourLabel } from '../../src/components/HourPicker';
import { RoutineEditor } from '../../src/components/RoutineEditor';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { deletePlan, ownerLinkUrl } from '../../src/lib/api';
import { shortId } from '../../src/lib/id';
import { usePlan } from '../../src/lib/store';
import type { RoutineSlot } from '../../src/lib/types';
import { WEIGH_INS_PER_WEEK } from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

/** Everything set during onboarding, changeable afterwards. A goal you can't edit is a goal
 *  people abandon the app over rather than adjust. */
export default function PlanScreen() {
  const { plan, update, clear } = usePlan();
  const router = useRouter();
  const t = useTheme();

  const [target, setTarget] = useState(plan ? String(plan.goal.target) : '');
  const [unit, setUnit] = useState<'lb' | 'kg'>(plan?.goal.unit ?? 'lb');
  const [wakeHour, setWakeHour] = useState(plan?.goal.wakeHour ?? 7);
  const [routine, setRoutine] = useState<RoutineSlot[]>(plan?.routine ?? []);
  const [witnessName, setWitnessName] = useState(plan?.witness.name ?? '');
  const [saved, setSaved] = useState(false);
  // Any edit after a save means there's something to save again.
  useEffect(() => setSaved(false), [target, unit, wakeHour, routine, witnessName]);

  if (!plan) return null;
  const witnessChanged = witnessName.trim() !== plan.witness.name;
  const valid = Number(target) > 0 && witnessName.trim().length > 0;

  async function save() {
    if (!plan) return;
    await update({
      goal: { ...plan.goal, target: Number(target), unit, wakeHour },
      routine: routine.filter((s) => s.days.length > 0 && s.label.trim().length > 0),
      // A new witness is a new deal: new invite, nobody watching, and the count starts again.
      ...(witnessChanged
        ? {
            witness: { name: witnessName.trim(), linked: false, inviteToken: shortId(16) },
            escalatedWeeks: [],
            sessions: plan.sessions.map((s) => ({ ...s, escalatedAt: undefined })),
          }
        : {}),
    });
    setSaved(true);
  }

  return (
    <Screen edges={['top']} style={{ paddingBottom: space(16) }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text variant="micro" tone="faint" style={{ paddingTop: space(6) }}>
          PLAN
        </Text>
        <Text variant="display" style={{ paddingTop: space(2), paddingBottom: space(8) }}>
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

        <Section title="WITNESS">
          <Field label="Watching you" value={witnessName} onChangeText={setWitnessName} autoCapitalize="words" />
          {witnessChanged ? (
            <Text variant="small" tone="ember">
              New witness, new deal: {witnessName.trim() || 'they'} will need to accept, and your
              told-on count goes back to zero.
            </Text>
          ) : (
            <Pressable
              onPress={() => router.push('/witness')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: plan.witness.linked ? t.line : t.ember,
                backgroundColor: plan.witness.linked ? t.surface : t.emberSoft,
                padding: space(4),
              }}
            >
              <View style={{ flex: 1, gap: space(1) }}>
                <Text variant="bodyStrong" tone={plan.witness.linked ? 'default' : 'ember'}>
                  {plan.witness.linked ? `${plan.witness.name} is watching` : `${plan.witness.name} hasn't accepted`}
                </Text>
                <Text variant="small" tone="dim">
                  {plan.witness.linked ? 'What they see, and how to change it' : 'Share the invite again'}
                </Text>
              </View>
              <Text variant="heading" tone="faint">
                ›
              </Text>
            </Pressable>
          )}
        </Section>

        <View style={{ gap: space(3), paddingTop: space(4) }}>
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


        {/* Not a reset. History is append-only — wiping a bad week is cheating with extra
            steps — but erasure has to exist, so it lives here, named for what it is. */}
        <View style={{ paddingTop: space(12), gap: space(3) }}>
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
                'Every weigh-in, every session and your witness link are erased from this phone and from our server. This is permanent, and it is not a way to start the week again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete everything',
                    style: 'destructive',
                    onPress: async () => {
                      await deletePlan(plan.id);
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
