"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Language } from "@/lib/translations";
import { getCookie, setCookie } from '@/lib/utils';

interface LanguageStore {
  language: Language;
  setLanguage: (language: Language) => void;
  showLanguageToggle: boolean;
  setShowLanguageToggle: (show: boolean) => void;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set) => ({
      language: (getCookie('language') as Language) || 'en',
      setLanguage: (language) => {
        setCookie('language', language);
        set({ language });
      },
      showLanguageToggle: false,
      setShowLanguageToggle: (show) => set({ showLanguageToggle: show }),
    }),
    {
      name: "language-storage",
    }
  )
); 