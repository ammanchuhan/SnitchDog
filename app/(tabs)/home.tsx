import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { DayStrip } from '../../src/components/DayStrip';
import { Figure, Section } from '../../src/components/Figure';
import { hourLabel } from '../../src/components/HourPicker';
import { Snitch, SnitchMood } from '../../src/components/Snitch';
import { TAB_BAR_CLEARANCE } from '../../src/components/TabBar';
import { Text } from '../../src/components/Text';
import { checkTarget, heightOf } from '../../src/lib/limits';
import { usePlan } from '../../src/lib/store';
import {
  currentAverage,
  friendlyDate,
  isPaused,
  type Plan,
  previousAverage,
  progress,
  stepsOn,
  watching,
  weighInOn,
  workoutFor,
  workoutsDue,
  workoutsThisWeek,
} from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

const clockTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};

const greeting = (name: string) => {
  const h = new Date().getHours();
  return `${h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'}, ${name}.`;
};

/** The sub-line under the scale card: what the week still needs (HOME-5, Flow C). */
function weekLine(p: Plan) {
  const w = p.week;
  if (!w.counting) return 'It counts once a witness accepts. The habit starts now.';
  if (w.met) return w.todayDone ? `That’s ${w.done} of ${w.required}. The rest of the week is free.` : 'You’ve made the week. This one is free.';
  if (w.impossible) return 'This week is short no matter what now.';
  if (w.noRoom) return `${w.needed} more, and every day left is needed. No room to skip.`;
  return `${w.needed} more this week.`;
}

/** Snitch's pose tracks the day (HOME-1). */
function moodFor(p: Plan, allDone: boolean, due: number): SnitchMood {
  if (p.week.counting && (p.week.impossible || p.week.noRoom) && !p.week.todayDone) return 'worried';
  if (allDone && due > 0) return 'proud';
  if (p.week.todayDone || p.week.met) return 'calm';
  return 'ready';
}

/** Home answers, in order: what you still have to set up, where you stand, what's due today,
 *  how the week is going (section 5). */
export default function Home() {
  const { plan, refresh } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!plan) return null;

  const today = plan.today;
  const { goal } = plan;
  const day = plan.countsFrom
    ? Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${plan.countsFrom}T12:00:00`).getTime()) / 86_400_000) + 1
    : 0;
  const weighIn = weighInOn(plan, today);
  const due = workoutsDue(plan, today);
  const allDone = !!weighIn && due.every((s) => workoutFor(plan, today, s.id)?.status === 'done');
  const workouts = workoutsThisWeek(plan);
  const accepted = watching(plan).length;
  const named = plan.witnesses.length;
  const paused = isPaused(plan, today);
  const stepsToday = stepsOn(plan, today);

  const average = currentAverage(plan);
  const previous = previousAverage(plan);
  const trend = average !== undefined && previous !== undefined ? average - previous : undefined;
  const remaining = Math.abs((average ?? goal.start) - goal.target);
  const toward = trend !== undefined && Math.sign(trend) === Math.sign(goal.target - goal.start);
  const targetProblem = checkTarget(goal.start, goal.target, goal.unit, heightOf(plan.profile));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(6), paddingBottom: TAB_BAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textFaint} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(3), paddingTop: space(5), paddingBottom: space(5) }}>
          <View style={{ flex: 1, gap: space(2) }}>
            <Text variant="micro" tone="faint" numeric>
              {day > 0 ? `DAY ${day}` : 'NOT COUNTING YET'}
            </Text>
            <Text variant="display">{greeting(plan.ownerName)}</Text>
          </View>
          <Snitch mood={moodFor(plan, allDone, due.length)} height={96} />
        </View>

        {/* Onboarding banners (HOME-2): each goes when it's done and comes back if it undoes. */}
        <View style={{ gap: space(2), marginBottom: space(6) }}>
          {accepted === 0 && (
            <Banner
              text={`Nobody is watching yet: ${accepted} of ${named} ${named === 1 ? 'witness has' : 'witnesses have'} accepted`}
              action="Invite"
              onPress={() => router.push('/profile/witnesses')}
            />
          )}
          {!plan.confirmedAt && (
            <Banner text="No plan yet: build your workouts with Snitch" action="Start" onPress={() => router.navigate('/coach')} />
          )}
          {paused && plan.pause && (
            <Card style={{ padding: space(4) }}>
              <Text variant="small" tone="dim">
                Paused until {friendlyDate(plan.pause.until)} ({plan.pause.reason.toLowerCase()}). Nothing is due.
              </Text>
            </Card>
          )}
        </View>

        {targetProblem ? (
          <Pressable onPress={() => router.push('/profile/plan')}>
            <Card tone="ember" style={{ gap: space(2) }}>
              <Text variant="bodyStrong" tone="ember">
                Your target needs another look
              </Text>
              <Text variant="small" tone="dim">
                {targetProblem}
              </Text>
            </Card>
          </Pressable>
        ) : (
          // The headline is the seven-day average (HOME-3). Today's reading lives in the green
          // card only (Q9): a number that jumps on water weight teaches people to distrust it.
          <View style={{ gap: space(3) }}>
            <Text variant="micro" tone="faint" numeric>
              GET TO {goal.target} {goal.unit.toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2) }}>
              <Text variant="hero" numeric>
                {(average ?? goal.start).toFixed(1)}
              </Text>
              <Text variant="heading" tone="faint" style={{ paddingBottom: space(3) }}>
                {goal.unit}
              </Text>
              {trend !== undefined && Math.abs(trend) >= 0.05 && (
                <Text variant="label" numeric tone={toward ? 'good' : 'dim'} style={{ paddingBottom: space(4) }}>
                  {trend > 0 ? '+' : ''}
                  {trend.toFixed(1)}
                </Text>
              )}
            </View>
            <Text variant="micro" tone="faint">
              7-DAY AVERAGE{trend !== undefined ? ' · VS LAST WEEK' : ''}
            </Text>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress(plan) * 100) }}
              style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceHigh, overflow: 'hidden' }}
            >
              <View style={{ width: `${Math.round(progress(plan) * 100)}%`, height: '100%', backgroundColor: t.good }} />
            </View>
            <Text variant="small" tone="faint" numeric>
              {remaining.toFixed(1)} {goal.unit} to go
            </Text>
          </View>
        )}

        <Section title="TODAY">
          <View style={{ gap: space(3) }}>
            {weighIn ? (
              <Card tone="good" style={{ gap: space(1) }}>
                <Text variant="micro" tone="good">
                  WEIGHED IN AT {clockTime(weighIn.loggedAt).toUpperCase()}
                  {weighIn.verified ? '' : ' · UNVERIFIED'}
                </Text>
                <Text variant="heading" numeric>
                  {weighIn.value.toFixed(1)} {goal.unit}
                </Text>
                <Text variant="small" tone="dim">
                  {weekLine(plan)}
                </Text>
              </Card>
            ) : !paused ? (
              // Alarm until weighed in, unless the week is already met (Q10).
              <Card tone={plan.week.met && plan.week.counting ? 'plain' : 'ember'} style={{ gap: space(4) }}>
                <View style={{ gap: space(1) }}>
                  <Text variant="title">Step on the scale</Text>
                  <Text variant="small" tone="dim">
                    {weekLine(plan)}
                  </Text>
                </View>
                <Button label="Log weigh-in" onPress={() => router.push('/log')} />
              </Card>
            ) : null}

            {due.map((slot) => {
              const w = workoutFor(plan, today, slot.id);
              if (w?.status === 'done') {
                return (
                  <Card key={slot.id} tone="good" style={{ gap: space(1) }}>
                    <Text variant="micro" tone="good">
                      {slot.label.toUpperCase()}
                    </Text>
                    <Text variant="bodyStrong">Workout verified by GPS{w.minutes ? ` · ${w.minutes} min` : ''}</Text>
                  </Card>
                );
              }
              return (
                <Card key={slot.id} style={{ gap: space(1) }}>
                  <Text variant="micro" tone="faint">
                    {slot.label.toUpperCase()}
                    {w?.status === 'excused' ? ' · PASS' : ''}
                  </Text>
                  <Text variant="bodyStrong">
                    {w?.status === 'excused' ? 'Excused today' : `At ${plan.gym?.name ?? 'your gym'} by ${hourLabel(slot.hour)}`}
                  </Text>
                  {w?.status !== 'excused' && (
                    <Text variant="small" tone="dim">
                      Stay 30 minutes and it counts. No tapping needed.
                    </Text>
                  )}
                </Card>
              );
            })}

            {plan.stepsGoal ? (
              <Card style={{ gap: space(2) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">Steps</Text>
                  <Text variant="label" tone="dim" numeric>
                    {(stepsToday ?? 0).toLocaleString()} / {plan.stepsGoal.toLocaleString()}
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceHigh, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.round(((stepsToday ?? 0) / plan.stepsGoal) * 100))}%`,
                      height: '100%',
                      backgroundColor: t.good,
                    }}
                  />
                </View>
              </Card>
            ) : null}

            {allDone && (
              <Text variant="small" tone="dim">
                That&rsquo;s today. Nothing else is due.
              </Text>
            )}
          </View>
        </Section>

        <Section title="THIS WEEK">
          <DayStrip plan={plan} />
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Figure label="WEIGH-INS" value={`${plan.week.done}`} note={plan.week.counting ? `of ${plan.week.required}` : 'not counting yet'} />
            <Figure label="WORKOUTS" value={`${workouts.done}`} note={workouts.total ? `of ${workouts.total}` : 'none yet'} />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/** A compact alarm banner with one button (HOME-2): about 56 pt, stacked. */
function Banner({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        minHeight: 56,
        borderRadius: radius.md,
        backgroundColor: t.ember,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        paddingLeft: space(4),
        paddingRight: space(2),
        paddingVertical: space(2),
      }}
    >
      <Text variant="label" tone="onEmber" style={{ flex: 1 }}>
        {text}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={{ height: 40, paddingHorizontal: space(4), borderRadius: radius.pill, backgroundColor: t.bg, justifyContent: 'center' }}
      >
        <Text variant="label" tone="ember">
          {action}
        </Text>
      </Pressable>
    </View>
  );
}
