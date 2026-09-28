import { AppleMaps, type CameraPosition } from 'expo-maps';
import { forwardRef } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';

type Point = { latitude: number; longitude: number };

/** Apple Maps needs iOS 17 or later; below that the gym is picked by address search alone. */
export const mapsAvailable = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 17;

/** The gym on a map: a pin and its geofence circle. */
export const GymMap = forwardRef<AppleMaps.MapView, {
  pin: Point | null;
  radius: number;
  camera?: CameraPosition;
  showsUser?: boolean;
  onPress?: (p: Point) => void;
  style?: StyleProp<ViewStyle>;
}>(function GymMap({ pin, radius, camera, showsUser, onPress, style }, ref) {
  const t = useTheme();
  if (!mapsAvailable) return null;
  return (
    <AppleMaps.View
      ref={ref}
      style={style}
      cameraPosition={camera ?? (pin ? { coordinates: pin, zoom: 15 } : undefined)}
      markers={pin ? [{ id: 'gym', coordinates: pin }] : []}
      circles={pin ? [{ id: 'fence', center: pin, radius, color: 'rgba(232,85,47,0.15)', lineColor: t.ember, lineWidth: 2 }] : []}
      properties={{ isMyLocationEnabled: !!showsUser }}
      uiSettings={{ myLocationButtonEnabled: !!showsUser, compassEnabled: false }}
      onMapClick={onPress ? (e) => e.coordinates.latitude != null && onPress({ latitude: e.coordinates.latitude, longitude: e.coordinates.longitude! }) : undefined}
    />
  );
});
