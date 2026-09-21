import { useRef } from 'react';
import { Pressable, ScrollView } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

export const hourLabel = (h: number) => {
  const period = h >= 12 ? 'pm' : 'am';
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${period}`;
};

/** A row of hours. Scrolls rather than wraps, so the chosen hour stays in one predictable place. */
export function HourPicker({
  value,
  onChange,
  from = 5,
  to = 22,
}: {
  value: number;
  onChange: (hour: number) => void;
  from?: number;
  to?: number;
}) {
  const t = useTheme();
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const scroller = useRef<ScrollView>(null);
  const settled = useRef(false);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space(2), paddingRight: space(6) }}
    >
      {hours.map((h) => {
        const active = value === h;
        return (
          <Pressable
            key={h}
            onPress={() => onChange(h)}
            // The chosen hour can sit far down a long row, so open scrolled to it rather than
            // at 5am with the answer hidden off-screen.
            onLayout={(e) => {
              if (!active || settled.current) return;
              settled.current = true;
              const x = Math.max(0, e.nativeEvent.layout.x - space(4));
              requestAnimationFrame(() => scroller.current?.scrollTo({ x, animated: false }));
            }}
            style={{
              paddingHorizontal: space(4),
              height: 44,
              justifyContent: 'center',
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: active ? t.ember : t.line,
              backgroundColor: active ? t.ember : t.surface,
            }}
          >
            <Text variant="label" numeric style={{ color: active ? t.onEmber : t.textDim }}>
              {hourLabel(h)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
