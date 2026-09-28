import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Switch, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Snitch } from '../src/components/Snitch';
import { Text } from '../src/components/Text';
import {
  keepMirrorPhoto,
  markNoticeSeen,
  noticeSeen,
  saveToPhotosPreference,
  setSaveToPhotosPreference,
} from '../src/lib/mirror';
import { useDismiss } from '../src/lib/nav';
import { discardPhoto, takePhoto } from '../src/lib/photos';
import { usePlan } from '../src/lib/store';
import { weekStart } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** The weekly mirror photo (MIR-1..3). A private record of progress: it stays on this phone,
 *  and nothing about it, taken or skipped, ever reaches a witness (Q21). */
export default function Mirror() {
  const { plan } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const [firstTime, setFirstTime] = useState<boolean | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [alsoToPhotos, setAlsoToPhotos] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    noticeSeen().then((seen) => setFirstTime(!seen));
    saveToPhotosPreference().then(setAlsoToPhotos);
    return () => discardPhoto(pending.current); // taken but not kept
  }, []);

  if (!plan || firstTime === null) return null;
  const week = weekStart(plan.today);

  async function capture(camera: 'front' | 'back') {
    const result = await takePhoto(camera);
    if (!result.ok) return;
    discardPhoto(pending.current);
    pending.current = result.uri;
    setUri(result.uri);
  }

  async function keep() {
    if (!uri) return;
    setBusy(true);
    await setSaveToPhotosPreference(alsoToPhotos);
    await keepMirrorPhoto(uri, week, alsoToPhotos);
    pending.current = null;
    setBusy(false);
    setSaved(true);
  }

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', paddingTop: space(4) }}>
        <Pressable onPress={dismiss} hitSlop={12} accessibilityRole="button">
          <Text variant="label" tone="faint">
            {saved ? 'Done' : 'Close'}
          </Text>
        </Pressable>
      </View>

      {saved ? (
        <View style={{ flex: 1, justifyContent: 'center', gap: space(4) }}>
          <Snitch mood="proud" height={180} />
          <Text variant="title" center>
            Saved on this phone.
          </Text>
          <Text variant="body" tone="dim" center>
            It’s in Analytics › Progress photos, next to last week’s.
          </Text>
        </View>
      ) : firstTime ? (
        // MIR-3: before the first one, say where they live.
        <View style={{ flex: 1, justifyContent: 'center', gap: space(5) }}>
          <Snitch mood="calm" height={160} />
          <Text variant="title">Your mirror photo</Text>
          <Text variant="body" tone="dim">
            Once a week, a photo in the mirror. These stay on this phone only. Sign in on another phone, or delete the
            app, and they won’t be there.
          </Text>
          <Text variant="body" tone="dim">
            Nobody sees them: not me, not your witnesses.
          </Text>
          <Button
            label="Got it"
            onPress={async () => {
              await markNoticeSeen();
              setFirstTime(false);
            }}
          />
        </View>
      ) : (
        <View style={{ flex: 1, gap: space(5), paddingTop: space(4) }}>
          <Text variant="title">Mirror photo</Text>
          {uri ? (
            <Image source={{ uri }} style={{ flex: 1, borderRadius: radius.lg, backgroundColor: t.surfaceHigh }} resizeMode="cover" />
          ) : (
            <Card style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(3) }}>
              <Text variant="body" tone="dim" center>
                Same place, same light, same pose each week makes the difference easy to see.
              </Text>
            </Card>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="body">Also save to my Photos</Text>
            <Switch value={alsoToPhotos} onValueChange={setAlsoToPhotos} accessibilityLabel="Also save to my Photos" />
          </View>
          <View style={{ gap: space(3), paddingBottom: space(4) }}>
            {uri ? (
              <>
                <Button label="Keep it" loading={busy} onPress={keep} />
                <Button label="Retake" variant="secondary" onPress={() => capture('back')} />
              </>
            ) : (
              <>
                <Button label="Take it (back camera)" onPress={() => capture('back')} />
                <Button label="Selfie camera" variant="secondary" onPress={() => capture('front')} />
              </>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
