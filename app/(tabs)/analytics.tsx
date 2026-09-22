import { useRouter } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Figure, Section } from '../../src/components/Figure';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { WeightChart } from '../../src/components/WeightChart';
import { usePlan } from '../../src/lib/store';
import {
  currentAverage,
  escalationCount,
  rollingAverage,
  shiftDate,
  toDate,
  weekHistory,
} from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

/** Looking back: the trend, month by month, and the weeks. Where you stand today is on Home. */
export default function Analytics() {
  const { plan } = usePlan();
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  if (!plan) return null;
  const today = toDate();
  const { goal } = plan;
  const average = currentAverage(plan);
  const fourWeeksAgo = rollingAverage(plan, shiftDate(today, -28));
  const history = weekHistory(plan, today);
  const called = escalationCount(plan);

  /** Pounds a week, measured between averages so it isn't a story about one morning. */
  const rate =
    average !== undefined && fourWeeksAgo !== undefined ? (average - fourWeeksAgo) / 4 : undefined;

  const towardTarget = rate !== undefined && Math.sign(rate) === Math.sign(goal.target - goal.start);
  const weeksLeft =
    towardTarget && rate && average !== undefined
      ? Math.abs((goal.target - average) / rate)
      : undefined;

  return (
    <Screen edges={['top']} style={{ paddingBottom: space(16) }}>
      <Text variant="micro" tone="faint" style={{ paddingTop: space(6) }}>
        ANALYTICS
      </Text>
      <Text variant="display" style={{ paddingTop: space(2), paddingBottom: space(8) }}>
        How it&rsquo;s gone
      </Text>

      <Section title="THE TREND" first>
        <WeightChart plan={plan} width={width - space(12)} />
        <View style={{ flexDirection: 'row', gap: space(3), paddingTop: space(2) }}>
          <Figure
            label="PER WEEK"
            value={rate === undefined ? '—' : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}`}
            note={rate === undefined ? 'four weeks of data needed' : `${goal.unit} a week`}
          />
          <Figure
            label="AT THIS RATE"
            value={weeksLeft === undefined || weeksLeft > 260 ? '—' : `${Math.ceil(weeksLeft)}`}
            note={weeksLeft === undefined || weeksLeft > 260 ? 'not moving yet' : 'weeks to target'}
          />
        </View>
      </Section>

      {/* Month by month is the view for looking back: page through with the arrows. */}
      <Section title="MONTH BY MONTH">
        <MonthCalendar plan={plan} />
      </Section>

      <Pressable
        onPress={() => router.push('/history')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: space(6),
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: t.line,
          backgroundColor: t.surface,
          padding: space(4),
        }}
      >
        <View style={{ gap: space(1) }}>
          <Text variant="bodyStrong">Every weigh-in</Text>
          <Text variant="small" tone="dim" numeric>
            {plan.weighIns.length} mornings, day by day
          </Text>
        </View>
        <Text variant="heading" tone="faint">
          ›
        </Text>
      </Pressable>

      <Section title="WEEKS">
        <Text variant="body" tone="dim">
          {history.best === 0
            ? 'A week counts when you weigh in three times. None yet.'
            : `Best run: ${history.best} clean ${history.best === 1 ? 'week' : 'weeks'} in a row.`}
        </Text>
        {/* Weeks, not days, are the unit of achievement — it's the same unit the witness
            hears about, and it doesn't reward a good Tuesday inside a bad week. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), paddingTop: space(2) }}>
          {history.weeks.map((w) => (
            <View
              key={w.start}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: w.met ? t.good : w.open ? t.line : t.ember,
                backgroundColor: w.met ? t.good : w.open ? 'transparent' : t.emberSoft,
              }}
            >
              <Text variant="micro" numeric style={{ color: w.met ? '#FFFFFF' : w.open ? t.textFaint : t.ember }}>
                {w.done}/{w.required}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="THE NUMBER THAT MATTERS">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: called > 0 ? t.ember : t.line,
            backgroundColor: called > 0 ? t.emberSoft : t.surface,
            padding: space(5),
          }}
        >
          <View style={{ flex: 1, paddingRight: space(4) }}>
            <Text variant="bodyStrong" tone={called > 0 ? 'ember' : 'default'}>
              {plan.witness.name} has been called
            </Text>
            <Text variant="small" tone="dim">
              Every other number here is yours. This one is the deal.
            </Text>
          </View>
          <Text variant="display" numeric tone={called > 0 ? 'ember' : 'default'}>
            {called}
          </Text>
        </View>
      </Section>
    </Screen>
  );
}
