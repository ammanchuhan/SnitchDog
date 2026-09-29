import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Figure, Section } from '../../src/components/Figure';
import { ListGroup, ListRow } from '../../src/components/List';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { Screen } from '../../src/components/Screen';
import { Snitch } from '../../src/components/Snitch';
import { Text } from '../../src/components/Text';
import { WeightChart } from '../../src/components/WeightChart';
import { usePlan } from '../../src/lib/store';
import {
  currentAverage,
  escalationCount,
  rollingAverage,
  shiftDate,
  weekHistory,
  weeksTold,
} from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

/** Looking back: the trend, month by month, and the weeks. Where you stand today is on Home. */
export default function Analytics() {
  const { plan } = usePlan();
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  if (!plan) return null;
  const today = plan.today;
  const { goal } = plan;
  const average = currentAverage(plan);
  const fourWeeksAgo = rollingAverage(plan, shiftDate(today, -28));
  const history = weekHistory(plan, today);
  const called = escalationCount(plan);

  /** Pounds a week, measured between averages so it isn't a story about one morning. */
  const rate =
    average !== undefined && fourWeeksAgo !== undefined ? (average - fourWeeksAgo) / 4 : undefined;

  // Snitch reacts to the history (ANA-7): a trophy flex after a clean run, a sly look when a
  // witness heard about the latest week.
  const lastClosed = history.weeks.filter((w) => !w.open).slice(-1)[0];
  const mood = lastClosed && weeksTold(plan).includes(lastClosed.start) ? 'sly' : history.current >= 4 ? 'proud' : 'calm';

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: space(6), paddingBottom: space(8) }}>
        <View style={{ flex: 1, gap: space(2) }}>
          <Text variant="micro" tone="faint">
            ANALYTICS
          </Text>
          <Text variant="display">How it&rsquo;s gone</Text>
        </View>
        <Snitch mood={mood} height={96} />
      </View>

      <Section title="THE TREND" first>
        <WeightChart plan={plan} width={width - space(12)} />
        <View style={{ flexDirection: 'row', gap: space(3), paddingTop: space(2) }}>
          <Figure
            label="PER WEEK"
            value={rate === undefined ? '—' : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}`}
            note={rate === undefined ? 'four weeks of data needed' : `${goal.unit} a week`}
          />
          <Figure label="WEIGH-INS" value={`${plan.weighIns.length}`} note="since you started" />
        </View>
      </Section>

      {/* Month by month is the view for looking back: page through with the arrows. */}
      <Section title="MONTH BY MONTH">
        <MonthCalendar plan={plan} />
      </Section>

      <View style={{ paddingTop: space(6) }}>
        <ListGroup>
          <ListRow label="Every weigh-in" value={`${plan.weighIns.length}`} onPress={() => router.push('/history')} />
          <ListRow label="Progress photos" onPress={() => router.push('/photos')} />
        </ListGroup>
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
              Snitch Count
            </Text>
            <Text variant="small" tone="dim">
              Times your witnesses have been told. Every other number here is yours; this one is the deal.
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
