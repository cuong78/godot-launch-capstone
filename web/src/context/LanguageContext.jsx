import React, { createContext, useState, useCallback, useEffect } from 'react';
import { translations } from '../i18n/translations';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Lấy ngôn ngữ từ localStorage, mặc định là 'en'
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('appLanguage') || 'en';
    });

    // Lưu ngôn ngữ vào localStorage khi thay đổi
    const setLanguage = useCallback((lang) => {
        if (translations[lang]) {
            setLanguageState(lang);
            localStorage.setItem('appLanguage', lang);
        }
    }, []);

    // Hàm dịch: t('key') trả về chuỗi tương ứng
    const t = useCallback((key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    }, [language]);

    const value = {
        language,
        setLanguage,
        t,
        availableLanguages: ['en', 'vi', 'ja'],
        languageNames: {
            en: 'English',
            vi: 'Tiếng Việt',
            ja: '日本語'
        }
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};