import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { platformSettingsApi } from '../api/platformSettingsApi';
import dragonImage from '../../assets/become-developer/dragon.webp';
import earthImage from '../../assets/become-developer/earth.webp';
import coinsImage from '../../assets/become-developer/eighty-eight.png';
import gearsImage from '../../assets/become-developer/Fab_Multi-Entine3.webp';

const DEFAULT_COMMISSION_RATE = 12;

interface BecomeDeveloperLandingProps {
  onGetStarted: () => void;
}

export const BecomeDeveloperLanding: React.FC<BecomeDeveloperLandingProps> = ({ onGetStarted }) => {
  const { t } = useTranslation(['developer']);
  const [commissionRate, setCommissionRate] = React.useState(DEFAULT_COMMISSION_RATE);

  React.useEffect(() => {
    let isCancelled = false;
    const loadCommissionRate = async () => {
      try {
        const res = await platformSettingsApi.getPublicSettings();
        if (!isCancelled && res.success && res.data) {
          setCommissionRate(Number(res.data.commissionRate));
        }
      } catch (err) {
        console.error('Failed to load public platform settings:', err);
      }
    };
    loadCommissionRate();
    return () => {
      isCancelled = true;
    };
  }, []);

  const revenueSharePercent = Math.max(0, 100 - commissionRate);

  const features = [
    {
      key: 'revenue',
      image: coinsImage,
      title: t('landing.revenue.title', { percent: revenueSharePercent }),
      description: t('landing.revenue.description', { commission: commissionRate }),
      imageAlign: 'left' as const,
    },
    {
      key: 'community',
      image: earthImage,
      title: t('landing.community.title'),
      description: t('landing.community.description'),
      imageAlign: 'right' as const,
    },
    {
      key: 'tools',
      image: gearsImage,
      title: t('landing.tools.title'),
      description: t('landing.tools.description'),
      imageAlign: 'left' as const,
    },
  ];

  return (
    <div className="developer-landing-canvas animate-fade-in">
      <section className="developer-landing-hero relative isolate w-full overflow-hidden">
        <div className="developer-landing-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-center gap-12 px-6 py-16 sm:px-10 lg:min-h-[620px] lg:flex-row lg:justify-between lg:gap-16 lg:px-16 lg:py-24">
          <div className="w-full max-w-[620px] text-center lg:text-left">
            <div className="mb-7 flex items-center justify-center gap-3 lg:justify-start" aria-hidden="true">
              <span className="h-px w-10 bg-sky-500/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.65)]" />
              <span className="h-px w-16 bg-slate-300 dark:bg-slate-700" />
            </div>

            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-[-0.045em] text-slate-950 dark:text-white sm:text-5xl lg:text-[3.65rem]">
              {t('landing.title')}
            </h1>

            <p className="mx-auto mt-6 max-w-[580px] text-base leading-7 text-slate-600 dark:text-slate-300 lg:mx-0 lg:text-lg lg:leading-8">
              {t('landing.description')}
            </p>

            <div className="mt-9 flex justify-center lg:justify-start">
              <Button variant="primary" size="lg" onClick={onGetStarted} className="min-w-48">
                {t('landing.ctaPrimary')}
              </Button>
            </div>
          </div>

          <div className="developer-hero-art relative w-full max-w-xl shrink-0 lg:max-w-[650px]" aria-hidden="true">
            <span className="absolute inset-[12%] rounded-full border border-sky-400/15" />
            <span className="absolute inset-[22%] rounded-full border border-amber-400/15" />
            <img
              src={dragonImage}
              alt=""
              className="relative h-auto w-full object-contain drop-shadow-[0_28px_54px_rgba(15,23,42,0.3)] dark:drop-shadow-[0_32px_64px_rgba(0,0,0,0.58)]"
            />
          </div>
        </div>
      </section>

      {features.map((feature, index) => (
        <section
          key={feature.key}
          className={`developer-feature-section relative w-full overflow-hidden ${index % 2 === 1 ? 'developer-feature-section-alt' : ''}`}
        >
          <div
            className={`relative z-10 mx-auto flex max-w-[1320px] flex-col items-center gap-12 px-6 py-16 sm:px-10 lg:min-h-[460px] lg:gap-20 lg:px-16 lg:py-20 ${
              feature.imageAlign === 'left' ? 'lg:flex-row' : 'lg:flex-row-reverse'
            }`}
          >
            <div className="developer-feature-media relative flex w-full max-w-md shrink-0 items-center justify-center overflow-hidden rounded-[28px] border p-8 sm:p-10 lg:max-w-lg">
              <span className="absolute left-5 top-4 font-mono text-[11px] font-semibold tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <img src={feature.image} alt="" className="relative h-auto max-h-[300px] w-full object-contain drop-shadow-[0_20px_34px_rgba(15,23,42,0.16)] dark:drop-shadow-[0_22px_38px_rgba(0,0,0,0.42)]" />
            </div>

            <div className="w-full max-w-xl text-center lg:text-left">
              <div className="mx-auto mb-5 h-px w-12 bg-sky-500/70 lg:mx-0" aria-hidden="true" />
              <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
                {feature.title}
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300 lg:text-base lg:leading-8">
                {feature.description}
              </p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
