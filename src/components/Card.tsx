import { View, ViewProps } from 'react-native';

import { radius, space, useTheme } from '../theme';

/** Surfaces are separated by tone, not shadow — it keeps light and dark identical in structure. */
export function Card({
  tone = 'plain',
  style,
  ...rest
}: ViewProps & { tone?: 'plain' | 'ember' | 'good' }) {
  const t = useTheme();
  const tones = {
    plain: { backgroundColor: t.surface, borderColor: t.line },
    ember: { backgroundColor: t.emberSoft, borderColor: t.ember },
    good: { backgroundColor: t.goodSoft, borderColor: t.good },
  };
  return (
    <View
      {...rest}
      style={[
        { borderRadius: radius.lg, borderWidth: 1, padding: space(5) },
        tones[tone],
        style,
      ]}
    />
  );
}
