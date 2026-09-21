import { View } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** One number, a label above it and a line of context below. */
export function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.line,
        backgroundColor: t.surface,
        padding: space(4),
        gap: space(1),
      }}
    >
      <Text variant="micro" tone="faint">
        {label}
      </Text>
      <Text variant="title" numeric>
        {value}
      </Text>
      <Text variant="small" tone="faint">
        {note}
      </Text>
    </View>
  );
}

export function Section({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <View style={{ gap: space(4), paddingTop: first ? 0 : space(10) }}>
      <Text variant="micro" tone="faint">
        {title}
      </Text>
      {children}
    </View>
  );
}
