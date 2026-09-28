import * as Linking from 'expo-linking';
import { ScrollView, View } from 'react-native';

import { Card } from '../../src/components/Card';
import { ListGroup, ListRow } from '../../src/components/List';
import { Text } from '../../src/components/Text';
import { space, useTheme } from '../../src/theme';

/** Privacy policy, terms, the medical disclaimer and an eating-disorder support resource (PROF-7). */
export default function Legal() {
  const t = useTheme();
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(6) }}>
      <ListGroup>
        <ListRow label="Privacy policy" onPress={() => Linking.openURL('https://snitchdog.com/privacy')} />
        <ListRow label="Terms" onPress={() => Linking.openURL('https://snitchdog.com/terms')} />
      </ListGroup>

      <Card style={{ gap: space(2) }}>
        <Text variant="micro" tone="faint">
          NOT MEDICAL ADVICE
        </Text>
        <Text variant="small" tone="dim">
          SnitchDog helps you keep a promise to yourself. It isn’t a doctor and doesn’t give medical, diet or nutrition
          advice. Talk to a doctor before starting a new exercise or weight plan, especially if you have a health condition.
        </Text>
      </Card>

      <View style={{ gap: space(2) }}>
        <ListGroup title="If food or your body feels hard to deal with" footer="Free, confidential helplines in your country.">
          <ListRow label="Find a helpline" onPress={() => Linking.openURL('https://findahelpline.com/topics/eating-body-image')} />
        </ListGroup>
      </View>

      <ListGroup>
        <ListRow label="Contact" value="hello@snitchdog.com" onPress={() => Linking.openURL('mailto:hello@snitchdog.com')} />
      </ListGroup>
    </ScrollView>
  );
}
