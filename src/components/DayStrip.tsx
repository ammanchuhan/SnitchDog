import { View } from 'react-native';

import type { Plan } from '../lib/types';
import { thisWeekDays, WEEKDAY_LETTER, weekdayOf } from '../lib/types';
import { space, useTheme } from '../theme';
import { Text } from './Text';

/** This week, Monday to Sunday (HOME-9): the circle is the morning weigh-in, the pips under it
 *  are that day's workouts. Two streams, one row, no legend needed. */
export function DayStrip({ plan }: { plan: Plan }) {
  const t = useTheme();
  const days = thisWeekDays(plan);
  const today = plan.today;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map(({ date, weighIn, workouts }) => {
        const isToday = date === today;
        const weighed = !!weighIn;

        const done = workouts.filter((w) => w.workout?.status === 'done').length;
        return (
          <View
            key={date}
            accessible
            accessibilityLabel={`${WEEKDAY_LETTER[weekdayOf(date)]} ${Number(date.slice(-2))}: ${weighed ? 'weighed in' : 'no weigh-in'}${
              workouts.length ? `, ${done} of ${workouts.length} workouts` : ''
            }`}
            style={{ alignItems: 'center', gap: space(2), opacity: date > today ? 0.5 : 1 }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: weighed ? t.good : t.surfaceHigh,
                borderWidth: isToday ? 1.5 : 1,
                borderColor: weighed ? t.good : isToday ? t.textDim : t.line,
              }}
            >
              <Text variant="micro" numeric style={{ color: weighed ? '#FFFFFF' : t.textFaint }}>
                {Number(date.slice(-2))}
              </Text>
            </View>

            {/* One pip per scheduled workout that day. Nothing scheduled, nothing shown. */}
            <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
              {workouts.map(({ slot, workout: session }) => (
                <View
                  key={slot.id}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      session?.status === 'done'
                        ? t.good
                        : session?.status === 'missed'
                          ? t.ember
                          : 'transparent',
                    borderWidth: session ? 0 : 1,
                    borderColor: t.line,
                  }}
                />
              ))}
            </View>

            <Text variant="micro" tone="faint">
              {WEEKDAY_LETTER[weekdayOf(date)]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
