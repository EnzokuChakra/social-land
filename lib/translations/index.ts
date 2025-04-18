import ro from './ro.json';
import en from './en.json';

export type TranslationKey = keyof typeof ro;

const translations = {
  ro,
  en,
} as const;

export type Language = keyof typeof translations;

export const defaultLanguage: Language = 'ro';

export const getTranslation = (key: string, language: Language = 'ro'): string => {
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return the key if translation not found
    }
  }

  return value || key;
};

export const getAvailableLanguages = (): Language[] => {
  return Object.keys(translations) as Language[];
}; 