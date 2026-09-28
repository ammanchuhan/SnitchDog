import { requireOptionalNativeModule } from 'expo';

export type DaySteps = { date: string; steps: number };

type HealthStepsModule = {
  isAvailable(): boolean;
  requestAccess(): Promise<boolean>;
  dailySteps(days: number): Promise<DaySteps[]>;
};

/** Null in a build without the native module (Expo Go, Android). */
export default requireOptionalNativeModule<HealthStepsModule>('HealthSteps');
