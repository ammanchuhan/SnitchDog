import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { DayState, Plan } from '../lib/types';
import { dayState, monthGrid, rollingAverage, shiftDate, toDate, WEEKDAY_LETTER } from '../lib/types';
import { space, useTheme } from '../theme';
import { Text } from './Text';

const MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** A month of days, honestly coloured.
 *
 * The important design decision is that 'quiet' looks like nothing at all. A morning you were
 * allowed to skip must not render as a failure, or the weekly floor is a lie we tell in
 * onboarding and take back on this screen. */
export function MonthCalendar({ plan }: { plan: Plan }) {
  const t = useTheme();
  const today = toDate();
  const [month, setMonth] = useState(today.slice(0, 7));

  const skin: Record<DayState, { bg: string; border: string; fg: string }> = {
    clean: { bg: t.good, border: t.good, fg: '#FFFFFF' },
    quiet: { bg: 'transparent', border: t.lineSoft, fg: t.textFaint },
    // Slipped needs a ring you can actually see next to 'quiet', or the two pale states read
    // as the same thing and the calendar stops meaning anything.
    slipped: { bg: t.surfaceHigh, border: t.textFaint, fg: t.textDim },
    called: { bg: t.emberSoft, border: t.ember, fg: t.ember },
    future: { bg: 'transparent', border: 'transparent', fg: t.textFaint },
    before: { bg: 'transparent', border: 'transparent', fg: 'transparent' },
  };

  const cells = monthGrid(`${month}-01`);
  const step = (by: number) => setMonth(shiftDate(`${month}-15`, by * 30).slice(0, 7));

  // The month in three numbers: mornings logged, sessions kept, and where the average went
  // between the day before it started and its last day (or today, for this month).
  const inMonth = (d: string) => d.startsWith(month);
  const logged = plan.weighIns.filter((w) => inMonth(w.date)).length;
  const answered = plan.sessions.filter((s) => inMonth(s.date));
  const kept = answered.filter((s) => s.status === 'done').length;
  const lastDay = [...cells].reverse().find((c): c is string => !!c)!;
  const from = rollingAverage(plan, shiftDate(`${month}-01`, -1));
  const to = rollingAverage(plan, lastDay < today ? lastDay : today);
  const moved = from !== undefined && to !== undefined ? to - from : undefined;
  const toward = moved !== undefined && Math.sign(moved) === Math.sign(plan.goal.target - plan.goal.start);

  return (
    <View style={{ gap: space(4) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => step(-1)} hitSlop={12}>
          <Text variant="heading" tone="faint">‹</Text>
        </Pressable>
        <Text variant="heading">
          {MONTH[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}
        </Text>
        <Pressable onPress={() => step(1)} hitSlop={12} disabled={month >= today.slice(0, 7)}>
          <Text variant="heading" tone={month >= today.slice(0, 7) ? 'faint' : 'dim'}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5, 6, 0].map((d, i) => (
          <Text key={i} variant="micro" tone="faint" center style={{ flex: 1 }}>
            {WEEKDAY_LETTER[d]}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const state = dayState(plan, date, today);
          const s = skin[state];
          const isToday = date === today;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: isToday ? 1.5 : 1,
                  borderColor: isToday ? t.text : s.border,
                  backgroundColor: s.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="micro" numeric style={{ color: s.fg }}>
                  {Number(date.slice(-2))}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Stat label="WEIGH-INS" value={`${logged}`} />
        <Stat label="SESSIONS" value={answered.length ? `${kept}/${answered.length}` : '—'} />
        <Stat
          label="AVERAGE"
          value={moved === undefined ? '—' : `${moved > 0 ? '+' : ''}${moved.toFixed(1)}`}
          tone={moved !== undefined && Math.abs(moved) >= 0.05 ? (toward ? 'good' : 'ember') : undefined}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(4), paddingTop: space(2) }}>
        <Key color={t.good} label="Kept" />
        <Key color="transparent" label="Nothing owed" border={t.lineSoft} />
        <Key color={t.surfaceHigh} label="Slipped" border={t.textFaint} />
        <Key color={t.ember} label={`${plan.witness.name} was called`} />
      </View>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'ember' }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 2, paddingVertical: space(3), borderTopWidth: 1, borderTopColor: t.lineSoft }}>
      <Text variant="micro" tone="faint">
        {label}
      </Text>
      <Text variant="bodyStrong" numeric tone={tone}>
        {value}
      </Text>
    </View>
  );
}

function Key({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          backgroundColor: color,
          borderWidth: border ? 1 : 0,
          borderColor: border,
        }}
      />
      <Text variant="small" tone="dim">
        {label}
      </Text>
    </View>
  );
}
