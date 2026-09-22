import { View } from 'react-native';

import { WEIGH_INS_PER_WEEK } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** What being a witness actually involves, stated the same way everywhere it's asked for.
 *
 * The rules here mirror the ladder (server/lib/ladder.ts): a week under the weigh-in floor, or
 * two missed workouts in a row. If those change, this changes with them. */
export function WitnessRole({ name }: { name?: string }) {
  const t = useTheme();
  const who = name?.trim() || 'Your witness';
  const them = name?.trim() || 'they';

  const rows: [string, string][] = [
    ['When they say yes', `${who} gets one message from Ember, your coach, confirming they’re your witness. Nothing to install.`],
    [
      'If you slip',
      `Only two things reach ${them === 'they' ? 'them' : them}: a week that ends with fewer than ${WEIGH_INS_PER_WEEK} weigh-ins, or two workouts missed in a row. One short message each time.`,
    ],
    ['What they do', 'Check in on you, the way they normally would — a text, a call. That’s the whole job.'],
    ['What they never see', 'Your weight, your photos, your conversations with Ember.'],
    ['Stepping away', 'They can stop being your witness any time, with one message.'],
  ];

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.line,
        backgroundColor: t.surface,
        padding: space(5),
        gap: space(4),
      }}
    >
      <Text variant="heading">If you keep your word, {them === 'they' ? 'they' : them} never hear{them === 'they' ? '' : 's'} from Ember.</Text>
      {rows.map(([label, body]) => (
        <View key={label} style={{ gap: 2 }}>
          <Text variant="micro" tone="faint">
            {label.toUpperCase()}
          </Text>
          <Text variant="small" tone="dim">
            {body}
          </Text>
        </View>
      ))}
    </View>
  );
}
