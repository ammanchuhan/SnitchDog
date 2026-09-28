import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { suggestPlan } from '../lib/api';
import { recentStepsAverage } from '../lib/steps';
import type { Gym, Plan, RoutineSlot, Weekday } from '../lib/types';
import { WEEKDAY_LABEL, WEIGH_INS_PER_WEEK } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Bubble } from './Bubble';
import { Button } from './Button';
import { DayPicker } from './DayPicker';
import { GymPicker } from './GymPicker';
import { HourPicker, hourLabel } from './HourPicker';
import { Text } from './Text';

type Step = 'count' | 'days' | 'hour' | 'gym' | 'steps' | 'card';

const MON_FIRST = (a: number, b: number) => ((a + 6) % 7) - ((b + 6) % 7);

/** Building the plan with Snitch, in the chat (Flow B, COACH-3..5): how many workouts, which days
 *  and roughly when, where (a pin on the map), and a daily step goal. The numbers Snitch suggests
 *  are computed on the server (DATA-5); the conversation is scripted so it can't wander off. */
export function PlanBuilder({
  plan,
  onConfirm,
  onCancel,
}: {
  plan: Plan;
  onConfirm: (p: { routine: RoutineSlot[]; gym: Gym; stepsGoal: number }) => Promise<void>;
  onCancel?: () => void;
}) {
  const current = plan.routine[0];
  const [step, setStep] = useState<Step>('count');
  const [suggested, setSuggested] = useState({ workoutsPerWeek: 3, stepsGoal: 7000 });
  const [count, setCount] = useState<number>();
  const [days, setDays] = useState<Weekday[]>(current?.days ?? []);
  const [hour, setHour] = useState(current?.hour ?? 18);
  const [gym, setGym] = useState<Gym | undefined>(plan.gym);
  const [steps, setSteps] = useState<number>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The step suggestion starts from their recent Apple Health average, when there is one.
    recentStepsAverage()
      .then((average) => suggestPlan(average))
      .then(setSuggested)
      .catch(() => {});
  }, []);

  const dayList = [...days].sort(MON_FIRST).map((d) => WEEKDAY_LABEL[d]).join(', ');
  const summary = `${count} workouts: ${dayList} at ${gym?.name} by ${hourLabel(hour)} · ${steps?.toLocaleString()} steps a day`;
  const order: Step[] = ['count', 'days', 'hour', 'gym', 'steps', 'card'];
  const at = order.indexOf(step);
  const past = (s: Step) => order.indexOf(s) < at;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm({
        routine: [{ id: current?.id ?? 'workout', label: 'Workout', days, hour }],
        gym: gym!,
        stepsGoal: steps!,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space(4) }}>
      <Bubble role="coach" text={`Let’s build your plan. How many workouts a week? For you I’d start with ${suggested.workoutsPerWeek}.`} />
      {step === 'count' && (
        <Chips
          options={[2, 3, 4, 5, 6].map((n) => ({ key: n, label: `${n}`, hint: n === suggested.workoutsPerWeek }))}
          onPick={(n) => {
            setCount(n);
            setDays((d) => (d.length === n ? d : []));
            setStep('days');
          }}
        />
      )}
      {past('count') && <Bubble role="user" text={`${count} a week`} />}

      {past('count') && <Bubble role="coach" text={`Which ${count} days?`} />}
      {step === 'days' && (
        <View style={{ gap: space(3) }}>
          <DayPicker value={days} onChange={(d) => d.length <= count! && setDays(d)} />
          <Button label={days.length === count ? 'These days' : `Pick ${count! - days.length} more`} disabled={days.length !== count} onPress={() => setStep('hour')} />
        </View>
      )}
      {past('days') && <Bubble role="user" text={dayList} />}

      {past('days') && <Bubble role="coach" text="Roughly when? I’ll expect you at the gym by then." />}
      {step === 'hour' && (
        <View style={{ gap: space(3) }}>
          <HourPicker value={hour} onChange={setHour} />
          <Button label={`By ${hourLabel(hour)}`} onPress={() => setStep('gym')} />
        </View>
      )}
      {past('hour') && <Bubble role="user" text={`By ${hourLabel(hour)}`} />}

      {past('hour') && <Bubble role="coach" text="Where do you work out? Search for it or drop a pin." />}
      {step === 'gym' && (
        <GymPicker
          initial={gym}
          onPick={(g) => {
            setGym(g);
            setStep('steps');
          }}
        />
      )}
      {past('gym') && <Bubble role="user" text={gym?.name ?? ''} />}

      {past('gym') && <Bubble role="coach" text={`Last thing: a daily step goal. I’d say ${suggested.stepsGoal.toLocaleString()}.`} />}
      {step === 'steps' && (
        <Chips
          options={[5000, 6000, 7000, 8000, 10000, 12000].map((n) => ({ key: n, label: n.toLocaleString(), hint: n === suggested.stepsGoal }))}
          onPick={(n) => {
            setSteps(n);
            setStep('card');
          }}
        />
      )}
      {past('steps') && <Bubble role="user" text={`${steps?.toLocaleString()} steps`} />}

      {step === 'card' && (
        <>
          <Bubble role="coach" text="Here’s the plan." />
          <PlanCard summary={summary} busy={busy} onConfirm={confirm} onChange={() => setStep('count')} />
        </>
      )}

      {onCancel && step !== 'card' && (
        <Pressable onPress={onCancel} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text variant="small" tone="dim">
            Keep my current plan
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function PlanCard({ summary, busy, onConfirm, onChange }: { summary: string; busy: boolean; onConfirm: () => void; onChange: () => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: space(4), borderRadius: radius.lg, borderWidth: 1.5, borderColor: t.text, backgroundColor: t.surface, padding: space(5) }}>
      <Text variant="micro" tone="faint">
        YOUR PLAN
      </Text>
      <Text variant="heading">{summary}</Text>
      <Text variant="small" tone="dim">
        Plus {WEIGH_INS_PER_WEEK} weigh-ins a week, as always. Two missed workouts in a row and your witnesses hear about it.
      </Text>
      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Button label="Change" variant="secondary" onPress={onChange} style={{ flex: 1 }} />
        <Button label="Confirm" loading={busy} onPress={onConfirm} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

function Chips<K extends number>({ options, onPick }: { options: { key: K; label: string; hint?: boolean }[]; onPick: (k: K) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), justifyContent: 'flex-end' }}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => {
            Haptics.selectionAsync();
            onPick(o.key);
          }}
          accessibilityRole="button"
          style={{
            minWidth: 48,
            alignItems: 'center',
            paddingHorizontal: space(4),
            paddingVertical: space(3),
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: o.hint ? t.text : t.line,
            backgroundColor: o.hint ? t.surface : 'transparent',
          }}
        >
          <Text variant="label" numeric>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
