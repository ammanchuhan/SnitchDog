/** The conversation, kept on the device.
 *
 * The server has its own copy — it needs the history to answer — but the app holds one too so
 * the screen opens instantly and reads back after a flight.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatTurn } from './api';

const KEY = 'snitchdog.chat.v1';
const KEEP = 100;

export const loadChat = async (): Promise<ChatTurn[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChatTurn[]) : [];
  } catch {
    return [];
  }
};

export const saveChat = (turns: ChatTurn[]) =>
  AsyncStorage.setItem(KEY, JSON.stringify(turns.slice(-KEEP))).catch(() => {});
