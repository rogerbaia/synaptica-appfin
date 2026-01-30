import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synaptica.app',
  appName: 'Synaptica',
  webDir: 'out',
  plugins: {
    // PushNotifications disabled until google-services.json is provided
  }
};

export default config;
