import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Play, Star, ChevronRight, User, Clock, ArrowRight, Layers, BookOpen, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';
import { BANNER_HERO_IMAGE, IMAGE_SEED_MAP } from '../../assets/images';

interface HomePageProps {
  assets: Asset[];
  setCurrentScreen: (screen: any) => void;
  handleCategoryClick: (category: string) => void;
  handleViewAssetDetails: (asset: Asset) => void;
  handleAddToCart: (asset: Asset) => void;
  ownedProductIds: Set<string>;
}

const resolveLocale = (language: string) => {
  switch (language) {
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'vi':
    default:
      return 'vi-VN';
  }
};

export const HomePage: React.FC<HomePageProps> = ({
  assets,
  setCurrentScreen,
  handleCategoryClick,
  handleViewAssetDetails,
  handleAddToCart,
  ownedProductIds
}) => {
  const { t, i18n } = useTranslation(['home']);
  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language || 'vi');
  const formatPrice = React.useCallback(
    (price: number) =>
      price === 0
        ? t('home:common.free')
        : new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
          }).format(price),
    [locale, t]
  );
  const getCategoryLabel = React.useCallback(
    (category: Asset['category']) => t(`home:categories.labels.${category}`),
    [t]
  );
  const categoryCards = [
    {
      categoryValue: 'Scripts & Plugins' as const,
      name: t('home:categories.cards.scripts.name'),
      count: t('home:categories.cards.scripts.count'),
      icon: <Layers size={18} />,
      bg: IMAGE_SEED_MAP.drift,
      color: 'from-amber-500/20 to-amber-700/20',
    },
    {
      categoryValue: 'Shaders & VFX' as const,
      name: t('home:categories.cards.shaders.name'),
      count: t('home:categories.cards.shaders.count'),
      icon: <Sparkles size={18} />,
      bg: IMAGE_SEED_MAP.interior,
      color: 'from-sky-500/20 to-sky-700/20',
    },
    {
      categoryValue: '2D Assets' as const,
      name: t('home:categories.cards.twoD.name'),
      count: t('home:categories.cards.twoD.count'),
      icon: <Plus size={18} />,
      bg: IMAGE_SEED_MAP.forest,
      color: 'from-emerald-500/20 to-emerald-700/20',
    },
    {
      categoryValue: 'Audio & SFX' as const,
      name: t('home:categories.cards.audio.name'),
      count: t('home:categories.cards.audio.count'),
      icon: <BookOpen size={18} />,
      bg: IMAGE_SEED_MAP.char,
      color: 'from-purple-500/20 to-purple-700/20',
    },
  ];

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Grand Hero Promo Module */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xl">
        <div className="absolute inset-0 z-0">
          <img 
            referrerPolicy="no-referrer" 
            src={BANNER_HERO_IMAGE} 
            alt={t('home:hero.imageAlt')}
            className="w-full h-full object-cover opacity-95 brightness-[1.08] saturate-[1.08] dark:opacity-72 dark:brightness-[1.18] dark:saturate-[1.12]" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/96 via-white/82 to-white/10 dark:from-slate-950/62 dark:via-slate-950/34 dark:to-slate-950/10"></div>
          <div className="absolute inset-y-0 left-0 w-[58%] bg-[radial-gradient(circle_at_left_center,rgba(255,255,255,0.9),rgba(255,255,255,0.42),transparent_72%)] dark:bg-[radial-gradient(circle_at_left_center,rgba(248,250,252,0.24),rgba(15,23,42,0.06),transparent_72%)]"></div>
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-amber-300/28 blur-3xl dark:bg-amber-300/16"></div>
          <div className="absolute right-16 top-8 h-40 w-40 rounded-full bg-sky-300/24 blur-3xl dark:bg-sky-300/14"></div>
        </div>

        <div className="relative z-10 px-6 sm:px-12 py-16 sm:py-20 md:max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-900 shadow-[0_6px_18px_rgba(251,191,36,0.28)]">
            <Sparkles size={12} /> {t('home:hero.badge')}
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-5xl text-slate-950 dark:text-white tracking-tight leading-tight [text-shadow:0_10px_30px_rgba(255,255,255,0.2)] dark:[text-shadow:0_10px_30px_rgba(15,23,42,0.35)]">
            {t('home:hero.title')}
          </h1>
          <p className="max-w-xl text-sm sm:text-base text-slate-700 dark:text-slate-100/88 leading-relaxed">
            {t('home:hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              icon={<Play size={15} className="fill-slate-900" />}
              onClick={() => setCurrentScreen('marketplace')}
            >
              {t('home:hero.primaryCta')}
            </Button>
            <Button
              variant="outline"
              size="md"
              className="bg-white/72 dark:bg-slate-950/18 backdrop-blur-sm border-white/70 dark:border-white/14 text-slate-800 dark:text-white hover:bg-white/88 dark:hover:bg-slate-900/32"
              onClick={() => setCurrentScreen('path')}
            >
              {t('home:hero.secondaryCta')}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-white/92 via-white/84 to-sky-50/68 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-sky-950/18 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-2xl p-4 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
          <div className="border-l-4 border-amber-400 pl-3">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">{t('home:categories.title')}</h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{t('home:categories.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoryCards.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => handleCategoryClick(cat.categoryValue)}
              className="group relative h-32 rounded-2xl overflow-hidden border border-white/70 dark:border-slate-700/70 cursor-pointer hover:border-amber-400 dark:hover:border-amber-400 transition-studio shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_30px_rgba(251,191,36,0.12)] active:scale-98"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/78 via-slate-900/26 to-white/8 z-10"></div>
              <img 
                referrerPolicy="no-referrer" 
                src={cat.bg} 
                alt={cat.name} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-100 brightness-[1.08] saturate-[1.08] dark:opacity-78 dark:brightness-[1.15]" 
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} z-0 opacity-60`}></div>
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/22 to-transparent z-10"></div>

              <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col justify-end text-white">
                <div className="text-amber-300 mb-1 drop-shadow-[0_4px_10px_rgba(251,191,36,0.35)]">{cat.icon}</div>
                <span className="font-display font-bold text-xs sm:text-sm truncate">{cat.name}</span>
                <span className="text-[10px] text-slate-200 font-mono">{cat.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Indie Gems Carousel Deck */}
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-white/92 via-white/84 to-sky-50/72 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-sky-950/20 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-2xl p-4 shadow-[0_12px_30px_rgba(148,163,184,0.12)] flex items-center justify-between">
          <div className="border-l-4 border-sky-400 pl-3">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">{t('home:trending.title')}</h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{t('home:trending.subtitle')}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<ArrowRight size={14} />} 
            iconPosition="right" 
            onClick={() => setCurrentScreen('marketplace')}
          >
            {t('home:common.viewAll')}
          </Button>
        </div>

        {/* Horizontal Slider Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.slice(0, 3).map(asset => (
            <div
              key={asset.id}
              onClick={() => handleViewAssetDetails(asset)}
              className="bg-white/96 dark:bg-slate-900/84 border border-slate-200/80 dark:border-slate-800/72 rounded-2xl overflow-hidden hover:shadow-[0_20px_38px_rgba(15,23,42,0.12)] hover:border-amber-400/55 dark:hover:border-amber-400/50 transition-studio cursor-pointer flex flex-col"
            >
              <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-950">
                <img 
                  referrerPolicy="no-referrer" 
                  src={asset.image} 
                  alt={asset.title} 
                  className="w-full h-full object-cover brightness-[1.05] saturate-[1.06] hover:scale-102 transition-transform duration-300" 
                />
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/18 to-transparent"></div>
                {asset.isBestseller && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase">
                    {t('home:common.bestSeller')}
                  </span>
                )}
                <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-white/88 dark:bg-slate-950/82 backdrop-blur-sm text-amber-600 dark:text-amber-400 text-xs font-mono font-bold border border-white/70 dark:border-slate-800 shadow-sm">
                  {formatPrice(asset.price)}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-sky-500 font-bold uppercase">{getCategoryLabel(asset.category)}</span>
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white truncate" title={asset.title}>
                    {asset.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {asset.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={13} className="fill-amber-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{asset.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">({asset.reviewedCount})</span>
                  </div>
                  {ownedProductIds.has(asset.id) ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                      Đã sở hữu
                    </span>
                  ) : (
                    <Button
                      variant="secondary-flat"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(asset);
                      }}
                    >
                      {t('home:common.quickBuy')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New & Noteworthy Section row layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Noteworthy Assets Rows Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-r from-white/92 via-white/84 to-emerald-50/68 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-emerald-950/18 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-2xl p-4 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
            <div className="border-l-4 border-emerald-400 pl-3">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{t('home:noteworthy.title')}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{t('home:noteworthy.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {assets.slice(3, 7).map(item => (
              <div
                key={item.id}
                onClick={() => handleViewAssetDetails(item)}
                className="group bg-white/96 dark:bg-slate-900/84 border border-slate-200/80 dark:border-slate-800/70 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900/92 transition-studio cursor-pointer flex items-center justify-between gap-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_30px_rgba(15,23,42,0.1)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    referrerPolicy="no-referrer" 
                    src={item.image} 
                    alt={item.title} 
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-800 brightness-[1.04]" 
                  />
                  <div className="min-w-0">
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-slate-800 dark:text-white truncate group-hover:text-amber-500 dark:group-hover:text-amber-400">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 mt-1">
                      <span className="font-bold text-sky-500">{getCategoryLabel(item.category)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-500 text-amber-500" /> {item.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950/86 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-md border border-slate-200/70 dark:border-slate-800/60 shadow-sm">
                    {formatPrice(item.price)}
                  </span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Logs / Blog Card list inside bento row */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-white/92 via-white/84 to-purple-50/68 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-purple-950/18 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-2xl p-4 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
            <div className="border-l-4 border-purple-400 pl-3">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{t('home:devLogs.title')}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{t('home:devLogs.subtitle')}</p>
            </div>
          </div>

          <div className="bg-white/96 dark:bg-slate-900/84 border border-slate-200/80 dark:border-slate-800/72 rounded-2xl overflow-hidden shadow-[0_12px_28px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-studio">
            <img 
              referrerPolicy="no-referrer" 
              src={IMAGE_SEED_MAP.dev2} 
              alt={t('home:devLogs.imageAlt')}
              className="w-full h-32 object-cover brightness-[1.08] saturate-[1.06]" 
            />
            <div className="p-4 space-y-3.5">
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">{t('home:devLogs.tag')}</span>
              <h4 className="font-display font-bold text-sm text-slate-800 dark:text-white hover:text-amber-400 cursor-pointer">
                {t('home:devLogs.articleTitle')}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('home:devLogs.articleDescription')}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1"><User size={10} /> {t('home:devLogs.author')}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {t('home:common.minutesRead', { count: 8 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
