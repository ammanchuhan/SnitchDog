import { View } from 'react-native';

import { WEIGH_INS_PER_WEEK } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** What being a witness involves, stated the same way everywhere it's asked for.
 *
 * The rules mirror the ladder (server/lib/ladder.ts): a week under the weigh-in floor, or two
 * missed workouts in a row. If those change, this changes with them. `compact` is the short
 * version sign-up fits on one screen (SIGNUP-5). */
export function WitnessRole({ compact }: { compact?: boolean }) {
  const t = useTheme();
  const rows: [string, string][] = compact
    ? [
        ['They get', 'A hello from me on Telegram. Nothing to install.'],
        ['Then, only if you slip', `A week under ${WEIGH_INS_PER_WEEK} weigh-ins, or two workouts missed in a row.`],
        ['Never', 'Your weight, your photos, or our chats.'],
      ]
    : [
        ['When they say yes', 'One message from Snitch on Telegram confirming they’re your witness. Nothing to install.'],
        [
          'If you slip',
          `Only two things reach them: a week that ends with fewer than ${WEIGH_INS_PER_WEEK} weigh-ins, or two workouts missed in a row. One short message each time.`,
        ],
        ['What they do', 'Check in on you, the way they normally would: a text, a call. That’s the whole job.'],
        ['What they never see', 'Your weight, your photos, your chats with Snitch, or who your other witnesses are.'],
        ['Stepping away', 'They can stop being your witness any time, with one message.'],
      ];

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.line,
        backgroundColor: t.surface,
        padding: compact ? space(4) : space(5),
        gap: compact ? space(2) : space(4),
      }}
    >
      {!compact && <Text variant="heading">If you keep your word, they never hear from Snitch.</Text>}
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
