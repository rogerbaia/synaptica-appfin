import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

export const notificationService = {
    async init() {
        if (!Capacitor.isNativePlatform()) {
            console.log("Push Notifications not supported on Web");
            return;
        }

        try {
            // 1. Check Permissions
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn("Push Notification permission denied");
                return;
            }

            // 2. Register
            await PushNotifications.register();

            // 3. Listeners
            this.addListeners();

        } catch (e) {
            console.error("Error initializing push notifications:", e);
        }
    },

    addListeners() {
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push Registration Success. Token:', token.value);
            await this.saveToken(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('Push Registration Error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push Received:', notification);
            // Optionally show a local toast/alert here if needed, 
            // but Capacitor handles system notifications automatically in background.
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push Action Performed:', notification);
            // Handle deep linking or specific actions here
        });
    },

    async saveToken(token: string) {
        // Save to Supabase 'profiles' or dedicated 'user_devices' table
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Upsert into user_devices (assuming table exists or we store in metadata)
        // For now, let's store in user metadata to keep it simple without SQL changes if possible,
        // BUT metadata has 4KB limit. Better to use a table.
        // If table doesn't exist, we fallback to log (User instruction mentioned adding credentials, not SQL).

        // Strategy: Try to update a 'fcm_token' column in 'users'/'profiles' if it exists, 
        // OR standard 'user_devices' if we had one. 
        // Given I cannot see the schema fully, I'll update User Metadata as a temporary compliant solution.
        // Ideally, we should have a `user_devices` table.

        console.log("Saving FCM Token to User Metadata...");
        await supabase.auth.updateUser({
            data: {
                fcm_token: token,
                last_device_registration: new Date().toISOString()
            }
        });

        // Also log to console for the user to see during debug
        console.log("FCM TOKEN SAVED:", token);
    }
};
