import { Pressable, View } from 'react-native';

import { shortId } from '../lib/id';
import type { RoutineSlot, Weekday } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { DayPicker } from './DayPicker';
import { Field } from './Field';
import { HourPicker, hourLabel } from './HourPicker';
import { Text } from './Text';

const DEFAULT_DAYS: Weekday[] = [1, 3, 5];

export const newSlot = (): RoutineSlot => ({
  id: shortId(8),
  label: 'Workout',
  days: DEFAULT_DAYS,
  hour: 18,
});

/** Edits the training schedule. Shared by setup and the plan screen so both stay identical —
 *  a routine you can only set once is the kind of thing people abandon an app over. */
export function RoutineEditor({
  routine,
  onChange,
}: {
  routine: RoutineSlot[];
  onChange: (next: RoutineSlot[]) => void;
}) {
  const t = useTheme();

  const patch = (id: string, change: Partial<RoutineSlot>) =>
    onChange(routine.map((s) => (s.id === id ? { ...s, ...change } : s)));

  return (
    <View style={{ gap: space(4) }}>
      {routine.map((slot) => (
        <View
          key={slot.id}
          style={{
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: t.line,
            backgroundColor: t.surface,
            padding: space(4),
            gap: space(4),
          }}
        >
          <Field
            label="Session"
            placeholder="Workout"
            value={slot.label}
            onChangeText={(label) => patch(slot.id, { label })}
            autoCapitalize="sentences"
          />
          <View style={{ gap: space(2) }}>
            <Text variant="micro" tone="faint">
              DAYS
            </Text>
            <DayPicker value={slot.days} onChange={(days) => patch(slot.id, { days })} />
          </View>
          <View style={{ gap: space(2) }}>
            <Text variant="micro" tone="faint">
              DONE BY {hourLabel(slot.hour).toUpperCase()}
            </Text>
            <HourPicker value={slot.hour} onChange={(hour) => patch(slot.id, { hour })} />
          </View>
          <Pressable onPress={() => onChange(routine.filter((s) => s.id !== slot.id))} hitSlop={8}>
            <Text variant="small" tone="faint">
              Remove
            </Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={() => onChange([...routine, newSlot()])}
        style={{
          borderRadius: radius.md,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: t.line,
          paddingVertical: space(4),
          alignItems: 'center',
        }}
      >
        <Text variant="label" tone="dim">
          {routine.length ? 'Add another session' : 'Add a session'}
        </Text>
      </Pressable>
    </View>
  );
}
