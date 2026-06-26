import React from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'horizontal';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'dropdown',
}) => {
  const { t } = useTranslation('common');
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [loadingLanguage, setLoadingLanguage] = React.useState<string | null>(null);

  const currentSelection =
    languages.find((language) => language.code === currentLanguage) ?? languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    try {
      setLoadingLanguage(languageCode);
      await changeLanguage(languageCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setLoadingLanguage(null);
    }
  };

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {languages.map((language) => {
          const isActive = currentLanguage === language.code;

          return (
            <button
              key={language.code}
              type="button"
              onClick={() => handleLanguageChange(language.code)}
              disabled={Boolean(loadingLanguage)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-studio ${
                isActive
                  ? 'border-amber-400/45 bg-amber-400/15 text-amber-500'
                  : 'border-slate-200/80 bg-white/70 text-slate-600 hover:border-sky-500/35 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:text-white'
              } ${loadingLanguage ? 'cursor-not-allowed opacity-60' : ''}`}
              title={language.name}
            >
              <span>{language.flag}</span>
              <span className="hidden sm:inline">{language.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        disabled={Boolean(loadingLanguage)}
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200/80 bg-slate-100/80 px-3 py-2 text-xs font-semibold text-slate-700 transition-studio hover:border-amber-400/40 hover:text-slate-950 dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:text-white"
        aria-label={t('language')}
      >
        <Globe size={15} className="text-sky-500" />
        <span className="hidden 2xl:inline">{currentSelection.name}</span>
        <span className="2xl:hidden">{currentSelection.flag}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
            <div className="px-2 py-2 text-[10px] font-mono uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {t('language')}
            </div>

            <div className="space-y-1">
              {languages.map((language) => {
                const isActive = currentLanguage === language.code;
                const isLoading = loadingLanguage === language.code;

                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => handleLanguageChange(language.code)}
                    disabled={Boolean(loadingLanguage)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-studio ${
                      isActive
                        ? 'bg-amber-400/12 text-amber-600 dark:text-amber-400'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                    } ${isLoading ? 'opacity-60' : ''}`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="flex-1 font-medium">{language.name}</span>
                    {isActive && <Check size={16} className="text-amber-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close language menu"
          />
        </>
      )}
    </div>
  );
};
