import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';

export interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

export type TranslationKey = keyof typeof translations.en;

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱', nativeName: 'עברית' },
];

export interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'user-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(LANGUAGES[0]);

  // Load saved language on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguageCode = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguageCode) {
          const language = LANGUAGES.find(lang => lang.code === savedLanguageCode);
          if (language) {
            setCurrentLanguage(language);
          }
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      }
    };

    loadSavedLanguage();
  }, []);

  const setLanguage = async (language: Language) => {
    console.log('Language changing to:', language.name);
    try {
      setCurrentLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language.code);
      console.log('Language changed successfully to:', language.name);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const translation = (translations[currentLanguage.code as keyof typeof translations] as any)?.[key];
    if (translation) {
      return translation;
    }

    // Fallback to English if translation not found
    const englishTranslation = translations.en[key];
    if (englishTranslation) {
      return englishTranslation;
    }

    // Final fallback
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
