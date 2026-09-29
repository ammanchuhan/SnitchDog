import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** One answer from a short list. Cards rather than a dropdown: at sign-up, seeing every option at
 *  once is half of understanding the question. */
export function Choice<K extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: { key: K; label: string; note?: string }[];
  value?: K;
  onChange: (key: K) => void;
  /** Less padding, for sign-up steps that must fit on one screen (SIGNUP-1). */
  compact?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: space(2) }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{
              borderRadius: radius.md,
              borderWidth: on ? 1.5 : 1,
              borderColor: on ? t.text : t.line,
              backgroundColor: on ? t.surface : 'transparent',
              paddingVertical: compact ? space(2) + 2 : space(4),
              paddingHorizontal: space(4),
              gap: 2,
            }}
          >
            <Text variant="bodyStrong">{o.label}</Text>
            {o.note ? (
              <Text variant="small" tone="dim">
                {o.note}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
