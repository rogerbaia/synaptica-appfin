"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

import { COLOR_THEMES } from '@/config/themes';

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

    // Tithe State
    const [titheEnabled, setTitheEnabledState] = useState(false);
    const [titheConfig, setTitheConfigState] = useState<TitheConfig>(DEFAULT_TITHE_CONFIG);

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

    }, [theme, colorTheme]);

    const setTheme = (t: Theme) => setThemeState(t);
    const setColorTheme = (t: string) => setColorThemeState(t);

    const setCurrency = (c: string) => {
        setCurrencyState(c);
        localStorage.setItem('synaptica_currency', c);
    };

    const setBiometricEnabled = (b: boolean) => {
        setBiometricEnabledState(b);
        localStorage.setItem('synaptica_bio', String(b));
    }

    const setCountry = (c: string) => {
        setCountryState(c);
        localStorage.setItem('synaptica_country', c);
    }

    const setTitheEnabled = (e: boolean) => {
        setTitheEnabledState(e);
        localStorage.setItem('synaptica_tithe_enabled', String(e));
    }

    const setTitheConfig = (c: TitheConfig) => {
        setTitheConfigState(c);
        localStorage.setItem('synaptica_tithe_config', JSON.stringify(c));
    }

    // Permissions
    const [permissions, setPermissionsState] = useState({
        geo: false,
        mic: true,
        camera: true
    });

    // API Keys
    const [geminiApiKey, setGeminiApiKeyState] = useState('');

    useEffect(() => {
        const savedPerms = localStorage.getItem('synaptica_permissions');
        const savedKey = localStorage.getItem('synaptica_gemini_key');

        if (savedPerms) {
            try {
                setPermissionsState(JSON.parse(savedPerms));
            } catch (e) { console.error(e); }
        }
        if (savedKey) setGeminiApiKeyState(savedKey);
    }, []);

    const setPermissions = (p: { geo: boolean, mic: boolean, camera: boolean }) => {
        setPermissionsState(p);
        localStorage.setItem('synaptica_permissions', JSON.stringify(p));
    };

    const setGeminiApiKey = (key: string) => {
        setGeminiApiKeyState(key);
        localStorage.setItem('synaptica_gemini_key', key);
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
