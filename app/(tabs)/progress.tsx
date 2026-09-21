import { useWindowDimensions, View } from 'react-native';

import { DayStrip } from '../../src/components/DayStrip';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { WeightChart } from '../../src/components/WeightChart';
import { usePlan } from '../../src/lib/store';
import {
  currentAverage,
  escalationCount,
  previousAverage,
  progress,
  rollingAverage,
  sessionsThisWeek,
  shiftDate,
  toDate,
  weekHistory,
  weekStatus,
  weighInOn,
} from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

export default function Progress() {
  const { plan } = usePlan();
  const t = useTheme();
  const { width } = useWindowDimensions();

  if (!plan) return null;
  const today = toDate();
  const { goal } = plan;
  const average = currentAverage(plan);
  const fourWeeksAgo = rollingAverage(plan, shiftDate(today, -28));
  const history = weekHistory(plan, today);
  const previous = previousAverage(plan);
  const trend = average !== undefined && previous !== undefined ? average - previous : undefined;
  const remaining = Math.abs((average ?? goal.start) - goal.target);
  const todayWeighIn = weighInOn(plan, today);
  const week = weekStatus(plan, today);
  const sessions = sessionsThisWeek(plan, today);

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
        PROGRESS
      </Text>
      <Text variant="display" numeric style={{ paddingTop: space(2) }}>
        Get to {goal.target} {goal.unit}
      </Text>

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

      <Text variant="micro" tone="faint" style={{ paddingTop: space(10), paddingBottom: space(4) }}>
        THE TREND
      </Text>

      <WeightChart plan={plan} width={width - space(12)} />

      <View style={{ flexDirection: 'row', gap: space(3), paddingTop: space(8) }}>
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
              <Text
                variant="micro"
                numeric
                style={{ color: w.met ? '#FFFFFF' : w.open ? t.textFaint : t.ember }}
              >
                {w.done}/{w.required}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="THE MONTH">
        <MonthCalendar plan={plan} />
      </Section>

      <Section title="THE NUMBER THAT MATTERS">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: escalationCount(plan) > 0 ? t.ember : t.line,
            backgroundColor: escalationCount(plan) > 0 ? t.emberSoft : t.surface,
            padding: space(5),
          }}
        >
          <View style={{ flex: 1, paddingRight: space(4) }}>
            <Text variant="bodyStrong" tone={escalationCount(plan) > 0 ? 'ember' : 'default'}>
              {plan.witness.name} has been called
            </Text>
            <Text variant="small" tone="dim">
              Every other number here is yours. This one is the deal.
            </Text>
          </View>
          <Text variant="display" numeric tone={escalationCount(plan) > 0 ? 'ember' : 'default'}>
            {escalationCount(plan)}
          </Text>
        </View>
      </Section>
    </Screen>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.line,
        backgroundColor: t.surface,
        padding: space(4),
        gap: space(1),
      }}
    >
      <Text variant="micro" tone="faint">
        {label}
      </Text>
      <Text variant="title" numeric>
        {value}
      </Text>
      <Text variant="small" tone="faint">
        {note}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space(4), paddingTop: space(10) }}>
      <Text variant="micro" tone="faint">
        {title}
      </Text>
      {children}
    </View>
  );
}
