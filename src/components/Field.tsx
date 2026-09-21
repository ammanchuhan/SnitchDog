import { TextInput, TextInputProps, View } from 'react-native';

import { font, radius, space, tabular, useTheme } from '../theme';
import { Text } from './Text';

type Props = TextInputProps & { label?: string; suffix?: string; numeric?: boolean };

export function Field({ label, suffix, numeric, style, ...rest }: Props) {
  const t = useTheme();
  return (
    <View style={{ gap: space(2) }}>
      {label ? (
        <Text variant="micro" tone="faint">
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: radius.md,
          paddingHorizontal: space(4),
        }}
      >
        <TextInput
          placeholderTextColor={t.textFaint}
          selectionColor={t.ember}
          {...rest}
          style={[
            {
              flex: 1,
              height: 56,
              color: t.text,
              fontFamily: numeric ? font.bold : font.medium,
              fontSize: numeric ? 24 : 17,
            },
            numeric && tabular,
            style,
          ]}
        />
        {suffix ? (
          <Text variant="label" tone="faint">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
