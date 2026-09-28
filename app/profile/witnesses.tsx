import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Button } from '../../src/components/Button';
import { ListGroup, ListRow } from '../../src/components/List';
import { Text } from '../../src/components/Text';
import { WitnessRole } from '../../src/components/WitnessRole';
import { addWitness, ApiError } from '../../src/lib/api';
import { usePlan } from '../../src/lib/store';
import { STATUS_LABEL, witnessLabel } from '../../src/lib/types';
import { space, useTheme } from '../../src/theme';

const MAX = 3;

/** One to three witnesses, each with a status (section 4). Adding one needs no confirmation and
 *  tells nobody (WIT-5). */
export default function Witnesses() {
  const { plan, run } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!plan) return null;

  const active = plan.witnesses.filter((w) => w.status !== 'stepped_back');

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const next = await run(addWitness);
      const created = next.witnesses[next.witnesses.length - 1];
      router.push({ pathname: '/profile/witness', params: { id: created.id, fresh: '1' } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t add one. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(6) }}>
      <ListGroup footer="Each witness is messaged on their own. Nobody is told who the others are.">
        {plan.witnesses.map((w, i) => (
          <ListRow
            key={w.id}
            label={witnessLabel(w, i)}
            value={STATUS_LABEL[w.status]}
            tone={w.status === 'watching' ? 'good' : undefined}
            onPress={() => router.push({ pathname: '/profile/witness', params: { id: w.id } })}
          />
        ))}
      </ListGroup>

      {active.length < MAX && <Button label="+ Add a witness" variant="secondary" loading={busy} onPress={add} />}
      {error && (
        <Text variant="small" tone="ember">
          {error}
        </Text>
      )}

      <WitnessRole />
    </ScrollView>
  );
}
