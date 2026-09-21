import { Text as RNText, TextProps } from 'react-native';

import { tabular, type as typeScale, useTheme } from '../theme';

type Variant = keyof typeof typeScale;

type Props = TextProps & {
  variant?: Variant;
  /** 'dim' and 'faint' step down the neutral ramp; the rest are semantic. */
  tone?: 'default' | 'dim' | 'faint' | 'ember' | 'good' | 'onEmber';
  /** Tabular figures, for anything that changes in place. */
  numeric?: boolean;
  center?: boolean;
};

export function Text({ variant = 'body', tone = 'default', numeric, center, style, ...rest }: Props) {
  const t = useTheme();
  const colors = {
    default: t.text,
    dim: t.textDim,
    faint: t.textFaint,
    ember: t.ember,
    good: t.good,
    onEmber: t.onEmber,
  };
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[tone] },
        numeric && tabular,
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
