"use client";
import { ReactNode, createContext, useContext, useState } from "react";

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en-US",
  setLanguage: () => {}
});

export function LanguageContextProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(process.env.NEXT_DEFAULT_LANGUAGE || "en-US");

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useContextLanguage() {
  return useContext(LanguageContext);
}
