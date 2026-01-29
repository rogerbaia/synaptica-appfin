"use client";

import { useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';

export default function NotificationInitializer() {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            // Only init if user is logged in
            notificationService.init();
        }
    }, [user]);

    return null;
}
