import { Pressable, View } from 'react-native';

import type { Weekday } from '../lib/types';
import { WEEKDAY_LETTER } from '../lib/types';

const NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
import { space, useTheme } from '../theme';
import { Text } from './Text';

/** Weeks read Monday first here — the routine is a working week, not a calendar month. */
const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function DayPicker({ value, onChange }: { value: Weekday[]; onChange: (days: Weekday[]) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space(2) }}>
      {ORDER.map((day) => {
        const active = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={NAME[day]}
            accessibilityState={{ selected: active }}
            onPress={() =>
              onChange(active ? value.filter((d) => d !== day) : [...value, day].sort())
            }
            style={{
              flex: 1,
              aspectRatio: 1,
              maxWidth: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: active ? t.ember : t.line,
              backgroundColor: active ? t.ember : t.surface,
            }}
          >
            <Text variant="label" style={{ color: active ? t.onEmber : t.textDim }}>
              {WEEKDAY_LETTER[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
