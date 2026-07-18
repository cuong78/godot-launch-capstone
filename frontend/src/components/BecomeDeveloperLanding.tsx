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
    <div className="animate-fade-in">
      {/* Hero section — full-bleed, không khung/border/bo góc, giống bản mẫu Fab */}
      <section className="relative isolate w-full overflow-hidden bg-[#0c0c0e]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_38%,rgba(251,191,36,0.14),transparent_32%),radial-gradient(circle_at_10%_85%,rgba(56,189,248,0.10),transparent_28%)]" />

        <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-center gap-12 px-6 py-16 sm:px-10 lg:min-h-[550px] lg:flex-row lg:items-center lg:justify-between lg:px-16 lg:py-20">
          <div className="w-full max-w-xl space-y-7 text-center lg:text-left">
            <h1 className="font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-[3.4rem]">
              {t('landing.title')}
            </h1>

            <p className="text-base leading-relaxed text-white/70 lg:text-lg">
              {t('landing.description')}
            </p>

            <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center lg:justify-start justify-center">
              <Button variant="primary" size="lg" onClick={onGetStarted}>
                {t('landing.ctaPrimary')}
              </Button>
            </div>
          </div>

          <div className="w-full max-w-lg shrink-0 lg:max-w-2xl">
            <img
              src={dragonImage}
              alt=""
              className="h-auto w-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      </section>

      {/* Feature sections — mỗi feature 1 section full-width riêng, ảnh/text
          xen kẽ trái-phải, nền tối liền mạch nối tiếp hero, giống bản mẫu Fab */}
      {features.map((feature) => (
        <section
          key={feature.key}
          className="relative w-full overflow-hidden border-t border-white/10 bg-[#0c0c0e]"
        >
          <div
            className={`relative z-10 mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-6 py-16 sm:px-10 lg:min-h-[420px] lg:px-16 lg:py-20 ${
              feature.imageAlign === 'left' ? 'lg:flex-row' : 'lg:flex-row-reverse'
            }`}
          >
            <div className="w-full max-w-md shrink-0 lg:max-w-lg">
              <img src={feature.image} alt="" className="h-auto w-full object-contain" />
            </div>

            <div className="w-full max-w-xl space-y-5 text-center lg:text-left">
              <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                {feature.title}
              </h2>
              <p className="text-sm leading-relaxed text-white/70 lg:text-base">
                {feature.description}
              </p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
