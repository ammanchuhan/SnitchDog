import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { Plan } from '../lib/types';
import { rollingAverage, shiftDate, toDate } from '../lib/types';
import { space, useTheme } from '../theme';
import { Text } from './Text';

const HEIGHT = 180;

/** Readings as faint dots, the seven-day average as the line you're meant to read.
 *
 * The whole chart is an argument: the dots scatter by two or three pounds and the line barely
 * moves, which teaches the difference between noise and progress better than any copy could. */
export function WeightChart({ plan, days = 30, width }: { plan: Plan; days?: number; width: number }) {
  const t = useTheme();
  const today = toDate();

  const { dots, path, low, high } = useMemo(() => {
    const window = Array.from({ length: days }, (_, i) => shiftDate(today, i - days + 1));
    const readings = window.map((date) => ({
      date,
      value: plan.weighIns.find((w) => w.date === date)?.value,
      average: rollingAverage(plan, date),
    }));

    const values = readings.flatMap((r) => [r.value, r.average].filter((v): v is number => v !== undefined));
    if (values.length < 2) return { dots: [], path: '', low: 0, high: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.25, 0.6);
    const lo = min - pad;
    const hi = max + pad;

    const x = (i: number) => (i / (days - 1)) * width;
    const y = (v: number) => HEIGHT - ((v - lo) / (hi - lo)) * HEIGHT;

    let d = '';
    readings.forEach((r, i) => {
      if (r.average === undefined) return;
      d += `${d ? ' L' : 'M'}${x(i).toFixed(1)} ${y(r.average).toFixed(1)}`;
    });

    return {
      dots: readings
        .map((r, i) => (r.value === undefined ? null : { cx: x(i), cy: y(r.value) }))
        .filter((p): p is { cx: number; cy: number } => !!p),
      path: d,
      low: lo,
      high: hi,
    };
  }, [plan, days, today, width]);

  if (!path) {
    return (
      <View style={{ height: HEIGHT, justifyContent: 'center' }}>
        <Text variant="small" tone="faint">
          Two weigh-ins and this becomes a chart.
        </Text>
      </View>
    );
  }

  const targetY =
    plan.goal.target >= low && plan.goal.target <= high
      ? HEIGHT - ((plan.goal.target - low) / (high - low)) * HEIGHT
      : null;

  return (
    <View style={{ gap: space(2) }}>
      <Svg width={width} height={HEIGHT}>
        {targetY !== null && (
          <Line x1={0} y1={targetY} x2={width} y2={targetY} stroke={t.good} strokeWidth={1} strokeDasharray="4 6" />
        )}
        {dots.map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={2.5} fill={t.textFaint} opacity={0.5} />
        ))}
        <Path d={path} stroke={t.ember} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="micro" tone="faint">
          {days} DAYS
        </Text>
        <Text variant="micro" tone="faint">
          DOTS ARE READINGS · LINE IS THE AVERAGE
        </Text>
      </View>
    </View>
  );
}
