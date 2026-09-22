import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { Plan } from '../lib/types';
import { rollingAverage, shiftDate, toDate } from '../lib/types';
import { font, radius, space, useTheme } from '../theme';
import { Text } from './Text';

const HEIGHT = 200;
const AXIS = 40; // room for the y labels
const RANGES = [
  { key: '1M', days: 30 },
  { key: '3M', days: 91 },
  { key: '6M', days: 182 },
  { key: 'All', days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const short = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;
const long = (date: string) => `${DAYS[new Date(`${date}T12:00:00`).getDay()]}, ${short(date)}`;

/** Round, readable gridline values: steps of 1, 2, 5 or 10 depending on the span. */
function ticks(lo: number, hi: number, count = 4) {
  const raw = (hi - lo) / count;
  const step = [0.5, 1, 2, 5, 10, 20, 50].find((s) => s >= raw) ?? 100;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}

/** Readings as faint dots, the seven-day average as the line you're meant to read.
 *
 * The dots scatter by two or three pounds and the line barely moves, which teaches the
 * difference between noise and progress better than any copy could. Pick a range to zoom out;
 * press and drag to read any day. */
export function WeightChart({ plan, width }: { plan: Plan; width: number }) {
  const t = useTheme();
  const today = toDate();
  const [range, setRange] = useState<RangeKey>('1M');
  const [scrub, setScrub] = useState<number | null>(null);
  const lastIndex = useRef<number | null>(null);

  const plotWidth = width - AXIS;

  // How far back the record goes. A range longer than that would be mostly empty chart, so it's
  // offered only once the data fills it; until then All shows everything there is.
  const first = plan.weighIns.reduce((min, w) => (w.date < min ? w.date : min), today);
  const recorded = Math.round((Date.parse(today) - Date.parse(first)) / 86_400_000) + 1;
  const available = (r: (typeof RANGES)[number]) => r.days === 0 || r.days <= 30 || recorded >= r.days;

  const data = useMemo(() => {
    const chosen = RANGES.find((r) => r.key === range)!;
    const days = Math.max(chosen.days || recorded, 14);

    const readings = Array.from({ length: days }, (_, i) => {
      const date = shiftDate(today, i - days + 1);
      return {
        date,
        value: plan.weighIns.find((w) => w.date === date)?.value,
        average: rollingAverage(plan, date),
      };
    });

    const values = readings.flatMap((r) => [r.value, r.average].filter((v): v is number => v !== undefined));
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.15, 0.8);
    const lo = min - pad;
    const hi = max + pad;

    const x = (i: number) => (i / (days - 1)) * plotWidth;
    const y = (v: number) => HEIGHT - ((v - lo) / (hi - lo)) * HEIGHT;

    let path = '';
    readings.forEach((r, i) => {
      if (r.average === undefined) return;
      path += `${path ? ' L' : 'M'}${x(i).toFixed(1)} ${y(r.average).toFixed(1)}`;
    });

    return { readings, days, lo, hi, x, y, path, grid: ticks(lo, hi) };
  }, [plan, range, today, plotWidth, recorded]);

  if (!data) {
    return (
      <View style={{ height: HEIGHT, justifyContent: 'center' }}>
        <Text variant="small" tone="faint">
          Two weigh-ins and this becomes a chart.
        </Text>
      </View>
    );
  }

  const { readings, days, lo, hi, x, y, path, grid } = data;
  const target = plan.goal.target;
  const targetY = target >= lo && target <= hi ? y(target) : null;

  const indexAt = (e: GestureResponderEvent) => {
    const px = e.nativeEvent.locationX - AXIS;
    return Math.max(0, Math.min(days - 1, Math.round((px / plotWidth) * (days - 1))));
  };
  const onScrub = (e: GestureResponderEvent) => {
    const i = indexAt(e);
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      if (readings[i].value !== undefined) Haptics.selectionAsync();
    }
    setScrub(i);
  };
  const endScrub = () => {
    lastIndex.current = null;
    setScrub(null);
  };

  // The readout: the day under your finger, or the latest average when you're not touching.
  const shown = scrub !== null ? readings[scrub] : [...readings].reverse().find((r) => r.average !== undefined)!;
  const unit = plan.goal.unit;

  return (
    <View style={{ gap: space(4) }}>
      <View style={{ minHeight: 44, gap: space(1) }}>
        <Text variant="micro" tone="faint">
          {scrub !== null ? long(shown.date).toUpperCase() : 'LATEST 7-DAY AVERAGE'}
        </Text>
        <Text variant="bodyStrong" numeric>
          {shown.average !== undefined ? `${shown.average.toFixed(1)} ${unit} average` : 'No average yet'}
          {scrub !== null && (
            <Text variant="bodyStrong" tone="dim" numeric>
              {shown.value !== undefined ? `  ·  ${shown.value.toFixed(1)} logged` : '  ·  no reading'}
            </Text>
          )}
        </Text>
      </View>

      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onScrub}
        onResponderMove={onScrub}
        onResponderRelease={endScrub}
        onResponderTerminate={endScrub}
        accessibilityLabel={`Weight chart, ${range}. Latest average ${shown.average?.toFixed(1) ?? 'unknown'} ${unit}.`}
      >
        <Svg width={width} height={HEIGHT + 22}>
          {grid.map((v) => (
            <Line key={`g${v}`} x1={AXIS} y1={y(v)} x2={width} y2={y(v)} stroke={t.lineSoft} strokeWidth={1} />
          ))}
          {grid.map((v) => (
            <SvgText
              key={`l${v}`}
              x={AXIS - 8}
              y={y(v) + 4}
              fontSize={11}
              fontFamily={font.medium}
              fill={t.textFaint}
              textAnchor="end"
            >
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </SvgText>
          ))}

          {targetY !== null && (
            <>
              <Line x1={AXIS} y1={targetY} x2={width} y2={targetY} stroke={t.good} strokeWidth={1} strokeDasharray="4 6" />
              <SvgText x={width} y={targetY - 6} fontSize={11} fontFamily={font.semibold} fill={t.good} textAnchor="end">
                target {target}
              </SvgText>
            </>
          )}

          {readings.map((r, i) =>
            r.value === undefined ? null : (
              <Circle
                key={r.date}
                cx={AXIS + x(i)}
                cy={y(r.value)}
                r={days > 100 ? 1.8 : 2.6}
                fill={t.textFaint}
                opacity={0.5}
              />
            ),
          )}
          <Path
            d={path}
            transform={`translate(${AXIS} 0)`}
            stroke={t.ember}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {scrub !== null && (
            <>
              <Line x1={AXIS + x(scrub)} y1={0} x2={AXIS + x(scrub)} y2={HEIGHT} stroke={t.text} strokeWidth={1} opacity={0.4} />
              {shown.average !== undefined && (
                <Circle cx={AXIS + x(scrub)} cy={y(shown.average)} r={5} fill={t.ember} stroke={t.bg} strokeWidth={2} />
              )}
            </>
          )}

          {[0, Math.floor((days - 1) / 2), days - 1].map((i, k) => (
            <SvgText
              key={`x${k}`}
              x={AXIS + x(i)}
              y={HEIGHT + 17}
              fontSize={11}
              fontFamily={font.medium}
              fill={t.textFaint}
              textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}
            >
              {i === days - 1 ? 'Today' : short(readings[i].date)}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', gap: space(2) }}>
        {RANGES.map((r) => {
          const on = r.key === range;
          const open = available(r);
          return (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              disabled={!open}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !open }}
              accessibilityHint={open ? undefined : `Available once you have ${r.key === '3M' ? 'three' : 'six'} months of weigh-ins`}
              style={{
                opacity: open ? 1 : 0.35,
                flex: 1,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: on ? t.text : t.line,
                backgroundColor: on ? t.text : 'transparent',
              }}
            >
              <Text variant="label" style={{ color: on ? t.bg : t.textDim }}>
                {r.key}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="micro" tone="faint">
        DOTS ARE READINGS · LINE IS THE 7-DAY AVERAGE · PRESS AND DRAG TO READ A DAY
      </Text>
    </View>
  );
}
