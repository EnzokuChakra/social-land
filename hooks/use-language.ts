"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Language } from "@/lib/translations";

interface LanguageStore {
  language: string;
  setLanguage: (language: string) => void;
  showLanguageToggle: boolean;
  setShowLanguageToggle: (show: boolean) => void;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => {
        // Set cookie for server-side language detection
        document.cookie = `language=${language};path=/;max-age=31536000`;
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