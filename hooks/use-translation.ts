"use client";

import { useLanguage } from "./use-language";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string) => {
    // For now, just return the key as we haven't set up translations yet
    return key.split(".").pop() || key;
  };

  return { t };
} 