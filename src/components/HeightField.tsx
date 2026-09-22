import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { HeightUnit } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Field } from './Field';
import { Text } from './Text';

/** Height in whichever units someone knows theirs in, with its own switch — plenty of people
 *  weigh in kilograms and still think of their height in feet. Always handed back in cm. */
export function HeightField({
  cm,
  unit,
  onChange,
}: {
  cm?: number;
  unit: HeightUnit;
  onChange: (cm: number | undefined, unit: HeightUnit) => void;
}) {
  const t = useTheme();
  const inches = cm ? Math.round(cm / 2.54) : undefined;
  const [feet, setFeet] = useState(inches ? String(Math.floor(inches / 12)) : '');
  const [inch, setInch] = useState(inches ? String(inches % 12) : '');
  const [metric, setMetric] = useState(cm ? String(Math.round(cm)) : '');

  const fromImperial = (f: string, i: string) =>
    Number(f) >= 3 && Number(f) <= 8 && Number(i || 0) < 12 ? (Number(f) * 12 + Number(i || 0)) * 2.54 : undefined;
  const fromMetric = (v: string) => (Number(v) >= 100 && Number(v) <= 250 ? Number(v) : undefined);

  // Switching carries the height over rather than clearing it.
  function switchTo(next: HeightUnit) {
    if (next === unit) return;
    if (cm) {
      const total = Math.round(cm / 2.54);
      setFeet(String(Math.floor(total / 12)));
      setInch(String(total % 12));
      setMetric(String(Math.round(cm)));
    }
    onChange(cm, next);
  }

  return (
    <View style={{ gap: space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="micro" tone="faint">
          HEIGHT
        </Text>
        <View style={{ flexDirection: 'row', gap: space(1) }}>
          {(['ft', 'cm'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => switchTo(u)}
              accessibilityRole="button"
              accessibilityState={{ selected: unit === u }}
              hitSlop={6}
              style={{
                paddingHorizontal: space(3),
                paddingVertical: space(1),
                borderRadius: radius.pill,
                backgroundColor: unit === u ? t.text : 'transparent',
              }}
            >
              <Text variant="label" style={{ color: unit === u ? t.bg : t.textDim }}>
                {u === 'ft' ? 'ft / in' : 'cm'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {unit === 'cm' ? (
        <Field
          numeric
          keyboardType="number-pad"
          placeholder="178"
          suffix="cm"
          maxLength={3}
          value={metric}
          onChangeText={(v) => {
            setMetric(v);
            onChange(fromMetric(v), 'cm');
          }}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <View style={{ flex: 1 }}>
            <Field
              numeric
              keyboardType="number-pad"
              placeholder="5"
              suffix="ft"
              maxLength={1}
              value={feet}
              onChangeText={(v) => {
                setFeet(v);
                onChange(fromImperial(v, inch), 'ft');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              numeric
              keyboardType="number-pad"
              placeholder="10"
              suffix="in"
              maxLength={2}
              value={inch}
              onChangeText={(v) => {
                setInch(v);
                onChange(fromImperial(feet, v), 'ft');
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
