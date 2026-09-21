import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { hourLabel } from '../../src/components/HourPicker';
import { Snapshot } from '../../src/components/Snapshot';
import { Text } from '../../src/components/Text';
import { checkTarget } from '../../src/lib/limits';
import { seeded } from '../../src/lib/seed';
import { usePlan } from '../../src/lib/store';
import { sessionFor, slotsOn, toDate, weekStatus, weighInOn } from '../../src/lib/types';
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

/** Only what's due today. Progress, the coach and the plan each have their own tab, so this
 *  screen can answer one question — what do I owe today? — and nothing else. */
export default function Today() {
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
  const slots = slotsOn(plan, today);
  const allDone = !!weighIn && slots.every((s) => sessionFor(plan, today, s.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(6), paddingBottom: space(16) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textFaint} />}
      >
        <Pressable
          // Dev only: fills in six weeks of history so the screens can be judged against
          // something other than an empty state.
          onLongPress={__DEV__ ? () => update(seeded(plan)) : undefined}
          delayLongPress={600}
          hitSlop={12}
          style={{ paddingTop: space(6) }}
        >
          <Text variant="micro" tone="faint" numeric>
            DAY {days}
          </Text>
        </Pressable>

        <Text variant="display" style={{ paddingTop: space(2), paddingBottom: space(6) }}>
          {greeting(plan.ownerName)}
        </Text>

        {/* A target saved before the limits existed still has to be fixed, not quietly honoured. */}
        {checkTarget(goal.start, goal.target, goal.unit) ? (
          <Pressable onPress={() => router.navigate('/plan')}>
            <Card style={{ borderColor: t.ember, gap: space(2) }}>
              <Text variant="bodyStrong" tone="ember">
                Your target needs another look
              </Text>
              <Text variant="small" tone="dim">
                {checkTarget(goal.start, goal.target, goal.unit)}
              </Text>
            </Card>
          </Pressable>
        ) : (
          <Snapshot plan={plan} />
        )}

        <Text variant="micro" tone="faint" style={{ paddingTop: space(8), paddingBottom: space(3) }}>
          DUE TODAY
        </Text>

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
        </View>

        {allDone && (
          <Text variant="body" tone="dim" style={{ paddingTop: space(6) }}>
            That&rsquo;s today. Nothing else is due.
          </Text>
        )}

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
