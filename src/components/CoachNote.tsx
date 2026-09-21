import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { localLine } from '../lib/line';
import { usePlan } from '../lib/store';
import { toDate } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** One line a day from the coach, and two buttons that teach it what lands.
 *
 * The vote is on the *kind* of line, not the wording — "don't talk to me about streaks" is a
 * useful thing to learn, "I didn't like that sentence" isn't. */
export function CoachNote() {
  const { plan, update } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const today = toDate();

  const line = useMemo(() => (plan ? localLine(plan, today) : null), [plan, today]);
  if (!plan || !line) return null;

  const votedToday = plan.lineVotedOn?.[today];

  async function vote(direction: 'up' | 'down') {
    if (!plan || !line) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const votes = { ...(plan.lineVotes ?? {}) };
    votes[line.kind] = (votes[line.kind] ?? 0) + (direction === 'up' ? 1 : -1);
    await update({
      lineVotes: votes,
      lineVotedOn: { ...(plan.lineVotedOn ?? {}), [today]: direction },
    });
  }

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.lineSoft,
        backgroundColor: t.surfaceHigh,
        padding: space(5),
        gap: space(4),
      }}
    >
      <Text variant="body" style={{ lineHeight: 25 }}>
        {line.text}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.push('/chat')} hitSlop={8}>
          <Text variant="micro" tone="faint">
            {votedToday ? 'NOTED · TALK TO YOUR COACH →' : 'TALK TO YOUR COACH →'}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          {(['up', 'down'] as const).map((d) => {
            const chosen = votedToday === d;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={d === 'up' ? 'More like this' : 'Less like this'}
                onPress={() => vote(d)}
                hitSlop={8}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: chosen ? t.text : t.line,
                  backgroundColor: chosen ? t.text : 'transparent',
                  opacity: votedToday && !chosen ? 0.35 : 1,
                }}
              >
                <Text variant="label" style={{ color: chosen ? t.bg : t.textDim }}>
                  {d === 'up' ? '↑' : '↓'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
