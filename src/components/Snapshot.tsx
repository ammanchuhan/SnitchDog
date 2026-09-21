import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Plan } from '../lib/types';
import { currentAverage, previousAverage, progress } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** The glance: where the average sits, which way it moved, how far is left. Everything deeper
 *  is one tap away on Progress, so this stays one line and one bar. */
export function Snapshot({ plan }: { plan: Plan }) {
  const router = useRouter();
  const t = useTheme();
  const { goal } = plan;
  const average = currentAverage(plan);
  const previous = previousAverage(plan);
  const trend = average !== undefined && previous !== undefined ? average - previous : undefined;
  const left = Math.abs((average ?? goal.start) - goal.target);
  const toward = trend !== undefined && Math.sign(trend) === Math.sign(goal.target - goal.start);

  return (
    <Pressable
      onPress={() => router.navigate('/progress')}
      accessibilityRole="button"
      accessibilityLabel="Open progress"
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.lineSoft,
        backgroundColor: t.surface,
        padding: space(5),
        gap: space(3),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text variant="micro" tone="faint">
            7-DAY AVERAGE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(2) }}>
            <Text variant="title" numeric>
              {(average ?? goal.start).toFixed(1)} {goal.unit}
            </Text>
            {trend !== undefined && Math.abs(trend) >= 0.05 && (
              <Text variant="label" numeric tone={toward ? 'good' : 'dim'}>
                {trend > 0 ? '+' : ''}
                {trend.toFixed(1)}
              </Text>
            )}
          </View>
        </View>
        <Text variant="small" tone="faint" numeric>
          {left.toFixed(1)} to go ›
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: t.surfaceHigh, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(progress(plan) * 100)}%`, height: '100%', backgroundColor: t.good }} />
      </View>
    </Pressable>
  );
}
