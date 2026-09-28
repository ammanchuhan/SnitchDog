import { Text as RNText, TextProps } from 'react-native';

import { font, tabular, type as typeScale, useTheme } from '../theme';

type Variant = keyof typeof typeScale;

type Props = TextProps & {
  variant?: Variant;
  /** 'dim' and 'faint' step down the neutral ramp; the rest are semantic. */
  tone?: 'default' | 'dim' | 'faint' | 'ember' | 'good' | 'onEmber' | 'onInk';
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
    onInk: t.onInk,
  };
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[tone] },
        // Numbers are always sans. A serif figure that changes width as the weigh-in changes
        // makes the headline number jitter, which is the one thing it must never do.
        numeric && { fontFamily: typeScale[variant].fontFamily.startsWith('Fraunces') ? font.bold : typeScale[variant].fontFamily },
        numeric && tabular,
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
