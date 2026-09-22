/** The photo behind each weigh-in.
 *
 * Camera only — never the photo library — so an old picture can't stand in for this morning.
 * Photos are kept in the app's own documents folder and never leave the phone: the witness is
 * told whether you weighed in, not what the scale said, and a photo of the scale says exactly
 * that. What's stored on the entry is the file name; the full path changes between installs.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const folder = () => new Directory(Paths.document, 'weigh-ins');

export const photoUri = (name: string) => new File(folder(), name).uri;

export type Capture = { ok: true; name: string } | { ok: false; reason: 'denied' | 'cancelled' | 'no-camera' };

export async function takeScalePhoto(date: string): Promise<Capture> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'denied' };

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.back,
      quality: 0.5, // enough to read a display; a year of mornings shouldn't fill the phone
    });
  } catch {
    // The iOS simulator has no camera. In development only, the library stands in so the flow
    // can be exercised; a real build never offers it.
    if (!__DEV__) return { ok: false, reason: 'no-camera' };
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
  }
  if (result.canceled || !result.assets[0]) return { ok: false, reason: 'cancelled' };

  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const name = `${date}-${Date.now()}.jpg`;
  await new File(result.assets[0].uri).copy(new File(dir, name));
  return { ok: true, name };
}

/** A retaken photo replaces the old one; the old file shouldn't linger. */
export function deletePhoto(name?: string) {
  if (!name) return;
  try {
    const f = new File(folder(), name);
    if (f.exists) f.delete();
  } catch {
    // Already gone. Nothing to do.
  }
}
