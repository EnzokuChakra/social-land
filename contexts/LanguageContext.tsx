import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getTranslation } from '../lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: Language[];
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ro',
  setLanguage: () => {},
  availableLanguages: ['ro'],
  t: () => '',
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ro');
  const availableLanguages: Language[] = ['ro'];

  const t = (key: string) => getTranslation(key, language);

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    // Load language preference from localStorage
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage === 'ro') {
      setLanguage('ro');
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, availableLanguages, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 