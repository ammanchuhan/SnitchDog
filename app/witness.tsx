import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { WitnessRole } from '../src/components/WitnessRole';
import { shortId } from '../src/lib/id';
import { shareInvite } from '../src/lib/invite';
import { useDismiss } from '../src/lib/nav';
import { usePlan } from '../src/lib/store';
import { escalationCount } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** Everything about the witness, in one place: who it is, whether they've accepted, what they
 *  will and won't see, the invite, and changing who it is.
 *
 *  Nobody hands over a friend's attention blind, so the exact messages come before the invite. */
export default function WitnessScreen() {
  const { plan, update } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const [changing, setChanging] = useState(false);
  const [newName, setNewName] = useState('');

  if (!plan) return null;
  const called = escalationCount(plan);

  function swap() {
    const name = newName.trim();
    if (!plan || !name) return;
    Alert.alert(
      `Make ${name} your witness?`,
      `${plan.witness.name} stops hearing about you. ${name} has to accept before anything counts, and the called count starts again at zero.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'destructive',
          onPress: async () => {
            // A new witness is a new deal: new invite, nobody watching, and the count starts again.
            await update({
              witness: { name, linked: false, inviteToken: shortId(16) },
              escalatedWeeks: [],
              sessions: plan.sessions.map((s) => ({ ...s, escalatedAt: undefined })),
            });
            setChanging(false);
            setNewName('');
          },
        },
      ],
    );
  }
  const { witness, ownerName, goal } = plan;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: space(4) }}>
        <Pressable onPress={dismiss} hitSlop={12}>
          <Text variant="label" tone="faint">
            Back
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: space(3), paddingTop: space(8), paddingBottom: space(7) }}>
        <Text variant="micro" tone="faint">
          YOUR WITNESS
        </Text>
        <Text variant="display">{witness.name}</Text>
        <Text variant="body" tone={witness.linked ? 'good' : 'ember'}>
          {witness.linked ? 'Accepted. They are watching.' : 'Waiting on them. Until they accept, nobody is watching.'}
        </Text>
        {witness.linked && (
          <Text variant="small" tone={called > 0 ? 'ember' : 'faint'} numeric>
            {called === 0 ? 'They haven\u2019t had to hear about you yet.' : `Called ${called} ${called === 1 ? 'time' : 'times'} so far.`}
          </Text>
        )}
      </View>

      <Text variant="heading" style={{ marginBottom: space(4) }}>
        What {witness.name} will get
      </Text>

      <View style={{ gap: space(3) }}>
        <Bubble
          when="When they accept"
          text={`You\u2019re now ${ownerName}\u2019s witness. They promised to weigh in ${goal.perWeek} mornings a week and train on schedule. I\u2019ll only message you if they stop showing up.`}
        />
        <Bubble
          when="When you go quiet"
          tone="ember"
          text={`${ownerName} finished the week under ${goal.perWeek} weigh-ins. A message from you would probably land better than another one from me.`}
        />
      </View>

      <View style={{ marginTop: space(7) }}>
        <WitnessRole name={witness.name} />
      </View>

      <View style={{ height: space(8) }} />

      {/* We open a share sheet — we never actually send anything, and we can't know whether
          they did. So the button offers the link and the status only claims what we know:
          whether it has been accepted. */}
      <Button
        label={witness.linked ? 'Share the link again' : 'Share the invite'}
        onPress={() => shareInvite(plan)}
      />
      {!witness.linked && (
        <Text variant="small" tone="faint" center style={{ paddingTop: space(3) }}>
          Nothing counts until {witness.name} taps it.
        </Text>
      )}

      <View style={{ height: 1, backgroundColor: t.lineSoft, marginTop: space(10), marginBottom: space(6) }} />

      {!changing ? (
        <Pressable onPress={() => setChanging(true)} hitSlop={8}>
          <Text variant="label" tone="dim" center>
            Pick someone else
          </Text>
        </Pressable>
      ) : (
        <View style={{ gap: space(3) }}>
          <Field
            label="New witness"
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="words"
            autoFocus
            placeholder="Their first name"
          />
          <Text variant="small" tone="faint">
            New witness, new deal: they&rsquo;ll need to accept, and the called count goes back to zero.
          </Text>
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Button
              label="Cancel"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                setChanging(false);
                setNewName('');
              }}
            />
            <Button
              label="Change"
              style={{ flex: 1 }}
              disabled={!newName.trim() || newName.trim() === witness.name}
              onPress={swap}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

function Bubble({ when, text, tone = 'plain' }: { when: string; text: string; tone?: 'plain' | 'ember' }) {
  const t = useTheme();
  return (
    <View style={{ gap: space(2) }}>
      <Text variant="micro" tone="faint">
        {when.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: tone === 'ember' ? t.emberSoft : t.surfaceHigh,
          borderWidth: tone === 'ember' ? 1 : 0,
          borderColor: t.ember,
          padding: space(4),
          borderRadius: radius.lg,
          borderBottomLeftRadius: radius.sm,
        }}
      >
        <Text variant="small" tone={tone === 'ember' ? 'default' : 'dim'}>
          {text}
        </Text>
      </View>
    </View>
  );
}
