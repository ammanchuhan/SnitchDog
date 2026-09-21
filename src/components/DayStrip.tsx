import { View } from 'react-native';

import type { Plan } from '../lib/types';
import { recentDays, toDate, WEEKDAY_LETTER, weekdayOf } from '../lib/types';
import { space, useTheme } from '../theme';
import { Text } from './Text';

/** Seven days at a glance: the circle is the morning weigh-in, the pips under it are that day's
 *  sessions. Two streams, one row, no legend needed. */
export function DayStrip({ plan }: { plan: Plan }) {
  const t = useTheme();
  const days = recentDays(plan, 7);
  const today = toDate();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map(({ date, weighIn, sessions }) => {
        const isToday = date === today;
        const weighed = !!weighIn;

        return (
          <View key={date} style={{ alignItems: 'center', gap: space(2) }}>
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

            {/* One pip per scheduled session that day. Nothing scheduled, nothing shown. */}
            <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
              {sessions.map(({ slot, session }) => (
                <View
                  key={slot.id}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      session?.status === 'done'
                        ? t.text
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
