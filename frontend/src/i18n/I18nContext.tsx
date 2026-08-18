import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en, TranslationKey } from './en';
import { zh } from './zh';

export type Language = 'en' | 'zh';

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, zh };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('personalverse_language');
    return saved === 'zh' ? 'zh' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('personalverse_language', language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);

  const t = useCallback(
    (key: TranslationKey) => DICTIONARIES[language][key] ?? DICTIONARIES.en[key] ?? key,
    [language]
  );

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
