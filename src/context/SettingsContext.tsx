"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

import { COLOR_THEMES } from '@/config/themes';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';

type Theme = 'light' | 'dark' | 'auto';

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    colorTheme: string;
    setColorTheme: (themeId: string) => void;
    currency: string;
    setCurrency: (currency: string) => void;
    biometricEnabled: boolean;
    setBiometricEnabled: (enabled: boolean) => void;
    country: string;
    setCountry: (country: string) => void;
    // Tithe Settings
    titheEnabled: boolean;
    setTitheEnabled: (enabled: boolean) => void;
    titheConfig: TitheConfig;
    setTitheConfig: (config: TitheConfig) => void;
    permissions: { geo: boolean, mic: boolean, camera: boolean };
    setPermissions: (p: { geo: boolean, mic: boolean, camera: boolean }) => void;
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
}

export interface TitheConfig {
    percentage: number; // 10, 13, 15, or custom
    offeringType: 'percent' | 'fixed';
    offeringValue: number;
    investmentType: 'percent' | 'fixed';
    investmentValue: number;
    destination: string;
}

const DEFAULT_TITHE_CONFIG: TitheConfig = {
    percentage: 10,
    offeringType: 'percent',
    offeringValue: 0,
    investmentType: 'percent',
    investmentValue: 0,
    destination: ''
};

const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

// Simple auto-detect helper
const detectCountry = () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Mexico & LatAm (Common Timezones)
    if (
        tz.includes('Mexico') ||
        tz.includes('Monterrey') ||
        tz.includes('Tijuana') ||
        tz.includes('Merida') ||
        tz.includes('Cancun') ||
        tz.includes('Chihuahua') ||
        tz.includes('Mazatlan') ||
        tz.includes('Bahia_Banderas')
    ) return 'MX';

    if (tz.includes('Madrid') || tz.includes('Europe')) return 'ES';

    // South America
    if (tz.includes('Argentina') || tz.includes('Buenos_Aires')) return 'AR';
    if (tz.includes('Bogota')) return 'CO';
    if (tz.includes('Sao_Paulo') || tz.includes('Brazil')) return 'BR';
    if (tz.includes('Santiago')) return 'CL';
    if (tz.includes('Lima')) return 'PE';

    // US Specifics (Avoid broad 'America' check as it catches all LatAm)
    if (
        tz.includes('New_York') ||
        tz.includes('Los_Angeles') ||
        tz.includes('Chicago') ||
        tz.includes('Denver') ||
        tz.includes('Phoenix') ||
        tz.includes('Detroit')
    ) return 'US';

    return 'MX'; // Default Fallback to MX
};

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    // Basic Theme (Light/Dark)
    const [theme, setThemeState] = useState<Theme>('light');
    // Color Palette Theme
    const [colorTheme, setColorThemeState] = useState('zafiro_ejecutivo');

    const [currency, setCurrencyState] = useState('MX$');
    const [biometricEnabled, setBiometricEnabledState] = useState(false);
    const [country, setCountryState] = useState('MX');

    // [NEW] Auth for Sync
    const { user } = useAuth();

    // Tithe State
    const [titheEnabled, setTitheEnabledState] = useState(false);
    const [titheConfig, setTitheConfigState] = useState<TitheConfig>(DEFAULT_TITHE_CONFIG);

    // [MOVED] Permissions & API Key (Top-level State)
    const [permissions, setPermissionsState] = useState({
        geo: false,
        mic: true,
        camera: true
    });
    const [geminiApiKey, setGeminiApiKeyState] = useState('');

    useEffect(() => {
        // Load from localStorage
        const savedTheme = localStorage.getItem('synaptica_theme') as Theme;
        const savedColorTheme = localStorage.getItem('synaptica_color_theme');
        const savedCurrency = localStorage.getItem('synaptica_currency');
        const savedBio = localStorage.getItem('synaptica_bio') === 'true';
        const savedCountry = localStorage.getItem('synaptica_country');

        const savedTitheEnabled = localStorage.getItem('synaptica_tithe_enabled') === 'true';
        const savedTitheConfig = localStorage.getItem('synaptica_tithe_config');

        if (savedTheme) setThemeState(savedTheme);
        if (savedColorTheme && COLOR_THEMES.some(t => t.id === savedColorTheme)) {
            setColorThemeState(savedColorTheme);
        }
        if (savedCurrency) setCurrencyState(savedCurrency);

        if (savedCountry) {
            setCountryState(savedCountry);

            // FIX: Auto-correction for users stuck in 'US' while in Mexico
            const detected = detectCountry();
            if (savedCountry === 'US' && detected === 'MX') {
                console.log('Auto-correcting Country from US to MX based on TimeZone');
                setCountryState('MX');
                localStorage.setItem('synaptica_country', 'MX');
            }
        } else {
            // Auto-detect on first load if not saved
            const detected = detectCountry();
            setCountryState(detected);
            localStorage.setItem('synaptica_country', detected);
        }

        // Permissions
        const savedPerms = localStorage.getItem('synaptica_permissions');
        if (savedPerms) {
            try {
                setPermissionsState(JSON.parse(savedPerms));
            } catch (e) { console.error(e); }
        }

        // Gemini Key
        const savedKey = localStorage.getItem('synaptica_gemini_key');
        if (savedKey) setGeminiApiKeyState(savedKey);

        setBiometricEnabledState(savedBio);

        // Load Tithe
        setTitheEnabledState(savedTitheEnabled);
        if (savedTitheConfig) {
            try {
                setTitheConfigState(JSON.parse(savedTitheConfig));
            } catch (e) {
                console.error('Error parsing tithe config', e);
            }
        }
    }, []);

    // [NEW] Sync from Cloud on Mount (Force Refresh for Mobile)
    useEffect(() => {
        const fetchLatestMetadata = async () => {
            if (!user) return;

            try {
                // Force fetch from server to bypass stale session
                const meta = await supabaseService.getUserMetadata();
                if (!meta) return;

                console.log("☁️ Syncing Settings from Cloud...", meta);

                // 1. Sync Country/Currency
                if (meta.country) setCountryState(meta.country);
                if (meta.currency) setCurrencyState(meta.currency);

                // 2. Sync Tithe
                if (meta.tithe_enabled !== undefined) setTitheEnabledState(meta.tithe_enabled);
                if (meta.tithe_config) {
                    const config = typeof meta.tithe_config === 'string'
                        ? JSON.parse(meta.tithe_config)
                        : meta.tithe_config;
                    setTitheConfigState(config);
                }

                // 3. Sync Permissions
                if (meta.permissions) {
                    const perms = typeof meta.permissions === 'string'
                        ? JSON.parse(meta.permissions)
                        : meta.permissions;
                    setPermissionsState(perms);
                }

                // 4. Sync Gemini Key
                if (meta.gemini_api_key) {
                    setGeminiApiKeyState(meta.gemini_api_key);
                }

            } catch (error) {
                console.error("Error force-syncing metadata:", error);
            }
        };

        fetchLatestMetadata();
    }, [user]);

    useEffect(() => {
        // Apply Theme to DOM
        const root = window.document.documentElement;

        // 1. Light/Dark Mode
        root.classList.remove('light', 'dark');
        if (theme === 'auto') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(systemDark ? 'dark' : 'light');
        } else {
            root.classList.add(theme);
        }
        localStorage.setItem('synaptica_theme', theme);

        // 2. Color Theme
        root.setAttribute('data-color-theme', colorTheme);
        localStorage.setItem('synaptica_color_theme', colorTheme);

        // 3. Status Bar Color Sync (Dynamic Meta Tag)
        // This ensures status bar matches the app theme even if system theme differs
        const resolvedTheme = theme === 'auto'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;

        const metaColor = resolvedTheme === 'dark' ? '#111827' : '#ffffff';
        let metaThemeColor = document.querySelector("meta[name='theme-color']");

        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', metaColor);

    }, [theme, colorTheme]);

    const setTheme = (t: Theme) => setThemeState(t);
    const setColorTheme = (t: string) => setColorThemeState(t);

    const setCurrency = (c: string) => {
        setCurrencyState(c);
        localStorage.setItem('synaptica_currency', c);
        // Sync to Cloud
        supabaseService.updateUserMetadata({ currency: c }).catch(console.error);
    };

    const setBiometricEnabled = (b: boolean) => {
        setBiometricEnabledState(b);
        localStorage.setItem('synaptica_bio', String(b));
    }

    const setCountry = (c: string) => {
        setCountryState(c);
        localStorage.setItem('synaptica_country', c);
        // Sync to Cloud
        supabaseService.updateUserMetadata({ country: c }).catch(console.error);
    }

    const setTitheEnabled = (e: boolean) => {
        setTitheEnabledState(e);
        localStorage.setItem('synaptica_tithe_enabled', String(e));
        // Sync to Cloud
        supabaseService.updateUserMetadata({ tithe_enabled: e }).catch(console.error);
    }

    const setTitheConfig = (c: TitheConfig) => {
        setTitheConfigState(c);
        localStorage.setItem('synaptica_tithe_config', JSON.stringify(c));
        // Sync to Cloud
        supabaseService.updateUserMetadata({ tithe_config: c }).catch(console.error);
    }



    const setPermissions = (p: { geo: boolean, mic: boolean, camera: boolean }) => {
        setPermissionsState(p);
        localStorage.setItem('synaptica_permissions', JSON.stringify(p));
        // Sync to Cloud
        supabaseService.updateUserMetadata({ permissions: p }).catch(console.error);
    };

    const setGeminiApiKey = (key: string) => {
        const cleanKey = key.trim();
        setGeminiApiKeyState(cleanKey);
        localStorage.setItem('synaptica_gemini_key', cleanKey);
    };

    return (
        <SettingsContext.Provider value={{
            theme, setTheme,
            colorTheme, setColorTheme,
            currency, setCurrency,
            biometricEnabled, setBiometricEnabled,
            country, setCountry,
            titheEnabled, setTitheEnabled,
            titheConfig, setTitheConfig,
            permissions, setPermissions,
            geminiApiKey, setGeminiApiKey
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
