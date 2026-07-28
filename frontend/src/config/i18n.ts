import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import flagJapan from "../../assets/flags/flag-japan.jpg";
import flagUnitedKingdom from "../../assets/flags/flag-united-kingdom.webp";
import flagVietnam from "../../assets/flags/flag-vietnam.jpg";

// Import locale files
import viCommon from "../locales/vi/common.json";
import viGame from "../locales/vi/game.json";
import viMarketplace from "../locales/vi/marketplace.json";
import viAuth from "../locales/vi/auth.json";
import viAdmin from "../locales/vi/admin.json";
import viPayment from "../locales/vi/payment.json";
import viWallet from "../locales/vi/wallet.json";
import viHome from "../locales/vi/home.json";
import viDashboard from "../locales/vi/dashboard.json";
import viDeveloper from "../locales/vi/developer.json";
import viUpload from "../locales/vi/upload.json";
import viProfile from "../locales/vi/profile.json";
import viPath from "../locales/vi/path.json";
import viShared from "../locales/vi/shared.json";

import enCommon from "../locales/en/common.json";
import enGame from "../locales/en/game.json";
import enMarketplace from "../locales/en/marketplace.json";
import enAuth from "../locales/en/auth.json";
import enAdmin from "../locales/en/admin.json";
import enPayment from "../locales/en/payment.json";
import enWallet from "../locales/en/wallet.json";
import enHome from "../locales/en/home.json";
import enDashboard from "../locales/en/dashboard.json";
import enDeveloper from "../locales/en/developer.json";
import enUpload from "../locales/en/upload.json";
import enProfile from "../locales/en/profile.json";
import enPath from "../locales/en/path.json";
import enShared from "../locales/en/shared.json";

import jaCommon from "../locales/ja/common.json";
import jaGame from "../locales/ja/game.json";
import jaMarketplace from "../locales/ja/marketplace.json";
import jaAuth from "../locales/ja/auth.json";
import jaAdmin from "../locales/ja/admin.json";
import jaPayment from "../locales/ja/payment.json";
import jaWallet from "../locales/ja/wallet.json";
import jaHome from "../locales/ja/home.json";
import jaDashboard from "../locales/ja/dashboard.json";
import jaDeveloper from "../locales/ja/developer.json";
import jaUpload from "../locales/ja/upload.json";
import jaProfile from "../locales/ja/profile.json";
import jaPath from "../locales/ja/path.json";
import jaShared from "../locales/ja/shared.json";

export const LANGUAGE_OPTIONS = [
  { code: "vi", name: "Tiếng Việt", flag: flagVietnam },
  { code: "en", name: "English", flag: flagUnitedKingdom },
  { code: "ja", name: "日本語", flag: flagJapan },
] as const;

export type SupportedLanguage = (typeof LANGUAGE_OPTIONS)[number]["code"];

export const normalizeLanguageCode = (
  value?: string | null,
): SupportedLanguage => {
  const normalized = value?.trim().toLowerCase().split("-")[0];
  if (normalized === "en" || normalized === "ja" || normalized === "vi") {
    return normalized;
  }
  return "vi";
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
    home: viHome,
    dashboard: viDashboard,
    developer: viDeveloper,
    upload: viUpload,
    profile: viProfile,
    path: viPath,
    shared: viShared,
  },
  en: {
    common: enCommon,
    game: enGame,
    marketplace: enMarketplace,
    auth: enAuth,
    admin: enAdmin,
    payment: enPayment,
    wallet: enWallet,
    home: enHome,
    dashboard: enDashboard,
    developer: enDeveloper,
    upload: enUpload,
    profile: enProfile,
    path: enPath,
    shared: enShared,
  },
  ja: {
    common: jaCommon,
    game: jaGame,
    marketplace: jaMarketplace,
    auth: jaAuth,
    admin: jaAdmin,
    payment: jaPayment,
    wallet: jaWallet,
    home: jaHome,
    dashboard: jaDashboard,
    developer: jaDeveloper,
    upload: jaUpload,
    profile: jaProfile,
    path: jaPath,
    shared: jaShared,
  },
};

// i18next configuration
i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi",
    supportedLngs: LANGUAGE_OPTIONS.map((language) => language.code),
    load: "languageOnly",
    defaultNS: "common",
    ns: [
      "common",
      "game",
      "marketplace",
      "auth",
      "admin",
      "payment",
      "wallet",
      "home",
      "dashboard",
      "developer",
      "upload",
      "profile",
      "path",
      "shared",
    ],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  });

i18next.on("languageChanged", (language) => {
  document.documentElement.lang = normalizeLanguageCode(language);
});

document.documentElement.lang = normalizeLanguageCode(i18next.resolvedLanguage);

export default i18next;
