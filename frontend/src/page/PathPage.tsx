import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Sparkles, Check } from 'lucide-react';
import { Button } from '../components/Button';

interface PathPageProps {
  setCurrentScreen: (screen: any) => void;
}

export const PathPage: React.FC<PathPageProps> = ({ setCurrentScreen }) => {
  const { t } = useTranslation(['path']);

  return (
    <div className="space-y-8 animate-fade-in py-4">
      
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="bg-sky-500/15 text-sky-500 text-xs uppercase font-bold py-1 px-3 rounded-full border border-sky-500/20 font-mono">
          {t('hero.badge')}
        </span>
        <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-white">{t('hero.title')}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          {t('hero.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Path Option A: Sell on Marketplace */}
        <div className="relative group bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-400 rounded-3xl overflow-hidden transition-all duration-300 p-6 flex flex-col justify-between space-y-8 shadow-sm">
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-amber-400/10 text-amber-500 border border-amber-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">{t('marketplace.badge')}</span>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white pt-1">
                {t('marketplace.title')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {t('marketplace.description')}
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                {t('marketplace.benefitDelivery')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                {t('marketplace.benefitOwnership')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-505/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                {t('marketplace.benefitReviews')}
              </li>
            </ul>
          </div>

          <Button
            variant="primary"
            className="w-full"
            size="md"
            onClick={() => setCurrentScreen('upload')}
          >
            {t('marketplace.cta')}
          </Button>
        </div>

        {/* Path Option B: Acquisition Grant Program */}
        <div className="relative group bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-505 rounded-3xl overflow-hidden transition-all duration-300 p-6 flex flex-col justify-between space-y-8 shadow-sm">
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest font-mono">{t('grant.badge')}</span>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white pt-1">
                {t('grant.title')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-355 leading-relaxed">
              {t('grant.description')}
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                {t('grant.benefitEvaluation')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                {t('grant.benefitPayout')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                {t('grant.benefitCredits')}
              </li>
            </ul>
          </div>

          <button
            onClick={() => alert(t('grant.alert'))}
            className="w-full py-3 px-4 bg-transparent border border-sky-500 hover:bg-sky-500 text-sky-500 hover:text-white font-display text-xs font-bold rounded-lg transition-studio text-center cursor-pointer"
          >
            {t('grant.cta')}
          </button>
        </div>

      </div>
    </div>
  );
};
