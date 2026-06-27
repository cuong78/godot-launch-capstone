import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { userApi } from '../api/userApi';
import { LANGUAGE_OPTIONS, normalizeLanguageCode, SupportedLanguage } from '../config/i18n';
import { useAuth } from './useAuth';

interface UseLanguageReturn {
  currentLanguage: SupportedLanguage;
  changeLanguage: (lang: string) => Promise<void>;
  t: ReturnType<typeof useTranslation>['t'];
  languages: typeof LANGUAGE_OPTIONS;
}

export const useLanguage = (): UseLanguageReturn => {
  const { i18n, t } = useTranslation();
  const { currentUser, updateUser } = useAuth();

  const changeLanguage = useCallback(
    async (lang: string) => {
      const nextLanguage = normalizeLanguageCode(lang);

      await i18n.changeLanguage(nextLanguage);
      localStorage.setItem('i18nextLng', nextLanguage);

      if (!currentUser) {
        return;
      }

      try {
        const response = await userApi.updateLanguagePreference(nextLanguage);
        updateUser({
          ...currentUser,
          preferredLanguage: normalizeLanguageCode(response.data?.preferredLanguage || nextLanguage),
        });
      } catch (error) {
        // Keep the UI language change locally even if backend persistence fails.
        updateUser({
          ...currentUser,
          preferredLanguage: nextLanguage,
        });
        console.warn('Failed to save language preference to backend:', error);
      }
    },
    [currentUser, i18n, updateUser]
  );

  return {
    currentLanguage: normalizeLanguageCode(i18n.resolvedLanguage || i18n.language),
    changeLanguage,
    t,
    languages: LANGUAGE_OPTIONS,
  };
};
