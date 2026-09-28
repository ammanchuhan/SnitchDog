import { View } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { SnitchAvatar } from './Snitch';
import { Text } from './Text';

/** One chat message. Snitch's carry its round avatar, like a contact photo (VIS-3, COACH-1). */
export function Bubble({ role, text }: { role: 'user' | 'coach'; text: string }) {
  const t = useTheme();
  const mine = role === 'user';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2), alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
      {!mine && <SnitchAvatar size={30} />}
      <View
        accessible
        accessibilityLabel={`${mine ? 'You' : 'Snitch'}: ${text}`}
        style={{
          flexShrink: 1,
          backgroundColor: mine ? t.text : t.surfaceHigh,
          paddingHorizontal: space(4),
          paddingVertical: space(3),
          borderRadius: radius.lg,
          borderBottomRightRadius: mine ? radius.sm : radius.lg,
          borderBottomLeftRadius: mine ? radius.lg : radius.sm,
        }}
      >
        <Text variant="body" style={{ color: mine ? t.bg : t.text }}>
          {text}
        </Text>
      </View>
    </View>
  );
}
