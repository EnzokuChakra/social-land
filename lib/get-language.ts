import { cookies } from "next/headers";

// Create a locales directory and add this file
// @/locales/index.ts
export async function getTranslations(lang: string) {
  // Implement your translations logic here
  return {};
}

export async function getLanguage() {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("NEXT_LOCALE");
  const lang = langCookie?.value || "en";
  const translations = await getTranslations(lang);
  return { lang, t: translations };
}

export async function getTranslationsObject() {
  const { t } = await getLanguage();
  return t;
}

export async function getServerTranslation(key: string) {
  const language = await getLanguage();
  const keys = key.split(".");
  let value: any = language.t;
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  
  return value as string;
} 