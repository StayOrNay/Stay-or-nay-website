import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'stayornay:language';

// Only English actually ships today — the rest are listed so the picker UI,
// storage, and routing are all in place ahead of real translations, instead
// of bolting a language switcher on later once it's harder to retrofit.
export const LANGUAGES = [
  { code: 'en', name: 'English', available: true },
  { code: 'id', name: 'Bahasa Indonesia', available: false },
  { code: 'fr', name: 'Français', available: false },
  { code: 'de', name: 'Deutsch', available: false },
  { code: 'es', name: 'Español', available: false },
];

const LanguageContext = createContext(null);

function loadInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {
    // ignore malformed storage
  }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = (code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    if (lang && lang.available) setLanguageState(code);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
