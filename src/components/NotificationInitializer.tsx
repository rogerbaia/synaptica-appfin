"use client";

import { useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';

export default function NotificationInitializer() {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            // Only init if user is logged in
            try {
                notificationService.init().catch(err => console.error("Notification Init Failed:", err));
            } catch (e) {
                console.error("Critical Notification Error:", e);
            }
        }
    }, [user]);

    return null;
}
