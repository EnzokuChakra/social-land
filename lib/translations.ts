import ro from './translations/ro.json';
import en from './translations/en.json';

export const translations = {
  ro,
  en,
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export function getTranslation(language: Language, key: string) {
  const keys = key.split(".");
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key; // Return the key if translation is not found
    }
  }
  
  return value as string;
} 