import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, ScrollView, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Field } from '../../src/components/Field';
import { GymMap } from '../../src/components/GymMap';
import { HeightField } from '../../src/components/HeightField';
import { hourLabel } from '../../src/components/HourPicker';
import { ListGroup, ListRow } from '../../src/components/List';
import { Text } from '../../src/components/Text';
import { ApiError, patchPlan, pausePlan, resumePlan } from '../../src/lib/api';
import { checkTarget, heightLabel, heightOf } from '../../src/lib/limits';
import { usePlan } from '../../src/lib/store';
import { friendlyDate, isPaused, WEEKDAY_LABEL, WEIGH_INS_PER_WEEK } from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

const REASONS = ['Illness', 'Injury', 'Travel', 'Family'];
const PAUSE_DAYS = [3, 7, 14];

/** Your plan (PROF-2): the workouts Snitch built with you, the gym, steps, and the two numbers
 *  that are edited here, target and height, with the same health limits as sign-up. */
export default function YourPlan() {
  const { plan, run } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState('');
  const [heightCm, setHeightCm] = useState<number>();
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!plan) return null;

  const { goal } = plan;
  const slot = plan.routine[0];
  const days = slot ? [...slot.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_LABEL[d]).join(', ') : '';
  const height = heightOf(plan.profile);
  const newHeight = heightOf({ heightCm: heightCm ?? plan.profile.heightCm, heightUnit });
  const targetNum = Number(target || goal.target);
  const problem = checkTarget(goal.start, targetNum, goal.unit, newHeight);
  const paused = isPaused(plan, plan.today);

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That didn’t work. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  function startEditing() {
    setTarget(String(goal.target));
    setHeightCm(plan!.profile.heightCm);
    setHeightUnit(plan!.profile.heightUnit ?? 'ft');
    setEditing(true);
  }

  function pause() {
    const pick = (options: string[], title: string, then: (i: number) => void) =>
      ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options, 'Cancel'], cancelButtonIndex: options.length }, (i) => i < options.length && then(i));
    pick(REASONS, 'Why are you pausing?', (r) =>
      pick(PAUSE_DAYS.map((d) => `${d} days`), 'For how long?', (d) =>
        Alert.alert(
          `Pause for ${PAUSE_DAYS[d]} days?`,
          `Your witnesses will be told you’ve paused for ${PAUSE_DAYS[d]} days (${REASONS[r].toLowerCase()}). Nothing is due until it ends.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Pause plan', onPress: () => act(() => run(() => pausePlan(PAUSE_DAYS[d], REASONS[r]))) },
          ],
        ),
      ),
    );
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(6) }} keyboardShouldPersistTaps="handled">
      <ListGroup title="Workouts">
        {slot ? (
          <>
            <ListRow label="Workouts a week" value={`${slot.days.length}`} />
            <ListRow label="Days" value={days} />
            <ListRow label="At the gym by" value={hourLabel(slot.hour)} />
          </>
        ) : (
          <ListRow label="No plan yet" detail="Snitch builds it with you in chat." />
        )}
        {plan.stepsGoal ? <ListRow label="Daily steps" value={plan.stepsGoal.toLocaleString()} /> : null}
        <ListRow label="Hall passes left this month" value={`${plan.passesLeft}`} detail="Ask Snitch for one when life gets in the way." />
      </ListGroup>

      {plan.gym && (
        <View style={{ gap: space(2) }}>
          <Text variant="micro" tone="faint" style={{ paddingHorizontal: space(4) }}>
            {plan.gym.name.toUpperCase()}
          </Text>
          {/* A picture of the gym, not a map to explore: touches pass through so the page scrolls. */}
          <View pointerEvents="none">
            <GymMap
              style={{ height: 160, borderRadius: radius.md, overflow: 'hidden' }}
              pin={{ latitude: plan.gym.lat, longitude: plan.gym.lng }}
              radius={plan.gym.radius}
            />
          </View>
        </View>
      )}

      <Button label={slot ? 'Change my plan with Snitch' : 'Build it with Snitch'} variant="secondary" onPress={() => router.navigate({ pathname: '/coach', params: { build: '1' } })} />

      {!editing ? (
        <ListGroup title="Goal" footer={`${WEIGH_INS_PER_WEEK} weigh-ins a week and the 4 am weigh-in push are the same for everyone.`}>
          <ListRow label="Target" value={`${goal.target} ${goal.unit}`} onPress={startEditing} />
          <ListRow label="Height" value={height ? heightLabel(height) : '—'} onPress={startEditing} />
          <ListRow label="Started at" value={`${goal.start} ${goal.unit}`} />
        </ListGroup>
      ) : (
        <View style={{ gap: space(4) }}>
          <HeightField cm={heightCm} unit={heightUnit} onChange={(cm, u) => { setHeightCm(cm); setHeightUnit(u); }} />
          <Field label="Target" numeric keyboardType="decimal-pad" suffix={goal.unit} value={target} onChangeText={setTarget} testID="target" />
          {problem && (
            <Text variant="small" tone="ember">
              {problem}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button
              label="Save"
              loading={busy}
              disabled={!!problem || !heightCm}
              style={{ flex: 2 }}
              onPress={async () => {
                if (await act(() => run(() => patchPlan({ target: targetNum, heightCm, heightUnit })))) setEditing(false);
              }}
            />
          </View>
        </View>
      )}

      <ListGroup title="Pause" footer="For illness, injury or travel: up to 14 days. Your witnesses are told, with the reason.">
        {paused && plan.pause ? (
          <ListRow label={`Paused until ${friendlyDate(plan.pause.until)}`} detail={plan.pause.reason} />
        ) : (
          <ListRow label="Pause my plan" onPress={pause} />
        )}
        {paused ? <ListRow label="I’m back early" onPress={() => act(() => run(resumePlan))} /> : null}
      </ListGroup>

      {error && (
        <Text variant="small" tone="ember">
          {error}
        </Text>
      )}
    </ScrollView>
  );
}
