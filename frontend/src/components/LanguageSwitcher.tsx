import React from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
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
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

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

  const renderFlag = (flagSrc: string, languageName: string, className: string) => (
    <img
      src={flagSrc}
      alt={languageName}
      className={`w-6 rounded-[3px] object-cover ring-1 ring-black/10 ${className}`}
    />
  );

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
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-studio ${
                isActive
                  ? 'border-amber-400/45 bg-amber-400/15 text-amber-500'
                  : 'border-slate-200/80 bg-white/70 text-slate-600 hover:border-sky-500/35 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:text-white'
              } ${loadingLanguage ? 'cursor-not-allowed opacity-60' : ''}`}
              title={language.name}
            >
              {renderFlag(language.flag, language.name, 'h-4')}
              <span className="hidden sm:inline">{language.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        disabled={Boolean(loadingLanguage)}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-studio hover:border-white/20 hover:bg-white/[0.08] hover:text-white ${
          loadingLanguage ? 'cursor-not-allowed opacity-60' : ''
        }`}
        aria-label={t('language')}
        title={t('language')}
        aria-expanded={isOpen}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3.55 12h16.9M12 3.25c2.2 2.35 3.35 5.25 3.35 8.75S14.2 18.4 12 20.75M12 3.25C9.8 5.6 8.65 8.5 8.65 12S9.8 18.4 12 20.75"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="launch-overlay absolute right-0 z-50 mt-3 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white/98 p-2.5 shadow-[0_20px_45px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-night-800/98 dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <div className="space-y-0.5">
            {languages.map((language) => {
              const isActive = currentLanguage === language.code;
              const isLoading = loadingLanguage === language.code;

              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={Boolean(loadingLanguage)}
                  className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06] ${
                    isActive ? 'bg-sky-500/8 text-sky-700 dark:bg-sky-400/8 dark:text-sky-200' : ''
                  } ${
                    isLoading ? 'opacity-60' : ''
                  }`}
                >
                  <span className="flex-1">{language.name}</span>
                  {isActive && <Check size={19} strokeWidth={2.25} className="text-sky-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
