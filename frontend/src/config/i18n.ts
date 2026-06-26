import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locale files
import viCommon from '../locales/vi/common.json';
import viGame from '../locales/vi/game.json';
import viMarketplace from '../locales/vi/marketplace.json';
import viAuth from '../locales/vi/auth.json';
import viAdmin from '../locales/vi/admin.json';
import viPayment from '../locales/vi/payment.json';
import viWallet from '../locales/vi/wallet.json';

import enCommon from '../locales/en/common.json';
import enGame from '../locales/en/game.json';
import enMarketplace from '../locales/en/marketplace.json';
import enAuth from '../locales/en/auth.json';
import enAdmin from '../locales/en/admin.json';
import enPayment from '../locales/en/payment.json';
import enWallet from '../locales/en/wallet.json';

import jaCommon from '../locales/ja/common.json';
import jaGame from '../locales/ja/game.json';
import jaMarketplace from '../locales/ja/marketplace.json';
import jaAuth from '../locales/ja/auth.json';
import jaAdmin from '../locales/ja/admin.json';
import jaPayment from '../locales/ja/payment.json';
import jaWallet from '../locales/ja/wallet.json';

export const LANGUAGE_OPTIONS = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
] as const;

export type SupportedLanguage = (typeof LANGUAGE_OPTIONS)[number]['code'];

export const normalizeLanguageCode = (value?: string | null): SupportedLanguage => {
  const normalized = value?.trim().toLowerCase().split('-')[0];
  if (normalized === 'en' || normalized === 'ja' || normalized === 'vi') {
    return normalized;
  }
  return 'vi';
};

// Resource structure
const resources = {
  vi: {
    common: viCommon,
    game: viGame,
    marketplace: viMarketplace,
    auth: viAuth,
    admin: viAdmin,
    payment: viPayment,
    wallet: viWallet,
  },
  en: {
    common: enCommon,
    game: enGame,
    marketplace: enMarketplace,
    auth: enAuth,
    admin: enAdmin,
    payment: enPayment,
    wallet: enWallet,
  },
  ja: {
    common: jaCommon,
    game: jaGame,
    marketplace: jaMarketplace,
    auth: jaAuth,
    admin: jaAdmin,
    payment: jaPayment,
    wallet: jaWallet,
  },
};

// i18next configuration
i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    supportedLngs: LANGUAGE_OPTIONS.map((language) => language.code),
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common', 'game', 'marketplace', 'auth', 'admin', 'payment', 'wallet'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

i18next.on('languageChanged', (language) => {
  document.documentElement.lang = normalizeLanguageCode(language);
});

document.documentElement.lang = normalizeLanguageCode(i18next.resolvedLanguage);

export default i18next;
