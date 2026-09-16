"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Language, t as translate, TranslationKey } from "./translations";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Load language from cookie/localStorage on mount
  useEffect(() => {
    const cookieLang = document.cookie
      .split("; ")
      .find((row) => row.startsWith("language="))
      ?.split("=")[1] as Language | undefined;

    const storedLang = localStorage.getItem("language") as Language | null;

    const initial = cookieLang || storedLang || "en";
    setLangState(initial);
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("language", newLang);
    document.cookie = `language=${newLang}; path=/; max-age=31536000`;
  };

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
    return translate(key, lang, vars);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{ lang: "en", setLang, t: (k, v) => translate(k, "en", v) }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
