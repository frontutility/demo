import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'connectnkt_language';

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? saved : 'hi'; // Default to Hindi
    }
    return 'hi';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (obj) => {
      if (typeof obj === 'string') return obj;
      if (!obj) return '';
      return obj[language] || obj.en || obj.hi || '';
    }
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
