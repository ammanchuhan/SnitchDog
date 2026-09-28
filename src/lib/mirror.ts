/** Mirror photos: one a week, kept only in this app's own storage on this phone (MIR-2). Never
 *  uploaded, never seen by Snitch or witnesses, never in an AI call. File name = the week's
 *  Monday, so a retake that week replaces it. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const folder = () => new Directory(Paths.document, 'mirror');
const NOTICE_KEY = 'snitchdog.mirror-notice-seen.v1';
const SAVE_KEY = 'snitchdog.mirror-save-to-photos.v1';

export type MirrorPhoto = { week: string; uri: string };

export function mirrorPhotos(): MirrorPhoto[] {
  const dir = folder();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((f): f is File => f instanceof File && /^\d{4}-\d{2}-\d{2}\.jpg$/.test(f.name))
    .map((f) => ({ week: f.name.slice(0, 10), uri: f.uri }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

export const hasMirrorPhoto = (week: string) => new File(folder(), `${week}.jpg`).exists;

/** Moves the camera's temporary file into the app's storage, and optionally copies it to the
 *  Photos library too (Q22: offered, off by default). */
export async function keepMirrorPhoto(tempUri: string, week: string, alsoToPhotos: boolean) {
  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, `${week}.jpg`);
  if (target.exists) target.delete();
  new File(tempUri).move(target);
  if (alsoToPhotos) {
    const { granted } = await MediaLibrary.requestPermissionsAsync(true);
    if (granted) await MediaLibrary.Asset.create(target.uri).catch(() => {});
  }
}

/** Signing out or deleting the account deletes them from the phone too (MIR-6). */
export function deleteMirrorPhotos() {
  const dir = folder();
  if (dir.exists) dir.delete();
}

export const noticeSeen = async () => (await AsyncStorage.getItem(NOTICE_KEY)) === '1';
export const markNoticeSeen = () => AsyncStorage.setItem(NOTICE_KEY, '1');
export const saveToPhotosPreference = async () => (await AsyncStorage.getItem(SAVE_KEY)) === '1';
export const setSaveToPhotosPreference = (on: boolean) => AsyncStorage.setItem(SAVE_KEY, on ? '1' : '0');
