/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL of the Accountable server. Unset means the app runs standalone. */
    EXPO_PUBLIC_API_URL?: string;
    /** e.g. https://t.me/accountable_bot — where a witness invite points. */
    EXPO_PUBLIC_BOT_URL?: string;
  }
}
