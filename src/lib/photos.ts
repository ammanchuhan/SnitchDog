/** Photos: the scale photo, which lives only as long as it takes to read it (LOG-3), and the
 *  weekly mirror photo, which lives only on this phone (MIR-2).
 *
 * Camera only, never the photo library, so an old picture can't stand in for this morning.
 */
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type Capture = { ok: true; uri: string } | { ok: false; reason: 'denied' | 'cancelled' | 'no-camera' };

export async function takePhoto(camera: 'back' | 'front' = 'back'): Promise<Capture> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'denied' };

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: camera === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      quality: 0.7,
    });
  } catch {
    // The iOS simulator has no camera. In development only, the library stands in so the flow
    // can be exercised; a real build never offers it.
    if (!__DEV__) return { ok: false, reason: 'no-camera' };
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  }
  if (result.canceled || !result.assets[0]) return { ok: false, reason: 'cancelled' };
  return { ok: true, uri: result.assets[0].uri };
}

/** Delete a photo file. Scale photos go the moment the number is read or the sheet closes. */
export function discardPhoto(uri?: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}
