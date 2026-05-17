import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

export default function Discover() {
  const { t } = useLanguage();

  return (
    <section>
      <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
        <h2 className="font-headline-lg text-headline-md text-white">{t('discover')}</h2>
        <div className="h-px bg-gradient-to-r from-surface-tint/50 to-transparent flex-grow"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter auto-rows-[280px]">
        {/* Trending Now (Large Card) */}
        <Link to="/product/neon-drifter" className="md:col-span-8 row-span-2 group relative rounded-xl overflow-hidden glass-panel border border-white/10 hover:border-surface-tint transition-colors duration-500 hover:shadow-[0_0_25px_rgba(0,242,255,0.2)] block cursor-pointer">
          <img alt="Cyber Bloom" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsYW625_-kYGIOqeFW_iPO4zTzU4I3EAkxlxGQ8AEibfQyWCat2z0hU2FBTEk5Q5os6Q2luvBTmjWy45UQZCksVqCevKrRg8352FXXt5AOXw_-zua8GHqfKrbB--pDe3hQFoDetFQbYEwNOtRpAuRBzibt13SvpAozr7ONNU8kP_dIRHyZ9o67WMrupDe-vF8EtGg_-NJFN1cZgaygpqpQoZJQPUMeLwGLbzJMcuDCzmXEqiWR8UzXBHi-xBz8QRnCR2LwUVuvYDBF" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-transparent"></div>
          <div className="absolute top-4 right-4 bg-surface-container-highest/80 backdrop-blur px-3 py-1 rounded font-label-sm text-label-sm text-surface-tint border border-surface-tint/30 flex items-center gap-1 shadow-[0_0_10px_rgba(0,242,255,0.2)]">
            <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
            {t('trendingNow')}
          </div>
          <div className="absolute bottom-0 left-0 w-full p-6">
            <div className="flex gap-2 mb-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface/80 px-2 py-0.5 border border-white/10 rounded">{t('actionRacingGenre')}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface/80 px-2 py-0.5 border border-white/10 rounded">{t('multiplayerGenre')}</span>
            </div>
            <h3 className="font-headline-md text-headline-lg-mobile text-white mb-2">{t('cyberBloomTitle')}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md hidden md:block">{t('cyberBloomDescription')}</p>
          </div>
        </Link>
        {/* New Release 1 (Small Card) */}
        <Link to="/product/student-quest" className="md:col-span-4 row-span-1 group relative rounded-xl overflow-hidden glass-panel border border-white/10 hover:border-secondary transition-colors duration-500 hover:shadow-[0_0_20px_rgba(209,188,255,0.2)] bg-surface-container-low block cursor-pointer">
          <img alt="Student Quest" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-all duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGSTmdKVD8x-sX6SV8dVZvUaJocOtHq_zHG8i35o3FPWY_HLxgkFef_0HfMTJgmchlmYmHHamVleqqsYlT0VrQNhz0jeaoxEc586i7aBpVURplL8p6kmsLl-pzOEVlonfzirjP7l6RrA6ro3jQfbkJ1LyR3Hx6n_CCWoJbxsB9AN_4Gv0kMIFEs3W8-KdbQqWXgdZ4bmcHfE-qrDilzHmXFQCUzOzzFLmvu9YDXzhQkCmEpMo-Mfe58AYT7S1G0puOfNgTstKmODsn" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent"></div>
          <div className="absolute top-4 left-4 font-label-sm text-label-sm text-secondary bg-surface-container-highest/80 backdrop-blur px-2 py-1 rounded border border-secondary/30">
            {t('newRelease')}
          </div>
          <div className="absolute bottom-0 left-0 w-full p-4">
            <h3 className="font-headline-md text-headline-md text-white mb-1">{t('studentQuestTitle')}</h3>
            <div className="flex justify-between items-center">
              <span className="font-body-md text-body-md text-on-surface-variant">{t('earlyAccess')}</span>
              <span className="font-label-sm text-label-sm text-surface-tint">$9.99</span>
            </div>
          </div>
        </Link>
        {/* Top Rated (Small Card) */}
        <Link to="/product/void-protocol" className="md:col-span-4 row-span-1 group relative rounded-xl overflow-hidden glass-panel border border-white/10 hover:border-surface-tint transition-colors duration-500 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] bg-surface-container-low block cursor-pointer">
          <img alt="Void Protocol" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-all duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9zbZtPP21KviTY1bLBjP_wwbpX7B5D0eDLybU0jcg6gaVIOhEHozug16y-zhl0mQc-6S0AcCMU0cD_vzDLXBMcK5j9CDXspgM3y2S2RvyD2gC96c9beIPyRI_X7KPSixsVRwpvHVAJTfNPegkZOzGApNo6wGNJy9u7UNT3hzH-lwLFSlPuBpgZuFcZoNx8-yoiEnJhSTHMltDqQOO6d-6rBFE2IWHM6vWeh0o7FyW9QAbkwq1wXFQAoNWWB2Chv2kgIJtRfydyKiL" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent"></div>
          <div className="absolute top-4 right-4 flex items-center gap-1 text-surface-tint">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="font-label-sm text-label-sm font-bold">4.9</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full p-4">
            <h3 className="font-headline-md text-headline-md text-white mb-1">{t('voidProtocolTitle')}</h3>
            <div className="flex justify-between items-center">
              <span className="font-body-md text-body-md text-on-surface-variant">{t('puzzleStealthGenre')}</span>
              <span className="font-label-sm text-label-sm text-surface-tint">{t('free')}</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
