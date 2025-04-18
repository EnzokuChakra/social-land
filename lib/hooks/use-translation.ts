"use client";

import { useLanguage } from "@/lib/hooks/use-language";
import { getTranslation } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string) => {
    return getTranslation(key, language);
  };

  return { t };
} 