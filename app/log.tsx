import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { useDismiss } from '../src/lib/nav';
import { checkJump, checkWeight } from '../src/lib/limits';
import { usePlan } from '../src/lib/store';
import { currentAverage, latestWeighIn } from '../src/lib/types';
import { space, useTheme } from '../src/theme';

/** One number, one tap. Anything else here is friction between a person and the truth. */
export default function Log() {
  const { plan, logWeight } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const [value, setValue] = useState('');

  if (!plan) return null;
  const { unit, start, target } = plan.goal;
  const last = latestWeighIn(plan)?.value ?? start;
  const average = currentAverage(plan);
  const parsed = Number(value);
  const problem = checkWeight(parsed, unit);
  const warning = problem ? null : checkJump(parsed, latestWeighIn(plan)?.value, unit);
  const valid = parsed > 0 && !problem;
  const delta = valid ? parsed - last : 0;

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space(4) }}>
          <Pressable onPress={dismiss} hitSlop={12}>
            <Text variant="label" tone="faint">
              Close
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: space(6), paddingTop: space(8) }}>
          <View style={{ gap: space(2) }}>
            <Text variant="title">This morning</Text>
            <Text variant="body" tone="dim" numeric>
              {average !== undefined
                ? `Your seven-day average is ${average.toFixed(1)} ${unit}. Target ${target} ${unit}.`
                : `Starting at ${start} ${unit}. Target ${target} ${unit}.`}
            </Text>
          </View>

          <Field
            numeric
            autoFocus
            keyboardType="decimal-pad"
            placeholder={String(last)}
            suffix={unit}
            value={value}
            onChangeText={setValue}
            returnKeyType="done"
          />

          {(problem || warning) && (
            <Text variant="small" tone="ember">
              {problem ?? warning}
            </Text>
          )}

          {valid && !warning && delta !== 0 && (
            <Text
              variant="label"
              numeric
              tone={Math.sign(delta) === Math.sign(target - start) ? 'good' : 'dim'}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)} {unit} since your last entry
            </Text>
          )}
        </View>

        <View style={{ gap: space(3), paddingBottom: space(4) }}>
          <Button
            label="Log it"
            disabled={!valid}
            onPress={async () => {
              await logWeight(parsed);
              dismiss();
            }}
          />
          <Text variant="small" tone="faint" center>
            One number a morning. Your witness is told whether you weighed in, never what it said.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
