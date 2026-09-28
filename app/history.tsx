import { View } from 'react-native';

import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { usePlan } from '../src/lib/store';
import { space, useTheme } from '../src/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Every weigh-in (HIST-1, HIST-2): newest first, grouped by month, read only. The chart shows
 *  the shape; this shows the record. */
export default function History() {
  const { plan } = usePlan();
  const t = useTheme();
  if (!plan) return null;

  const { unit, target, start } = plan.goal;
  const toward = Math.sign(target - start);
  const sorted = [...plan.weighIns].sort((a, b) => a.date.localeCompare(b.date));

  // Change against the previous reading, whenever that was.
  const rows = sorted
    .map((w, i) => ({ ...w, delta: i > 0 ? w.value - sorted[i - 1].value : undefined }))
    .reverse();

  const months = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), r]);
  }

  const labelFor = (slotId: string) => plan.routine.find((s) => s.id === slotId)?.label ?? 'Workout';
  const STATUS = { done: 'done', missed: 'missed', excused: 'excused' } as const;

  return (
    <Screen edges={['bottom']}>
      <Text variant="body" tone="dim" numeric style={{ paddingTop: space(4), paddingBottom: space(2) }}>
        {rows.length} {rows.length === 1 ? 'morning' : 'mornings'} logged since you started at {start} {unit}.
      </Text>

      {rows.length === 0 && (
        <Text variant="body" tone="faint">
          Nothing yet. Your first morning will show up here.
        </Text>
      )}

      {[...months.entries()].map(([month, entries]) => (
        <View key={month} style={{ paddingTop: space(6) }}>
          <Text variant="micro" tone="faint" style={{ paddingBottom: space(2) }}>
            {MONTHS[Number(month.slice(5, 7)) - 1].toUpperCase()} {month.slice(0, 4)}
          </Text>
          {entries.map((r) => {
            const sessions = plan.workouts.filter((s) => s.date === r.date);
            const good = r.delta !== undefined && Math.sign(r.delta) === toward;
            return (
              <View
                key={r.date}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: space(3),
                  borderBottomWidth: 1,
                  borderBottomColor: t.lineSoft,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" numeric>
                    {DAYS[new Date(`${r.date}T12:00:00`).getDay()]}, {MONTHS[Number(r.date.slice(5, 7)) - 1].slice(0, 3)}{' '}
                    {Number(r.date.slice(8, 10))}
                  </Text>
                  {sessions.length > 0 && (
                    <Text variant="small" tone="faint">
                      {sessions
                        .map((s) => `${labelFor(s.slotId)} ${STATUS[s.status]}`)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text variant="bodyStrong" numeric>
                    {r.value.toFixed(1)} {unit}
                  </Text>
                  {!r.verified && (
                    <Text variant="micro" tone="faint">
                      UNVERIFIED
                    </Text>
                  )}
                  {r.delta !== undefined && Math.abs(r.delta) >= 0.05 && (
                    <Text variant="small" numeric tone={good ? 'good' : 'faint'}>
                      {r.delta > 0 ? '+' : ''}
                      {r.delta.toFixed(1)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
