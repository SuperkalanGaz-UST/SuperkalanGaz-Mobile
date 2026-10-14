import type { ConfigContext, ExpoConfig } from 'expo/config';

// Delivery Rider invitation links intentionally remain website URLs. The app
// starts participating only after website acceptance, when the rider signs in
// to complete PH mobile verification.
export default ({ config }: ConfigContext): ExpoConfig => config as ExpoConfig;
