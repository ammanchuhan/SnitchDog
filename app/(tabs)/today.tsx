import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { DayStrip } from '../../src/components/DayStrip';
import { Figure, Section } from '../../src/components/Figure';
import { hourLabel } from '../../src/components/HourPicker';
import { Text } from '../../src/components/Text';
import { checkTarget } from '../../src/lib/limits';
import { seeded } from '../../src/lib/seed';
import { usePlan } from '../../src/lib/store';
import {
  currentAverage,
  previousAverage,
  progress,
  sessionFor,
  sessionsThisWeek,
  slotsOn,
  toDate,
  weekStatus,
  weighInOn,
} from '../../src/lib/types';
import { space, useTheme } from '../../src/theme';

const clockTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
};

const greeting = (name: string) => {
  const h = new Date().getHours();
  return `${h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'}, ${name}.`;
};

/** Home: where you stand, what's due, and how the week is going — in that order. Anything you'd
 *  browse rather than act on (the chart, past months) lives on Analytics. */
export default function Home() {
  const { plan, answerSession, refresh, update } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!plan) return null;

  const today = toDate();
  const { goal, witness } = plan;
  const days = Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / 86_400_000) + 1;
  const weighIn = weighInOn(plan, today);
  const week = weekStatus(plan, today);
  const sessions = sessionsThisWeek(plan, today);
  const slots = slotsOn(plan, today);
  const allDone = !!weighIn && slots.every((s) => sessionFor(plan, today, s.id));

  const average = currentAverage(plan);
  const previous = previousAverage(plan);
  const trend = average !== undefined && previous !== undefined ? average - previous : undefined;
  const remaining = Math.abs((average ?? goal.start) - goal.target);
  const toward = trend !== undefined && Math.sign(trend) === Math.sign(goal.target - goal.start);
  const targetProblem = checkTarget(goal.start, goal.target, goal.unit);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(6), paddingBottom: space(16) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textFaint} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space(6) }}>
          <Pressable
            // Dev only: fills in six weeks of history so the screens can be judged against
            // something other than an empty state.
            onLongPress={__DEV__ ? () => update(seeded(plan)) : undefined}
            delayLongPress={600}
            hitSlop={12}
          >
            <Text variant="micro" tone="faint" numeric>
              DAY {days}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/plan')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Edit your plan"
          >
            <Text variant="label" tone="dim">
              Plan ›
            </Text>
          </Pressable>
        </View>

        <Text variant="display" style={{ paddingTop: space(2), paddingBottom: space(6) }}>
          {greeting(plan.ownerName)}
        </Text>

        {/* A target saved before the limits existed still has to be fixed, not quietly honoured. */}
        {targetProblem ? (
          <Pressable onPress={() => router.push('/plan')}>
            <Card style={{ borderColor: t.ember, gap: space(2) }}>
              <Text variant="bodyStrong" tone="ember">
                Your target needs another look
              </Text>
              <Text variant="small" tone="dim">
                {targetProblem}
              </Text>
            </Card>
          </Pressable>
        ) : (
          // The headline is the seven-day average. Today's reading is a footnote, on purpose:
          // a number that jumps on water weight teaches people to distrust it.
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
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceHigh, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(progress(plan) * 100)}%`, height: '100%', backgroundColor: t.good }} />
            </View>
            <Text variant="small" tone="faint" numeric>
              {remaining.toFixed(1)} {goal.unit} to go
              {weighIn ? ` · ${weighIn.value.toFixed(1)} this morning` : ''}
            </Text>
          </View>
        )}

        <View style={{ paddingTop: space(10) }}>
          <Section title="DUE TODAY" first>
            <View style={{ gap: space(3) }}>
              {!weighIn ? (
                <Card tone="ember" style={{ gap: space(4) }}>
                  <View style={{ gap: space(1) }}>
                    <Text variant="title">Step on the scale</Text>
                    <Text variant="small" tone="dim">
                      {week.met
                        ? `You've already made ${week.required} this week. This one is free.`
                        : week.impossible
                          ? `This week is short no matter what. ${witness.name} will hear about it.`
                          : week.needed === week.left
                            ? `${week.needed} more, and ${week.left === 1 ? 'today is the last day' : `only ${week.left} days left`}.`
                            : `${week.needed} more this week.`}
                    </Text>
                  </View>
                  <Button label="Log this morning" onPress={() => router.push('/log')} />
                </Card>
              ) : (
                <Card tone="good" style={{ gap: space(1) }}>
                  <Text variant="micro" tone="good">
                    WEIGHED IN AT {clockTime(weighIn.loggedAt).toUpperCase()}
                  </Text>
                  <Text variant="heading" numeric>
                    {weighIn.value.toFixed(1)} {goal.unit}
                  </Text>
                </Card>
              )}

              {slots.map((slot) => {
                const session = sessionFor(plan, today, slot.id);
                return !session ? (
                  <Card key={slot.id} style={{ gap: space(4), borderColor: t.line }}>
                    <View style={{ gap: space(1) }}>
                      <Text variant="micro" tone="faint">
                        BY {hourLabel(slot.hour).toUpperCase()}
                      </Text>
                      <Text variant="heading">{slot.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: space(3) }}>
                      <Button label="Did it" style={{ flex: 1 }} onPress={() => answerSession(slot.id, 'done')} />
                      <Button
                        label="Missed it"
                        variant="secondary"
                        style={{ flex: 1 }}
                        onPress={() => answerSession(slot.id, 'missed')}
                      />
                    </View>
                  </Card>
                ) : (
                  <Card
                    key={slot.id}
                    tone={session.status === 'done' ? 'good' : 'plain'}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Text variant="bodyStrong">{slot.label}</Text>
                    <Text variant="label" tone={session.status === 'done' ? 'good' : 'ember'}>
                      {session.status === 'done' ? 'Done' : 'Missed'}
                    </Text>
                  </Card>
                );
              })}

              {allDone && (
                <Text variant="small" tone="dim">
                  That&rsquo;s today. Nothing else is due.
                </Text>
              )}
            </View>
          </Section>
        </View>

        <Section title="THIS WEEK">
          <DayStrip plan={plan} />
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Figure label="WEIGH-INS" value={`${week.done}`} note={`of ${week.required} this week`} />
            <Figure
              label="SESSIONS"
              value={`${sessions.done}`}
              note={sessions.total ? `of ${sessions.total} this week` : 'none scheduled'}
            />
          </View>
        </Section>

        {/* The one thing worth interrupting for: without an accepted witness, there's no deal. */}
        {!witness.linked && (
          <Pressable onPress={() => router.push('/witness')} style={{ marginTop: space(8) }}>
            <Card style={{ borderColor: t.ember, gap: space(2) }}>
              <Text variant="bodyStrong" tone="ember">
                Nobody is watching yet
              </Text>
              <Text variant="small" tone="dim">
                {witness.name} hasn&rsquo;t accepted. Until they do, this is just a tracker.
              </Text>
            </Card>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
