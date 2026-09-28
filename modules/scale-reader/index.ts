import { requireOptionalNativeModule } from 'expo';

export type TextLine = { text: string; confidence: number; height: number };

type ScaleReaderModule = { recognize(uri: string): Promise<TextLine[]> };

/** Null in a build without the native module (Expo Go, Android). */
export default requireOptionalNativeModule<ScaleReaderModule>('ScaleReader');
