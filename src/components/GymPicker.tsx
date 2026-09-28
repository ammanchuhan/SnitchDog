import * as Location from 'expo-location';
import type { AppleMaps } from 'expo-maps';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import type { Gym } from '../lib/types';
import { font, radius, space, useTheme } from '../theme';
import { Button } from './Button';
import { GymMap, mapsAvailable } from './GymMap';
import { Text } from './Text';

/** The gym's geofence radius (COACH-4). Wide enough for GPS drift inside a building. */
export const GYM_RADIUS = 150;

const around = (latitude: number, longitude: number) => ({ coordinates: { latitude, longitude }, zoom: 15 });

/** "Where do you work out?" as an inline map card: search for a place or drop a pin (COACH-4).
 *  Location is only used here, in the foreground, to centre the map; nothing is sent anywhere
 *  but the pin you choose. */
export function GymPicker({ initial, onPick }: { initial?: Gym; onPick: (gym: Gym) => void }) {
  const t = useTheme();
  const map = useRef<AppleMaps.MapView>(null);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    initial ? { latitude: initial.lat, longitude: initial.lng } : null,
  );
  const [name, setName] = useState(initial?.name ?? '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;
      const here = await Location.getLastKnownPositionAsync().catch(() => null) ?? (await Location.getCurrentPositionAsync({}).catch(() => null));
      if (here) map.current?.setCameraPosition(around(here.coords.latitude, here.coords.longitude));
    })();
  }, [initial]);

  async function drop(latitude: number, longitude: number, label?: string) {
    setPin({ latitude, longitude });
    if (label) return setName(label);
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
    if (place && !name) setName(place.name ?? place.street ?? '');
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setNote(null);
    try {
      const [hit] = await Location.geocodeAsync(query.trim());
      if (!hit) {
        setNote('Nothing found. Try the street address, or tap the map.');
        return;
      }
      map.current?.setCameraPosition(around(hit.latitude, hit.longitude));
      await drop(hit.latitude, hit.longitude, query.trim());
    } catch {
      setNote('Search isn’t working right now. Tap the map instead.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <View style={{ gap: space(3), borderRadius: radius.lg, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, padding: space(3) }}>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a gym or address"
          placeholderTextColor={t.textFaint}
          returnKeyType="search"
          onSubmitEditing={search}
          style={{
            flex: 1,
            height: 44,
            paddingHorizontal: space(3),
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: t.line,
            color: t.text,
            fontFamily: font.medium,
            fontSize: 16,
          }}
        />
        {searching && <ActivityIndicator color={t.textFaint} />}
      </View>

      <GymMap
        ref={map}
        style={{ height: 220, borderRadius: radius.md, overflow: 'hidden' }}
        pin={pin}
        radius={GYM_RADIUS}
        camera={initial ? around(initial.lat, initial.lng) : undefined}
        showsUser
        onPress={(p) => drop(p.latitude, p.longitude)}
      />

      <Text variant="small" tone="faint">
        {note ??
          (pin
            ? 'Being inside the circle for 30 minutes counts as a workout.'
            : mapsAvailable
              ? 'Tap the map to drop a pin on your gym.'
              : 'Search for your gym’s address.')}
      </Text>

      {pin && (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What do you call it? (e.g. Iron Works)"
          placeholderTextColor={t.textFaint}
          style={{
            height: 44,
            paddingHorizontal: space(3),
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: t.line,
            color: t.text,
            fontFamily: font.medium,
            fontSize: 16,
          }}
        />
      )}

      <Button
        label="This is my gym"
        disabled={!pin || !name.trim()}
        onPress={() => pin && onPick({ name: name.trim().slice(0, 40), lat: pin.latitude, lng: pin.longitude, radius: GYM_RADIUS })}
      />
      {pin && (
        <Pressable onPress={() => setPin(null)} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text variant="small" tone="dim">
            Clear the pin
          </Text>
        </Pressable>
      )}
    </View>
  );
}
