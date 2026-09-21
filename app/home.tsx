import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { CoachNote } from '../src/components/CoachNote';
import { DayStrip } from '../src/components/DayStrip';
import { hourLabel } from '../src/components/HourPicker';
import { Text } from '../src/components/Text';
import { ownerLinkUrl } from '../src/lib/api';
import { seeded } from '../src/lib/seed';
import { usePlan } from '../src/lib/store';
import {
  currentAverage,
  escalationCount,
  previousAverage,
  progress,
  sessionsThisWeek,
  slotsOn,
  sessionFor,
  toDate,
  weekStatus,
  weighInOn,
} from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

const clockTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
};

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

  const average = currentAverage(plan);
  const previous = previousAverage(plan);
  const trend = average !== undefined && previous !== undefined ? average - previous : undefined;
  const todayWeighIn = weighInOn(plan, today);
  const week = weekStatus(plan, today);
  const sessions = sessionsThisWeek(plan, today);
  const todaySlots = slotsOn(plan, today);
  const told = escalationCount(plan);
  const remaining = Math.abs((average ?? goal.start) - goal.target);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(6), paddingBottom: space(12) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textFaint} />}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: space(4),
          }}
        >
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
          <View style={{ flexDirection: 'row', gap: space(5) }}>
            <Pressable onPress={() => router.push('/progress')} hitSlop={12}>
              <Text variant="micro" tone="faint">
                PROGRESS
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/plan')} hitSlop={12}>
              <Text variant="micro" tone="faint">
                PLAN
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => router.push('/plan')}>
          <Text variant="display" numeric>
            Get to {goal.target} {goal.unit}
          </Text>
        </Pressable>

        {/* The headline is the seven-day average. Today's reading is a footnote, on purpose:
            a progress bar that jumps on water weight teaches people to distrust it. */}
        <View style={{ marginTop: space(6), marginBottom: space(8), gap: space(3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2) }}>
            <Text variant="hero" numeric>
              {(average ?? goal.start).toFixed(1)}
            </Text>
            <Text variant="heading" tone="faint" style={{ paddingBottom: space(3) }}>
              {goal.unit}
            </Text>
            {trend !== undefined && Math.abs(trend) >= 0.05 && (
              <Text
                variant="label"
                numeric
                tone={Math.sign(trend) === Math.sign(goal.target - goal.start) ? 'good' : 'dim'}
                style={{ paddingBottom: space(4) }}
              >
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
            {todayWeighIn ? ` · ${todayWeighIn.value.toFixed(1)} this morning` : ''}
          </Text>
        </View>

        <CoachNote />

        {/* ── today ─────────────────────────────────────────────────────── */}
        <Text variant="micro" tone="faint" style={{ marginTop: space(8), marginBottom: space(3) }}>
          TODAY
        </Text>

        {!todayWeighIn ? (
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
          <Card tone="good" style={{ gap: space(2) }}>
            <Text variant="micro" tone="good">
              WEIGHED IN AT {clockTime(todayWeighIn.loggedAt).toUpperCase()}
            </Text>
            <Text variant="heading" numeric>
              {todayWeighIn.value.toFixed(1)} {goal.unit}
            </Text>
            <Text variant="small" tone="dim">
              {week.done >= week.required
                ? `${week.done} mornings this week. Three was the ask.`
                : `${week.done} of ${week.required} mornings this week.`}
            </Text>
          </Card>
        )}

        {todaySlots.map((slot) => {
          const session = sessionFor(plan, today, slot.id);
          return (
            <View key={slot.id} style={{ marginTop: space(3) }}>
              {!session ? (
                <Card style={{ gap: space(4), borderColor: t.line }}>
                  <View style={{ gap: space(1) }}>
                    <Text variant="micro" tone="faint">
                      BY {hourLabel(slot.hour).toUpperCase()}
                    </Text>
                    <Text variant="heading">{slot.label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: space(3) }}>
                    <Button
                      label="Did it"
                      style={{ flex: 1 }}
                      onPress={() => answerSession(slot.id, 'done')}
                    />
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
                  tone={session.status === 'done' ? 'good' : 'plain'}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text variant="bodyStrong">{slot.label}</Text>
                  <Text variant="label" tone={session.status === 'done' ? 'good' : 'ember'}>
                    {session.status === 'done' ? 'Done' : 'Missed'}
                  </Text>
                </Card>
              )}
            </View>
          );
        })}

        <View style={{ height: space(8) }} />
        <Pressable onPress={() => router.push('/progress')}>
          <DayStrip plan={plan} />
        </Pressable>
        <View style={{ height: space(8) }} />

        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <Stat
            label="WEIGH-INS"
            value={`${week.done}`}
            suffix={`of ${week.required} this week`}
            tone={week.impossible ? 'ember' : 'default'}
          />
          <Stat
            label="SESSIONS"
            value={`${sessions.done}`}
            suffix={sessions.total ? `of ${sessions.total} this week` : 'none scheduled'}
          />
          <Stat label="TOLD ON" value={`${told}`} suffix="times" tone={told > 0 ? 'ember' : 'default'} />
        </View>

        {!plan.ownerChatId && (
          <Card style={{ marginTop: space(6), borderColor: t.line, gap: space(3) }}>
            <Text variant="bodyStrong">Turn on your check-ins</Text>
            <Text variant="small" tone="dim">
              The morning ask arrives as a message, so you can answer it without opening this app.
            </Text>
            <Button
              label="Connect Telegram"
              variant="secondary"
              onPress={() => Linking.openURL(ownerLinkUrl(plan.id))}
            />
          </Card>
        )}

        {!witness.linked && (
          <Pressable onPress={() => router.push('/witness')} style={{ marginTop: space(6) }}>
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

function Stat({
  label,
  value,
  suffix,
  tone = 'default',
}: {
  label: string;
  value: string;
  suffix: string;
  tone?: 'default' | 'ember';
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: tone === 'ember' ? t.ember : t.line,
        backgroundColor: tone === 'ember' ? t.emberSoft : t.surface,
        padding: space(4),
        gap: space(1),
      }}
    >
      <Text variant="micro" tone={tone === 'ember' ? 'ember' : 'faint'}>
        {label}
      </Text>
      <Text variant="title" numeric tone={tone === 'ember' ? 'ember' : 'default'}>
        {value}
      </Text>
      <Text variant="small" tone="faint">
        {suffix}
      </Text>
    </View>
  );
}
