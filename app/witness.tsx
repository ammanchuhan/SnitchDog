import { Pressable, Share, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { witnessInviteUrl } from '../src/lib/api';
import { useDismiss } from '../src/lib/nav';
import { usePlan } from '../src/lib/store';
import { radius, space, useTheme } from '../src/theme';

/** Nobody hands over a friend's attention blind, so this screen shows the exact messages
 *  that will be sent before asking for the invite. */
export default function WitnessScreen() {
  const { plan } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();

  if (!plan) return null;
  const { witness, ownerName, goal } = plan;
  const url = witnessInviteUrl(witness.inviteToken);

  const invite = `${witness.name} \u2014 I\u2019m using an app called Accountable to stay on top of training and weighing in, and I picked you as my witness. You don\u2019t install anything, and you\u2019ll only hear from it if I go quiet.\n\n${url}`;

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

      <Card style={{ marginTop: space(7), gap: space(2) }}>
        <Text variant="bodyStrong">What they never see</Text>
        <Text variant="small" tone="dim">
          What you weigh, what you logged, how it&rsquo;s going. Only whether you showed up.
        </Text>
      </Card>

      <View style={{ height: space(8) }} />

      {/* We open a share sheet — we never actually send anything, and we can't know whether
          they did. So the button offers the link and the status only claims what we know:
          whether it has been accepted. */}
      <Button
        label={witness.linked ? 'Share the link again' : 'Share the invite'}
        onPress={() => Share.share({ message: invite })}
      />
      {!witness.linked && (
        <Text variant="small" tone="faint" center style={{ paddingTop: space(3) }}>
          Nothing counts until {witness.name} taps it.
        </Text>
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
