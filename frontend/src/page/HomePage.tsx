import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';
import { BannerResponse } from '../api/bannerApi';
import { contentApi, HomepageProduct, HomepageSection } from '../api/contentApi';

interface HomePageProps {
  assets: Asset[];
  setCurrentScreen: (screen: any) => void;
  handleCategoryClick: (category: string) => void;
  handleViewAssetDetails: (asset: Asset) => void;
  handleAddToCart: (asset: Asset) => void;
  ownedProductIds: Set<string>;
  creatorOwnedProductIds: Set<string>;
}

type HeroSlide = {
  id: string;
  image: string;
  titleLines: string[];
  description: string;
  eyebrow: string;
  secondaryCta: string;
  accent: string;
  action: { type: 'screen'; screen: 'marketplace' | 'developer-onboarding' };
  imageAnimationClassName: string;
  imageClassName: string;
  overlayClassName: string;
  ambientClassName: string;
  contentClassName: string;
  copyAlignClassName: string;
  eyebrowClassName: string;
  titleClassName: string;
  titleAccentClassName: string;
  descriptionClassName: string;
  secondaryButtonClassName: string;
  controlsClassName: string;
  badgeClassName: string;
};

const HERO_ROTATION_MS = 5500;

const resolveNumberLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split('-')[0];
  if (normalized === 'en') return 'en-US';
  if (normalized === 'ja') return 'ja-JP';
  return 'vi-VN';
};

const getHomepageSectionTitle = (
  section: HomepageSection,
  t: (key: string) => string,
) => {
  if (section.sectionType === 'RECENT_RELEASES') {
    return t('home:sections.recentReleases');
  }

  if (section.sectionType === 'FREE_CONTENT') {
    return t('home:sections.freeContent');
  }

  return section.title;
};

interface HomepageSectionRowProps {
  section: HomepageSection;
  openProduct: (product: HomepageProduct) => void;
  setCurrentScreen: (screen: any) => void;
  t: any;
  numberLocale: string;
  creatorOwnedProductIds: Set<string>;
}

const HomepageSectionRow: React.FC<HomepageSectionRowProps> = ({
  section,
  openProduct,
  setCurrentScreen,
  t,
  numberLocale,
  creatorOwnedProductIds,
}) => {
  const [startIndex, setStartIndex] = React.useState(0);
  const itemsPerPage = 3;
  const products = section.products || [];

  const handlePrev = () => {
    setStartIndex((prev) => Math.max(0, prev - itemsPerPage));
  };

  const handleNext = () => {
    setStartIndex((prev) => {
      const nextIndex = prev + itemsPerPage;
      return nextIndex < products.length ? nextIndex : prev;
    });
  };

  const visibleProducts = products.slice(startIndex, startIndex + itemsPerPage);
  const hasPrev = startIndex > 0;
  const hasNext = startIndex + itemsPerPage < products.length;

  return (
    <section aria-labelledby={`home-section-${section.id}`} className="relative group/section">
      <div className="mb-5 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => setCurrentScreen('marketplace')}
          className="group flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 transition-colors hover:text-sky-500 dark:text-white dark:hover:text-sky-400 sm:text-3xl"
        >
          <span>{getHomepageSectionTitle(section, t)}</span>
          <ChevronRight size={24} className="text-slate-400 transition-colors group-hover:text-sky-500 dark:group-hover:text-sky-400" />
        </button>
      </div>

      <div className="relative px-2">
        {products.length > 0 ? (
          <>
            {/* Left navigation arrow */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`absolute -left-6 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-all duration-300 dark:border-slate-700/60 dark:bg-night-850/90 dark:text-white dark:shadow-[0_14px_32px_rgba(0,0,0,0.42)] ${
                hasPrev 
                  ? 'cursor-pointer opacity-100 hover:bg-white hover:text-slate-900 dark:hover:bg-white/20 dark:hover:text-white'
                  : 'opacity-0 pointer-events-none'
              }`}
              aria-label={t('home:sectionRow.previousPage')}
            >
              <ChevronLeft size={20} />
            </button>

            {/* Right navigation arrow */}
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className={`absolute -right-6 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-all duration-300 dark:border-slate-700/60 dark:bg-night-850/90 dark:text-white dark:shadow-[0_14px_32px_rgba(0,0,0,0.42)] ${
                hasNext 
                  ? 'cursor-pointer opacity-100 hover:bg-white hover:text-slate-900 dark:hover:bg-white/20 dark:hover:text-white'
                  : 'opacity-0 pointer-events-none'
              }`}
              aria-label={t('home:sectionRow.nextPage')}
            >
              <ChevronRight size={20} />
            </button>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => (
                <button 
                  key={`${section.id}-${product.itemType}-${product.id}`} 
                  type="button" 
                  onClick={() => openProduct(product)} 
                  className="launch-raised launch-interactive launch-media-card group/product w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white/92 text-left shadow-[0_14px_30px_rgba(148,163,184,0.14)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-[0_20px_40px_rgba(148,163,184,0.18)] dark:border-slate-700/45 dark:bg-night-850/88 dark:shadow-[0_18px_44px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.025)] dark:hover:border-slate-600/70 dark:hover:bg-night-800 dark:hover:shadow-[0_24px_54px_rgba(0,0,0,0.42)]"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-900">
                    {product.thumbnailUrl ? (
                      <img src={product.thumbnailUrl} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover/product:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">{t('home:sectionRow.noPreview')}</div>
                    )}
                    <span className="absolute top-2.5 left-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm border border-white/10">
                      {product.itemType === 'GAME'
                        ? t('home:sectionRow.badges.game')
                        : t('home:sectionRow.badges.asset')}
                    </span>
                    {creatorOwnedProductIds.has(product.id) && (
                      <span className="absolute right-2.5 top-2.5 rounded border border-sky-300/20 bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        {t('marketplace:card.owner')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 p-4.5">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900 transition-colors group-hover/product:text-sky-500 dark:text-white dark:group-hover/product:text-sky-400">{product.title}</h3>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{product.creatorName ?? product.categoryName ?? t('home:sectionRow.creatorFallback')}</p>
                    <p className="pt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {!product.price
                        ? t('marketplace:common.free')
                        : `${t('marketplace:common.from')} ₫${product.price.toLocaleString(numberLocale)}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700/45 dark:bg-night-900/72 dark:text-slate-400 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            {t('home:sectionRow.empty')}
          </div>
        )}
      </div>
    </section>
  );
};

export const HomePage: React.FC<HomePageProps> = ({
  assets,
  setCurrentScreen,
  handleCategoryClick,
  handleViewAssetDetails,
  handleAddToCart,
  ownedProductIds,
  creatorOwnedProductIds,
}) => {
  const { t, i18n } = useTranslation(['home', 'marketplace']);
  const numberLocale = resolveNumberLocale(i18n.resolvedLanguage || i18n.language);
  const animationDelayStyle = React.useCallback(
    (delayMs: number): React.CSSProperties => ({
      animationDelay: `${delayMs}ms`,
    }),
    []
  );
  const fallbackHeroSlides = React.useMemo<HeroSlide[]>(
    () => [
      {
        id: 'hero-game',
        image: '/home-hero/game.webp',
        titleLines: t('home:hero.slides.game.title').split('|').filter(Boolean),
        description: t('home:hero.slides.game.description'),
        eyebrow: t('home:hero.slides.game.eyebrow'),
        secondaryCta: t('home:hero.secondaryBecomeDeveloper'),
        accent: 'from-fuchsia-500/28 via-sky-400/16 to-transparent',
        action: { type: 'screen', screen: 'developer-onboarding' },
        imageAnimationClassName:
          '[animation:heroImageReveal_1800ms_cubic-bezier(0.16,1,0.3,1)_both,heroImageFloat_14s_ease-in-out_1900ms_infinite_alternate]',
        imageClassName:
          'object-cover object-center brightness-[1.02] saturate-[1.14] contrast-[1.05]',
        overlayClassName:
          'bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(2,6,23,0.62)_28%,rgba(39,8,67,0.22)_62%,rgba(2,6,23,0.08)_100%)]',
        ambientClassName:
          'bg-[radial-gradient(circle_at_67%_20%,rgba(125,211,252,0.24),transparent_18%),radial-gradient(circle_at_78%_72%,rgba(244,114,182,0.18),transparent_22%),radial-gradient(circle_at_26%_70%,rgba(96,165,250,0.12),transparent_26%)]',
        contentClassName: 'max-w-3xl text-left',
        copyAlignClassName: 'items-start text-left',
        eyebrowClassName:
          'border-cyan-300/24 bg-cyan-400/14 text-cyan-100 shadow-[0_14px_30px_rgba(34,211,238,0.12)]',
        titleClassName:
          'text-[clamp(2.35rem,4.5vw,3.9rem)] font-black leading-[0.98] tracking-[-0.04em] text-white drop-shadow-[0_14px_34px_rgba(15,23,42,0.58)]',
        titleAccentClassName:
          'bg-[linear-gradient(180deg,#fff6db_0%,#ffc94d_42%,#ff9138_100%)] bg-clip-text text-transparent [text-shadow:none]',
        descriptionClassName:
          'max-w-lg text-sm leading-6 text-white/88 sm:text-[15px] sm:leading-7',
        secondaryButtonClassName:
          'border-white/16 bg-white/8 text-white hover:bg-white/14',
        controlsClassName: 'justify-start',
        badgeClassName:
          'border-cyan-300/20 bg-cyan-400/12 text-cyan-50',
      },
      {
        id: 'hero-asset',
        image: '/home-hero/asset.jpg',
        titleLines: t('home:hero.slides.asset.title').split('|').filter(Boolean),
        description: t('home:hero.slides.asset.description'),
        eyebrow: t('home:hero.slides.asset.eyebrow'),
        secondaryCta: t('home:hero.secondaryBecomeDeveloper'),
        accent: 'from-amber-400/26 via-orange-500/16 to-transparent',
        action: { type: 'screen', screen: 'developer-onboarding' },
        imageAnimationClassName:
          '[animation:heroImageReveal_1550ms_cubic-bezier(0.16,1,0.3,1)_both]',
        imageClassName:
          'object-cover object-center brightness-[0.98] saturate-[1.02] contrast-[1.02]',
        overlayClassName:
          'bg-[linear-gradient(90deg,rgba(5,10,15,0.95)_0%,rgba(5,10,15,0.84)_26%,rgba(23,18,8,0.42)_54%,rgba(5,10,15,0.18)_100%)]',
        ambientClassName:
          'bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.12),transparent_18%),radial-gradient(circle_at_76%_18%,rgba(251,191,36,0.12),transparent_22%),radial-gradient(circle_at_80%_76%,rgba(249,115,22,0.08),transparent_24%)]',
        contentClassName: 'max-w-[32rem] text-left',
        copyAlignClassName: 'items-start text-left',
        eyebrowClassName:
          'border-amber-200/24 bg-amber-300/12 text-amber-50 shadow-[0_14px_30px_rgba(251,191,36,0.1)]',
        titleClassName:
          'text-[clamp(2.35rem,4.5vw,3.9rem)] font-black leading-[0.98] tracking-[-0.04em] text-white drop-shadow-[0_14px_34px_rgba(15,23,42,0.56)]',
        titleAccentClassName:
          'bg-[linear-gradient(180deg,#fff8de_0%,#ffd66b_46%,#f59e0b_100%)] bg-clip-text text-transparent [text-shadow:none]',
        descriptionClassName:
          'max-w-lg text-sm leading-6 text-white/84 sm:text-[15px] sm:leading-7',
        secondaryButtonClassName:
          'border-amber-100/16 bg-slate-950/28 text-white hover:bg-slate-950/42',
        controlsClassName: 'justify-start',
        badgeClassName:
          'border-amber-200/20 bg-amber-300/12 text-amber-50',
      },
      {
        id: 'hero-marketplace',
        image: '/home-hero/marketplace.jpg',
        titleLines: t('home:hero.slides.marketplace.title').split('|').filter(Boolean),
        description: t('home:hero.slides.marketplace.description'),
        eyebrow: t('home:hero.slides.marketplace.eyebrow'),
        secondaryCta: t('home:hero.secondaryBecomeDeveloper'),
        accent: 'from-lime-400/22 via-emerald-500/14 to-transparent',
        action: { type: 'screen', screen: 'developer-onboarding' },
        imageAnimationClassName:
          '[animation:heroImageReveal_1550ms_cubic-bezier(0.16,1,0.3,1)_both]',
        imageClassName:
          'object-cover object-center brightness-[0.96] saturate-[0.96] contrast-[1.01]',
        overlayClassName:
          'bg-[linear-gradient(90deg,rgba(4,13,14,0.95)_0%,rgba(4,13,14,0.84)_26%,rgba(17,28,18,0.4)_54%,rgba(4,13,14,0.14)_100%)]',
        ambientClassName:
          'bg-[radial-gradient(circle_at_18%_22%,rgba(255,244,201,0.1),transparent_16%),radial-gradient(circle_at_82%_24%,rgba(163,230,53,0.08),transparent_20%),radial-gradient(circle_at_72%_84%,rgba(250,204,21,0.06),transparent_24%)]',
        contentClassName: 'max-w-[32rem] text-left',
        copyAlignClassName: 'items-start text-left',
        eyebrowClassName:
          'border-lime-200/24 bg-lime-300/12 text-lime-50 shadow-[0_14px_30px_rgba(132,204,22,0.1)]',
        titleClassName:
          'text-[clamp(2.35rem,4.5vw,3.9rem)] font-black leading-[0.98] tracking-[-0.04em] text-white drop-shadow-[0_14px_34px_rgba(15,23,42,0.5)]',
        titleAccentClassName:
          'bg-[linear-gradient(180deg,#fefce8_0%,#d9f99d_46%,#84cc16_100%)] bg-clip-text text-transparent [text-shadow:none]',
        descriptionClassName:
          'max-w-lg text-sm leading-6 text-white/82 sm:text-[15px] sm:leading-7',
        secondaryButtonClassName:
          'border-white/14 bg-black/16 text-white hover:bg-black/24',
        controlsClassName: 'justify-start',
        badgeClassName:
          'border-lime-200/18 bg-lime-300/10 text-lime-50',
      },
    ],
    [t]
  );
  const [managedBanners, setManagedBanners] = React.useState<BannerResponse[]>([]);
  const [homepageSections, setHomepageSections] = React.useState<HomepageSection[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const loadBanners = async () => {
      try {
        const response = await contentApi.getHomepage();
        if (!cancelled && response.success && response.data) {
          if (response.data.banners?.length) setManagedBanners(response.data.banners);
          setHomepageSections(response.data.sections ?? []);
        }
      } catch (error) {
        console.warn('Unable to load managed homepage; using local fallback content.', error);
      }
    };
    loadBanners();
    return () => {
      cancelled = true;
    };
  }, []);

  const openProduct = React.useCallback((product: HomepageProduct) => {
    const existing = assets.find((asset) => asset.id === product.id);
    if (existing) {
      handleViewAssetDetails(existing);
      return;
    }
    handleViewAssetDetails({
      id: product.id,
      title: product.title,
      price: product.price ?? 0,
      rating: 0,
      reviewedCount: 0,
      author: product.creatorName ?? 'GodotLaunch Creator',
      authorAvatar: '',
      category: product.categoryName ?? (product.itemType === 'GAME' ? 'Game' : 'Asset'),
      description: product.description ?? '',
      image: product.thumbnailUrl ?? '',
      tag: product.tags[0] ?? product.itemType,
      tagList: product.tags,
      itemType: product.itemType === 'GAME' ? 'source_code' : 'asset',
    });
  }, [assets, handleViewAssetDetails]);

  const heroSlides = React.useMemo<HeroSlide[]>(() => {
    if (managedBanners.length === 0) return fallbackHeroSlides;

    return managedBanners.map((banner, index) => {
      const template = fallbackHeroSlides[index % fallbackHeroSlides.length];
      return {
        ...template,
        id: banner.id,
        image: banner.imageUrl,
        titleLines: banner.title.split('|').map((line) => line.trim()).filter(Boolean),
        description: banner.description,
        action: { type: 'screen', screen: 'marketplace' },
      };
    });
  }, [fallbackHeroSlides, managedBanners]);

  const [activeHeroSlide, setActiveHeroSlide] = React.useState(0);
  const [isHeroPaused, setIsHeroPaused] = React.useState(false);
  const currentHeroSlide = heroSlides[activeHeroSlide] ?? heroSlides[0];

  React.useEffect(() => {
    if (activeHeroSlide >= heroSlides.length) {
      setActiveHeroSlide(0);
    }
  }, [activeHeroSlide, heroSlides.length]);

  React.useEffect(() => {
    if (heroSlides.length <= 1 || isHeroPaused) {
      return undefined;
    }

    const rotation = window.setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(rotation);
  }, [heroSlides.length, isHeroPaused]);

  return (
    <div className="animate-fade-in">
      <div className="launch-hero-frame group relative isolate h-[clamp(400px,42vw,500px)] min-h-[400px] w-full overflow-hidden border-b border-slate-200/80 bg-slate-100 shadow-[0_20px_60px_rgba(148,163,184,0.18)] dark:border-slate-700/45 dark:bg-night-950 dark:shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              role="button"
              tabIndex={index === activeHeroSlide ? 0 : -1}
              aria-label={t('home:hero.openMarketplaceAria', {
                title: slide.titleLines.join(' '),
              })}
              onClick={() => setCurrentScreen('marketplace')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setCurrentScreen('marketplace');
                }
              }}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${index === activeHeroSlide ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <img
                referrerPolicy="no-referrer"
                src={slide.image}
                alt={slide.titleLines.join(' ')}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className={`h-full w-full ${slide.imageClassName} ${
                  index === activeHeroSlide
                    ? slide.imageAnimationClassName
                    : ''
                }`}
              />
              <div className={`absolute inset-0 ${slide.overlayClassName}`} />
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} opacity-60`} />
              <div className={`absolute inset-0 ${slide.ambientClassName}`} />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_82%_34%,rgba(255,255,255,0.22),transparent_30%),linear-gradient(270deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_18%,rgba(255,255,255,0.02)_36%,transparent_62%)] mix-blend-screen opacity-95" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 bg-gradient-to-t from-white/92 via-white/56 to-transparent dark:from-[#06090f]/94 dark:via-[#06090f]/48" />

        <div className="pointer-events-none relative z-10 flex h-full flex-col px-5 py-6 sm:px-9 sm:py-8 lg:px-14 lg:py-10">
          <div className="relative flex flex-1 items-center pb-8 pt-2 sm:pb-10">
            <div
              key={currentHeroSlide.id}
              className={`relative z-10 w-full space-y-4 ${currentHeroSlide.contentClassName}`}
            >
              <div className={`flex flex-col gap-4 ${currentHeroSlide.copyAlignClassName}`}>
                <div className={`space-y-4 ${currentHeroSlide.copyAlignClassName}`}>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md [animation:heroChipReveal_980ms_cubic-bezier(0.22,1,0.36,1)_both] ${currentHeroSlide.eyebrowClassName}`}
                    style={animationDelayStyle(80)}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                    {currentHeroSlide.eyebrow}
                  </span>
                  <h1
                    className={`max-w-4xl overflow-visible pb-2 [animation:heroTitleReveal_1380ms_cubic-bezier(0.22,1,0.36,1)_both] ${currentHeroSlide.titleClassName}`}
                    style={animationDelayStyle(160)}
                  >
                    {currentHeroSlide.titleLines.map((line, index) => (
                      <span
                        key={`${currentHeroSlide.id}-line-${index}`}
                        className={`block ${index === currentHeroSlide.titleLines.length - 1 ? currentHeroSlide.titleAccentClassName : ''} ${
                          index === currentHeroSlide.titleLines.length - 1 ? 'pb-0' : 'pb-[0.08em]'
                        }`}
                      >
                        {line}
                      </span>
                    ))}
                  </h1>
                  <p
                    className={`[animation:heroTextReveal_1120ms_cubic-bezier(0.22,1,0.36,1)_both] ${currentHeroSlide.descriptionClassName}`}
                    style={animationDelayStyle(420)}
                  >
                    {currentHeroSlide.description}
                  </p>
                  <span
                    className="pointer-events-none inline-flex items-center gap-2 rounded-xl border border-amber-200/45 bg-amber-300 px-4 py-2.5 font-display text-sm font-bold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_12px_30px_rgba(245,158,11,0.22)] [animation:heroButtonsReveal_1040ms_cubic-bezier(0.22,1,0.36,1)_both]"
                    style={animationDelayStyle(560)}
                  >
                    {t('home:hero.primaryCta')}
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center sm:bottom-6">
            <div className="inline-flex items-center gap-2.5">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={t('home:hero.slideAria', { index: index + 1 })}
                  onClick={() => setActiveHeroSlide(index)}
                  className="group/dot inline-flex h-3 items-center justify-center rounded-full py-1"
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ease-out ${
                      index === activeHeroSlide
                        ? 'h-2 w-6 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.35)]'
                        : 'h-2 w-2 bg-white/45 group-hover/dot:bg-white/70'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              aria-label={t('home:hero.previousSlide')}
              onClick={() =>
                setActiveHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
              }
              className="pointer-events-none absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-black/32 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-white/16 focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 sm:left-6"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label={t('home:hero.nextSlide')}
              onClick={() => setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length)}
              className="pointer-events-none absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-black/32 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-white/16 focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 sm:right-6"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <style>{`
          @keyframes heroChipReveal {
            0% {
              opacity: 0;
              transform: translate3d(0, 34px, 0) scale(0.985);
              filter: blur(12px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes heroTitleReveal {
            0% {
              opacity: 0;
              transform: translate3d(0, 48px, 0) scale(0.972);
              filter: blur(18px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes heroTextReveal {
            0% {
              opacity: 0;
              transform: translate3d(0, 30px, 0) scale(0.988);
              filter: blur(12px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes heroButtonsReveal {
            0% {
              opacity: 0;
              transform: translate3d(0, 34px, 0) scale(0.988);
              filter: blur(10px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes heroProgressFill {
            0% {
              transform: scaleX(0.08);
              transform-origin: left center;
              opacity: 0.8;
            }
            100% {
              transform: scaleX(1);
              transform-origin: left center;
              opacity: 1;
            }
          }

          @keyframes heroImageReveal {
            0% {
              opacity: 0;
              transform: scale(1.08) translate3d(0, 12px, 0);
              filter: brightness(0.86) saturate(0.94) contrast(1.02);
            }
            100% {
              opacity: 1;
              transform: scale(1) translate3d(0, 0, 0);
              filter: brightness(0.92) saturate(1.1) contrast(1.04);
            }
          }

          @keyframes heroImageRevealContained {
            0% {
              opacity: 0;
              transform: scale(0.985) translate3d(18px, 0, 0);
              filter: brightness(0.92) saturate(0.96) contrast(1.01);
            }
            100% {
              opacity: 1;
              transform: scale(1) translate3d(0, 0, 0);
              filter: brightness(1.06) saturate(1.04) contrast(1.02);
            }
          }

          @keyframes heroImageFloat {
            0% {
              transform: scale(1) translate3d(0, 0, 0);
            }
            100% {
              transform: scale(1.035) translate3d(1.2%, -1.4%, 0);
            }
          }
        `}</style>
      </div>
      <div className="mx-auto w-full max-w-[1480px] space-y-12 px-5 py-12 sm:px-8 lg:px-12">
        {homepageSections.map((section) => (
          <HomepageSectionRow
            key={section.id}
            section={section}
            openProduct={openProduct}
            setCurrentScreen={setCurrentScreen}
            t={t}
            numberLocale={numberLocale}
            creatorOwnedProductIds={creatorOwnedProductIds}
          />
        ))}
      </div>
    </div>
  );
};
