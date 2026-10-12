import { ScrollView, View } from 'react-native';

import { Choice } from '../../src/components/Choice';
import { Text } from '../../src/components/Text';
import { patchPlan } from '../../src/lib/api';
import { usePlan } from '../../src/lib/store';
import { STYLES } from '../../src/lib/styles';
import type { Style } from '../../src/lib/types';
import { space, useTheme } from '../../src/theme';

/** Snitch's style (PROF-4, VIS-7). A sample line for each, so you hear the difference first.
 *  It changes the tone, not the rules: witnesses hear about a missed week at every setting. */
export default function SnitchStyle() {
  const { plan, run } = usePlan();
  const t = useTheme();
  if (!plan) return null;

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(5) }}>
      <Choice<Style>
        value={plan.style}
        onChange={(style) => run(() => patchPlan({ style }))}
        options={STYLES.map((x) => ({ key: x.key, label: x.label, note: x.sample }))}
      />
      <View style={{ gap: space(2) }}>
        <Text variant="small" tone="dim">
          Takes effect on Snitch’s next message. Whatever you pick, your witnesses still hear about a missed week.
        </Text>
      </View>
    </ScrollView>
  );
}
