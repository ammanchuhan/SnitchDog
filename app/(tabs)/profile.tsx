import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListGroup, ListRow } from '../../src/components/List';
import { SnitchPortrait } from '../../src/components/Snitch';
import { useTabBarClearance } from '../../src/components/TabBar';
import { Text } from '../../src/components/Text';
import { usePlan } from '../../src/lib/store';
import { styleLabel } from '../../src/lib/styles';
import { watching } from '../../src/lib/types';
import { space, useTheme } from '../../src/theme';


/** Everything about you, your deal and Snitch, as one grouped list (PROF-1). Each row goes one
 *  level in; nothing goes deeper than that. */
export default function Profile() {
  const { plan } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const clearance = useTabBarClearance();
  if (!plan) return null;

  const accepted = watching(plan).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(5), paddingBottom: clearance, gap: space(6) }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(4) }}>
          <SnitchPortrait pose="ready" size={72} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="display" numberOfLines={1}>
              {plan.ownerName}
            </Text>
            {plan.email ? (
              <Text variant="small" tone="dim" numberOfLines={1}>
                {plan.email}
              </Text>
            ) : null}
          </View>
        </View>

        <ListGroup title="Your deal">
          <ListRow label="Your plan" detail={plan.confirmedAt ? undefined : 'Not built yet'} onPress={() => router.push('/profile/plan')} />
          <ListRow
            label="Witnesses"
            value={`${accepted} of ${plan.witnesses.length}`}
            tone={accepted === 0 ? 'ember' : undefined}
            onPress={() => router.push('/profile/witnesses')}
          />
        </ListGroup>

        <View>
          <ListGroup title="Snitch">
            <ListRow label="Snitch’s style" value={styleLabel(plan.style)} onPress={() => router.push('/profile/style')} />
            <ListRow label="What Snitch remembers" onPress={() => router.push('/profile/memories')} />
          </ListGroup>
        </View>

        <ListGroup title="Account">
          <ListRow label="Permissions" onPress={() => router.push('/profile/permissions')} />
          <ListRow label="Privacy, terms and support" onPress={() => router.push('/profile/legal')} />
          <ListRow label="Account and data" onPress={() => router.push('/profile/account')} />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
