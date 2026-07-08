import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Play, Pause, Star, ChevronRight, User, Clock, ArrowRight, Layers, BookOpen, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';
import { IMAGE_SEED_MAP } from '../../assets/images';

interface HomePageProps {
  assets: Asset[];
  setCurrentScreen: (screen: any) => void;
  handleCategoryClick: (category: string) => void;
  handleViewAssetDetails: (asset: Asset) => void;
  handleAddToCart: (asset: Asset) => void;
  ownedProductIds: Set<string>;
}

type HeroSlide = {
  id: string;
  image: string;
  titleLines: string[];
  description: string;
  eyebrow: string;
  secondaryCta: string;
  accent: string;
  action:
    | { type: 'screen'; screen: 'marketplace' | 'developer-onboarding' }
    | { type: 'category'; category: Asset['category'] };
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
  const animationDelayStyle = React.useCallback(
    (delayMs: number): React.CSSProperties => ({
      animationDelay: `${delayMs}ms`,
    }),
    []
  );
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
  const heroSlides = React.useMemo<HeroSlide[]>(
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
          'text-[clamp(2.75rem,6vw,4.9rem)] font-black leading-[0.95] tracking-[-0.045em] text-white drop-shadow-[0_18px_40px_rgba(15,23,42,0.6)]',
        titleAccentClassName:
          'bg-[linear-gradient(180deg,#fff6db_0%,#ffc94d_42%,#ff9138_100%)] bg-clip-text text-transparent [text-shadow:none]',
        descriptionClassName:
          'max-w-xl text-sm leading-7 text-white/88 sm:text-base',
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
          'text-[clamp(2.65rem,5.5vw,4.45rem)] font-black leading-[0.97] tracking-[-0.04em] text-white drop-shadow-[0_18px_40px_rgba(15,23,42,0.58)]',
        titleAccentClassName:
          'bg-[linear-gradient(180deg,#fff8de_0%,#ffd66b_46%,#f59e0b_100%)] bg-clip-text text-transparent [text-shadow:none]',
        descriptionClassName:
          'max-w-xl text-sm leading-7 text-white/84 sm:text-base',
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
          'text-[clamp(2.65rem,5.5vw,4.35rem)] font-black leading-[0.97] tracking-[-0.04em] text-white drop-shadow-[0_18px_40px_rgba(15,23,42,0.5)]',
        titleAccentClassName:
          'bg-[linear-gradient(180deg,#fefce8_0%,#d9f99d_46%,#84cc16_100%)] bg-clip-text text-transparent [text-shadow:none]',
        descriptionClassName:
          'max-w-xl text-sm leading-7 text-white/82 sm:text-base',
        secondaryButtonClassName:
          'border-white/14 bg-black/16 text-white hover:bg-black/24',
        controlsClassName: 'justify-start',
        badgeClassName:
          'border-lime-200/18 bg-lime-300/10 text-lime-50',
      },
    ],
    [t]
  );
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
    <div className="animate-fade-in">
      <div className="relative isolate min-h-[100svh] w-full overflow-hidden border-b border-slate-200/80 bg-[#0c0c0e] shadow-[0_20px_60px_rgba(15,23,42,0.28)] dark:border-slate-800/80">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${index === activeHeroSlide ? 'opacity-100' : 'opacity-0'}`}
            >
              <img
                referrerPolicy="no-referrer"
                src={slide.image}
                alt={slide.titleLines.join(' ')}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/62 to-transparent" />

        <div className="relative z-10 flex min-h-[100svh] flex-col justify-between px-4 py-6 sm:px-8 sm:py-8 lg:px-14 lg:py-10">
          <div className="flex items-start justify-between gap-4">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] backdrop-blur-md ${currentHeroSlide.badgeClassName}`}>
              <Sparkles size={12} className="text-amber-300" />
              {t('home:hero.badge')}
            </div>
          </div>

          <div className="relative flex flex-1 items-end pb-8 sm:pb-10 lg:pb-12">
            <div
              key={currentHeroSlide.id}
              className={`relative z-10 w-full space-y-5 pt-8 sm:pt-12 lg:pt-16 ${currentHeroSlide.contentClassName}`}
            >
              <div className={`flex flex-col gap-4 ${currentHeroSlide.copyAlignClassName}`}>
                <div className={`space-y-3 ${currentHeroSlide.copyAlignClassName}`}>
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
                </div>
              </div>

              <div
                className={`flex flex-col items-stretch gap-3 md:flex-row md:items-center [animation:heroButtonsReveal_980ms_cubic-bezier(0.22,1,0.36,1)_both] ${currentHeroSlide.copyAlignClassName}`}
                style={animationDelayStyle(760)}
              >
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Play size={15} className="fill-slate-900" />}
                  className="min-h-[3.45rem] px-7 text-sm font-black tracking-[0.03em] md:text-base"
                  onClick={() => setCurrentScreen('marketplace')}
                >
                  {t('home:hero.primaryCta')}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className={`min-h-[3.45rem] px-7 text-sm font-bold tracking-[0.03em] backdrop-blur-md ${currentHeroSlide.secondaryButtonClassName}`}
                  onClick={() => {
                    if (currentHeroSlide.action.type === 'category') {
                      handleCategoryClick(currentHeroSlide.action.category);
                      return;
                    }
                    setCurrentScreen(currentHeroSlide.action.screen);
                  }}
                >
                  {currentHeroSlide.secondaryCta}
                </Button>
              </div>

              {heroSlides.length > 1 && (
                <div
                  className={`flex [animation:heroButtonsReveal_980ms_cubic-bezier(0.22,1,0.36,1)_both] ${currentHeroSlide.controlsClassName}`}
                  style={animationDelayStyle(920)}
                >
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/26 px-4 py-3 pt-3 backdrop-blur-md">
                    {heroSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`Hero slide ${index + 1}`}
                        onClick={() => setActiveHeroSlide(index)}
                        className="inline-flex h-3 items-center justify-center rounded-full transition-all duration-300"
                      >
                        {index === activeHeroSlide ? (
                          <span className="relative block h-2.5 w-10 overflow-hidden rounded-full bg-white/20">
                            <span
                              key={`hero-progress-${activeHeroSlide}`}
                              className="absolute inset-y-0 left-0 block rounded-full bg-white [animation:heroProgressFill_linear_forwards]"
                              style={{
                                width: '100%',
                                animationDuration: `${HERO_ROTATION_MS}ms`,
                                animationPlayState: isHeroPaused ? 'paused' : 'running',
                              }}
                            />
                          </span>
                        ) : (
                          <span className="block h-2.5 w-2.5 rounded-full bg-white/35 transition-colors duration-300 hover:bg-white/55" />
                        )}
                      </button>
                    ))}

                    <button
                      type="button"
                      aria-label={isHeroPaused ? t('home:hero.playLabel') : t('home:hero.pauseLabel')}
                      title={isHeroPaused ? t('home:hero.playLabel') : t('home:hero.pauseLabel')}
                      onClick={() => setIsHeroPaused((prev) => !prev)}
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/16 text-white transition-studio hover:bg-white/24"
                    >
                      {isHeroPaused ? <Play size={17} className="fill-white" /> : <Pause size={17} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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

      <div className="w-full space-y-10 px-4 pb-10 sm:px-8 lg:px-14">
      <div className="space-y-2.5">
        <div className="bg-gradient-to-r from-white/92 via-white/84 to-sky-50/68 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-sky-950/18 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-xl px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.1)]">
          <div className="border-l-[3px] border-amber-400 pl-2.5">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white sm:text-[1.15rem]">{t('home:categories.title')}</h2>
            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t('home:categories.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
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
      <div className="space-y-2.5">
        <div className="bg-gradient-to-r from-white/92 via-white/84 to-sky-50/72 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-sky-950/20 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-xl px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.1)] flex items-center justify-between gap-3">
          <div className="border-l-[3px] border-sky-400 pl-2.5">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white sm:text-[1.15rem]">{t('home:trending.title')}</h2>
            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t('home:trending.subtitle')}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-3 py-2 text-xs"
            icon={<ArrowRight size={14} />} 
            iconPosition="right" 
            onClick={() => setCurrentScreen('marketplace')}
          >
            {t('home:common.viewAll')}
          </Button>
        </div>

        {/* Horizontal Slider Layout */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        
        {/* Noteworthy Assets Rows Column */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="bg-gradient-to-r from-white/92 via-white/84 to-emerald-50/68 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-emerald-950/18 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-xl px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.1)]">
            <div className="border-l-[3px] border-emerald-400 pl-2.5">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white sm:text-[1.1rem]">{t('home:noteworthy.title')}</h3>
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t('home:noteworthy.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-2.5">
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
        <div className="space-y-2.5">
          <div className="bg-gradient-to-r from-white/92 via-white/84 to-purple-50/68 dark:from-slate-900/84 dark:via-slate-900/76 dark:to-purple-950/18 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/55 rounded-xl px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.1)]">
            <div className="border-l-[3px] border-purple-400 pl-2.5">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white sm:text-[1.1rem]">{t('home:devLogs.title')}</h3>
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t('home:devLogs.subtitle')}</p>
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
    </div>
  );
};
