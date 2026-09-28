import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '../../src/components/List';
import { pushState } from '../../src/lib/push';
import { healthAvailable } from '../../src/lib/steps';
import { space, useTheme } from '../../src/theme';

type State = 'on' | 'partly' | 'off' | 'unknown';
const LABEL: Record<State, string> = { on: 'On', partly: 'While using', off: 'Off', unknown: 'Not asked yet' };

/** Each permission, whether it's on, and what breaks if it's off (PROF-6). */
export default function Permissions() {
  const t = useTheme();
  const [camera, setCamera] = useState<State>('unknown');
  const [location, setLocation] = useState<State>('unknown');
  const [push, setPush] = useState<State>('unknown');

  useFocusEffect(
    useCallback(() => {
      pushState().then(setPush);
      ImagePicker.getCameraPermissionsAsync().then((p) => setCamera(p.granted ? 'on' : p.canAskAgain ? 'unknown' : 'off'));
      Promise.all([Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync()]).then(([fg, bg]) =>
        setLocation(bg.granted ? 'on' : fg.granted ? 'partly' : fg.canAskAgain ? 'unknown' : 'off'),
      );
    }, []),
  );

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(6) }}>
      <ListGroup footer="Without them you won’t hear from Snitch until you open the app: not the 4 am weigh-in, and not when your witnesses have been told.">
        <ListRow label="Notifications" value={LABEL[push]} tone={push === 'on' ? undefined : 'ember'} onPress={() => Linking.openSettings()} />
      </ListGroup>
      <ListGroup footer="Needs “Always”, so a workout counts without opening the app. Only “arrived” and “left” are worked out, on this phone.">
        <ListRow label="Location" value={LABEL[location]} tone={location === 'on' ? undefined : 'ember'} onPress={() => Linking.openSettings()} />
      </ListGroup>
      <ListGroup footer="Steps are read from Apple Health. Change it in the Health app › Sharing › Apps › SnitchDog; iOS doesn’t tell apps whether reading is allowed.">
        <ListRow label="Apple Health" value={healthAvailable() ? 'In the Health app' : 'Not on this device'} onPress={() => Linking.openURL('x-apple-health://')} />
      </ListGroup>
      <ListGroup footer="Without it you can’t weigh in: every weigh-in is a photo of the scale.">
        <ListRow label="Camera" value={LABEL[camera]} tone={camera === 'off' ? 'ember' : undefined} onPress={() => Linking.openSettings()} />
      </ListGroup>
    </ScrollView>
  );
}
