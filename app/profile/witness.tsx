import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Field } from '../../src/components/Field';
import { Text } from '../../src/components/Text';
import { ApiError, removeWitness, renewWitness } from '../../src/lib/api';
import { shareInvite } from '../../src/lib/invite';
import { usePlan } from '../../src/lib/store';
import { STATUS_LABEL, witnessLabel, WEIGH_INS_PER_WEEK } from '../../src/lib/types';
import { radius, space, useTheme } from '../../src/theme';

/** One witness (section 4): what they'll get, word for word, before the invite (WIT-3); the
 *  share sheet (WIT-4); and removing them, which under P4 tells every witness (WIT-6). */
export default function WitnessDetail() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { plan, run, nameWitness } = usePlan();
  const navigation = useNavigation();
  const router = useRouter();
  const t = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const index = plan?.witnesses.findIndex((w) => w.id === id) ?? -1;
  const w = index >= 0 ? plan!.witnesses[index] : undefined;

  useEffect(() => {
    if (w) navigation.setOptions({ title: witnessLabel(w, index) });
  }, [navigation, w, index]);

  if (!plan || !w) return null;
  const owner = plan.ownerName;
  const who = w.name ?? 'They';

  const act = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That didn’t work. Try again.');
    }
  };

  function remove() {
    const watchingNow = w!.status === 'watching';
    Alert.alert(
      `Remove ${w!.name ?? 'this witness'}?`,
      watchingNow
        ? `Every witness, ${w!.name ?? 'this one'} included, will be told: “${owner} removed a witness from their plan.” If you’ve reached your goal, they’re told that instead.`
        : 'They never accepted, so nobody is told. The invite stops working.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => act(async () => { await run(() => removeWitness(w!.id)); router.back(); }) },
      ],
    );
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(6) }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: space(1) }}>
        <Text variant="micro" tone={w.status === 'watching' ? 'good' : 'faint'}>
          {STATUS_LABEL[w.status].toUpperCase()}
        </Text>
        <Text variant="body" tone="dim">
          {w.status === 'watching'
            ? `${who} is watching.`
            : w.status === 'stepped_back'
              ? `${who} sent /stop and won’t hear from Snitch again.`
              : w.status === 'expired'
                ? 'This invite expired after 14 days. Send a fresh one.'
                : `Waiting for ${w.name ?? 'them'} to tap the invite. It works once and expires after 14 days.`}
        </Text>
      </View>

      {!w.name && w.status !== 'watching' && (
        <View style={{ gap: space(3) }}>
          <Field label="Their first name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus={!!fresh} placeholder="First name" />
          <Button label="Save name" variant="secondary" disabled={!name.trim()} onPress={() => nameWitness(w.id, name.trim())} />
          <Text variant="small" tone="faint">
            The name stays on this phone until they accept.
          </Text>
        </View>
      )}

      {/* The exact messages they'd receive (WIT-3, Q7). */}
      <View style={{ gap: space(3) }}>
        <Text variant="micro" tone="faint">
          WHAT THEY’LL GET ON TELEGRAM
        </Text>
        <Preview label="When they accept" text={`I’m Snitch, ${owner}’s coach. You’re one of their witnesses: they promised to weigh in ${WEIGH_INS_PER_WEEK} mornings a week and do their workouts. If they keep their word, you won’t hear from me again.`} />
        <Preview label="If a week comes up short" text={`${owner} finished the week with 2 of ${WEIGH_INS_PER_WEEK} weigh-ins. A message from you would land better than another one from me.`} />
        <Preview label="Two workouts missed in a row" text={`${owner} has missed 2 workouts in a row. Worth a nudge from you.`} />
      </View>

      {error && (
        <Text variant="small" tone="ember">
          {error}
        </Text>
      )}

      <View style={{ gap: space(3) }}>
        {w.status === 'waiting' && <Button label="Share the invite" disabled={!w.name} onPress={() => shareInvite(w)} />}
        {w.status === 'expired' && <Button label="Make a new invite" onPress={() => act(() => run(() => renewWitness(w.id)))} />}
        {w.status !== 'stepped_back' && <Button label="Remove this witness" variant="ghost" onPress={remove} />}
      </View>
    </ScrollView>
  );
}

function Preview({ label, text }: { label: string; text: string }) {
  return (
    <Card style={{ gap: space(2), borderRadius: radius.md }}>
      <Text variant="small" tone="faint">
        {label}
      </Text>
      <Text variant="body">{text}</Text>
    </Card>
  );
}
