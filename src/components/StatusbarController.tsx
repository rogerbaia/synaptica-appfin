"use client";

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useSettings } from '@/context/SettingsContext';

export default function StatusbarController() {
    const { theme } = useSettings();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const updateStatusBar = async () => {
            try {
                // Determine if we are in dark mode
                const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = theme === 'dark' || (theme === 'auto' && isSystemDark);

                if (isDark) {
                    // Dark Mode: Background is dark, so we want LIGHT content (white icons)
                    await StatusBar.setStyle({ style: Style.Dark });
                    await StatusBar.setBackgroundColor({ color: '#111827' }); // Match bg-gray-900
                } else {
                    // Light Mode: Background is white, so we want DARK content (black icons)
                    await StatusBar.setStyle({ style: Style.Light });
                    await StatusBar.setBackgroundColor({ color: '#ffffff' });
                }
            } catch (error) {
                console.error("Error setting status bar style:", error);
            }
        };

        updateStatusBar();

        // Listen for system changes if auto
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => updateStatusBar();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

    }, [theme]);

    return null;
}
