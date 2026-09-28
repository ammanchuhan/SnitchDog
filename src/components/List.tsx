import { SymbolView } from 'expo-symbols';
import { Children, Fragment } from 'react';
import { Pressable, View } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** An iOS-style grouped list (NAV-2): a small-caps label over a rounded group of rows. */
export function ListGroup({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) {
  const t = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: space(2) }}>
      {title ? (
        <Text variant="micro" tone="faint" style={{ paddingHorizontal: space(4) }}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={{ borderRadius: radius.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: t.lineSoft, marginLeft: space(4) }} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="small" tone="faint" style={{ paddingHorizontal: space(4) }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/** One row. With onPress it shows a chevron and pushes one level in. */
export function ListRow({
  label,
  value,
  detail,
  onPress,
  tone,
  chevron = !!onPress,
}: {
  label: string;
  value?: string;
  detail?: string;
  onPress?: () => void;
  tone?: 'ember' | 'good';
  chevron?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: space(4),
        paddingVertical: space(3),
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        backgroundColor: pressed ? t.surfaceHigh : 'transparent',
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" tone={tone ?? 'default'}>
          {label}
        </Text>
        {detail ? (
          <Text variant="small" tone="faint">
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="dim" numeric>
          {value}
        </Text>
      ) : null}
      {chevron && <SymbolView name="chevron.right" size={14} tintColor={t.textFaint} weight="semibold" style={{ width: 14, height: 14 }} />}
    </Pressable>
  );
}
