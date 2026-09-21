import { Image, Pressable, View } from 'react-native';

import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { useDismiss } from '../src/lib/nav';
import { photoUri } from '../src/lib/photos';
import { usePlan } from '../src/lib/store';
import { space, useTheme } from '../src/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Every morning you logged, newest first. The chart shows the shape; this shows the record. */
export default function History() {
  const { plan } = usePlan();
  const dismiss = useDismiss();
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

  const labelFor = (slotId: string) => plan.routine.find((s) => s.id === slotId)?.label ?? 'Session';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', paddingTop: space(4) }}>
        <Pressable onPress={dismiss} hitSlop={12}>
          <Text variant="label" tone="faint">
            Back
          </Text>
        </Pressable>
      </View>

      <Text variant="display" style={{ paddingTop: space(6), paddingBottom: space(2) }}>
        Every weigh-in
      </Text>
      <Text variant="body" tone="dim" numeric style={{ paddingBottom: space(6) }}>
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
            const sessions = plan.sessions.filter((s) => s.date === r.date);
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
                {r.photo ? (
                  <Image
                    source={{ uri: photoUri(r.photo) }}
                    style={{ width: 36, height: 48, borderRadius: 6, marginRight: space(3), backgroundColor: t.surfaceHigh }}
                  />
                ) : (
                  // No photo: logged before photos were required, or sent to the bot.
                  <View
                    style={{
                      width: 36,
                      height: 48,
                      borderRadius: 6,
                      marginRight: space(3),
                      borderWidth: 1,
                      borderColor: t.lineSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="micro" tone="faint">
                      {r.proof === 'telegram' ? 'TG' : '\u2014'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" numeric>
                    {DAYS[new Date(`${r.date}T12:00:00`).getDay()]}, {MONTHS[Number(r.date.slice(5, 7)) - 1].slice(0, 3)}{' '}
                    {Number(r.date.slice(8, 10))}
                  </Text>
                  {sessions.length > 0 && (
                    <Text variant="small" tone="faint">
                      {sessions
                        .map((s) => `${labelFor(s.slotId)} ${s.status === 'done' ? 'done' : 'missed'}`)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text variant="bodyStrong" numeric>
                    {r.value.toFixed(1)} {unit}
                  </Text>
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
