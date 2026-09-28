import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Field } from '../../src/components/Field';
import { ListGroup, ListRow } from '../../src/components/List';
import { Text } from '../../src/components/Text';
import { ApiError, changePassword } from '../../src/lib/api';
import { deleteMirrorPhotos } from '../../src/lib/mirror';
import { unregisterPush } from '../../src/lib/push';
import { deleteAccount, signOut } from '../../src/lib/session';
import { usePlan } from '../../src/lib/store';
import { space, useTheme } from '../../src/theme';

/** Account and data (PROF-8..10): email, change password, sign out, delete. */
export default function Account() {
  const { plan, clear } = usePlan();
  const router = useRouter();
  const t = useTheme();
  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!plan) return null;
  const name = plan.ownerName;

  const leave = async (work: () => Promise<unknown>) => {
    await unregisterPush();
    await work();
    deleteMirrorPhotos(); // MIR-6: the warning said so
    await clear();
    router.replace('/auth');
  };

  // PROF-9: the plan keeps running; this phone's copy goes, mirror photos included.
  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your plan keeps running and your witnesses keep watching. This phone’s copy is cleared, including your mirror photos.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => leave(signOut) },
    ]);

  // PROF-10, P4: you can't leave quietly.
  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      `Every witness will be told: “${name} has quit the promise they asked you to witness.” If you’ve reached your goal, they’re told you made it instead. Then everything is erased from our server and this phone, mirror photos included.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => leave(deleteAccount) },
      ],
    );

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(6) }} keyboardShouldPersistTaps="handled">
      <ListGroup>
        <ListRow label="Email" value={plan.email ?? 'Hidden by Apple'} />
        {plan.hasPassword ? <ListRow label="Change password" onPress={() => setChanging((c) => !c)} /> : null}
      </ListGroup>

      {changing && (
        <View style={{ gap: space(3) }}>
          <Field label="Current password" secureTextEntry value={current} onChangeText={setCurrent} textContentType="password" />
          <Field label="New password" secureTextEntry value={next} onChangeText={setNext} textContentType="newPassword" placeholder="At least 10 characters" />
          <Button
            label="Change password"
            loading={busy}
            disabled={!current || next.length < 10}
            onPress={async () => {
              setBusy(true);
              try {
                await changePassword(current, next);
                setNote('Password changed.');
                setChanging(false);
                setCurrent('');
                setNext('');
              } catch (err) {
                setNote(err instanceof ApiError ? err.message : 'That didn’t work.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      )}
      {note && (
        <Text variant="small" tone="dim">
          {note}
        </Text>
      )}

      <ListGroup>
        <ListRow label="Sign out" chevron={false} onPress={confirmSignOut} />
      </ListGroup>
      <ListGroup footer="Your witnesses are told first. This can’t be undone.">
        <ListRow label="Delete my account" tone="ember" chevron={false} onPress={confirmDelete} />
      </ListGroup>
    </ScrollView>
  );
}
