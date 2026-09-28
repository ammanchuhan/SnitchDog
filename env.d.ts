/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL of the SnitchDog server. Unset means the app runs standalone. */
    EXPO_PUBLIC_API_URL?: string;
    /** e.g. https://t.me/SnitchDogBot — where a witness invite points. */
    EXPO_PUBLIC_BOT_URL?: string;
  }
}
