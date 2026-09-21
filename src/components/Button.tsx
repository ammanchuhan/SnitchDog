import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, ViewStyle } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  /** 'primary' is the one ember moment on a screen — never two at once. */
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const t = useTheme();

  const skin = {
    primary: { backgroundColor: t.ember, borderColor: t.ember, tone: 'onEmber' as const },
    secondary: { backgroundColor: 'transparent', borderColor: t.line, tone: 'default' as const },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent', tone: 'dim' as const },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        {
          height: 54,
          borderRadius: radius.pill,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space(6),
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        skin,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? t.onEmber : t.text} />
      ) : (
        <Text variant="label" tone={skin.tone}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
