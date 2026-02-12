import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synaptica.app',
  appName: 'Synaptica',
  webDir: 'out',
  server: {
    url: 'https://synaptica-appfin.vercel.app', // [MOD] Live Update Strategy
    cleartext: true
  },
  plugins: {
    // PushNotifications disabled until google-services.json is provided
  }
};

export default config;
