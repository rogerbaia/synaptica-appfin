"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language, TranslationKey } from '@/lib/i18n/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('es-419');

    useEffect(() => {
        // Load from localStorage or browser default
        try {
            const saved = localStorage.getItem('synaptica_lang') as Language;
            if (saved && translations[saved]) {
                setLanguageState(saved);
                return;
            }
        } catch (e) {
            console.warn("Language persistence unavailable:", e);
        }

        // Fallback logic keeps running if try block fails or returns nothing
        // Simple detection
        const browserLang = navigator.language;
        if (browserLang.startsWith('pt')) setLanguageState('pt');
        else if (browserLang.startsWith('en')) setLanguageState('en');
        else if (browserLang === 'es-ES') setLanguageState('es-ES');
        else setLanguageState('es-419');
    }
    }, []);

const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('synaptica_lang', lang);
};

const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations['es-419'];
    // @ts-ignore - Key mismatch safety
    return dict[key] || translations['es-419'][key] || key;
};

return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
        {children}
    </LanguageContext.Provider>
);
};

export const useLanguage = () => useContext(LanguageContext);
