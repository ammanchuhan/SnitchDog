import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Text } from '../src/components/Text';
import { type MirrorPhoto, mirrorPhotos } from '../src/lib/mirror';
import { friendlyDate } from '../src/lib/types';
import { radius, space, useTheme } from '../src/theme';

/** Progress photos (PHOTO-1): one mirror photo a week, oldest first, tap for full screen and
 *  swipe between weeks. Read from this phone only. */
export default function Photos() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const [photos, setPhotos] = useState<MirrorPhoto[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useFocusEffect(useCallback(() => setPhotos(mirrorPhotos()), []));

  const cell = (width - space(5) * 2 - space(2) * 2) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(4) }}>
        {photos.length === 0 ? (
          <Text variant="body" tone="dim">
            None yet. Your weekly mirror photo shows up here. They stay on this phone: on a new phone this starts empty.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {photos.map((p, i) => (
              <Pressable key={p.week} onPress={() => setOpen(i)} accessibilityRole="imagebutton" accessibilityLabel={`Week of ${friendlyDate(p.week)}`}>
                <Image source={{ uri: p.uri }} style={{ width: cell, height: cell * 1.33, borderRadius: radius.sm, backgroundColor: t.surfaceHigh }} />
                <Text variant="micro" tone="faint" style={{ paddingTop: 4 }}>
                  {friendlyDate(p.week).toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text variant="small" tone="faint">
          Stored only on this phone. Snitch and your witnesses never see them.
        </Text>
      </ScrollView>

      <Modal visible={open !== null} animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            initialScrollIndex={open ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(p) => p.week}
            renderItem={({ item }) => (
              <View style={{ width, height, justifyContent: 'center' }}>
                <Image source={{ uri: item.uri }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
                <Text variant="label" center style={{ color: '#fff', paddingTop: space(3) }}>
                  Week of {friendlyDate(item.week)}
                </Text>
              </View>
            )}
          />
          <Pressable onPress={() => setOpen(null)} accessibilityRole="button" style={{ position: 'absolute', top: 60, left: space(5) }}>
            <Text variant="label" style={{ color: '#fff' }}>
              Close
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
