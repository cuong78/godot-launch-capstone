import React from 'react';
import { User, AtSign } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleRegister = (e) => {
    e.preventDefault();
    // Redirect to login or home after registering
    navigate('/login');
  };

  return (
    <main className="flex-grow flex items-center justify-center relative px-margin-mobile min-h-screen pt-24 pb-12">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-[520px] rounded-lg border border-white/10 p-10 flex flex-col gap-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden z-10">
        {/* Decorative scanline effect */}
        <div className="absolute inset-0 scanline pointer-events-none opacity-20"></div>

        {/* Title Section */}
        <div className="relative z-20 space-y-2 text-center">
          <h1 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
            {t('register')}
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-[0.2em]">
            {t('registerDeveloperSubtitle')}
          </p>
        </div>

        {/* Registration Form */}
        <form className="relative z-20 flex flex-col gap-5" onSubmit={handleRegister}>
          <div className="space-y-1.5 group">
            <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
              {t('username')}
            </label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              <User className="w-5 h-5 text-outline-variant mx-3 group-focus-within:text-primary-container transition-colors" />
              <input
                type="text"
                placeholder={t('usernamePlaceholder')}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 placeholder:text-outline-variant/40"
              />
            </div>
          </div>

          <div className="space-y-1.5 group">
            <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
              {t('email')}
            </label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              <AtSign className="w-5 h-5 text-outline-variant mx-3 group-focus-within:text-primary-container transition-colors" />
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 placeholder:text-outline-variant/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 group">
              <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
                {t('password')}
              </label>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <input
                  type="password"
                  placeholder="********"
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 px-4 placeholder:text-outline-variant/40"
                />
              </div>
            </div>
            <div className="space-y-1.5 group">
              <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
                {t('confirm')}
              </label>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <input
                  type="password"
                  placeholder="********"
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 px-4 placeholder:text-outline-variant/40"
                />
              </div>
            </div>
          </div>

          {/* Developer Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-container/50 border border-outline-variant/20 rounded-lg mt-2">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-primary-fixed">
                {t('registerAsDeveloper')}
              </span>
              <span className="text-[10px] text-on-surface-variant/60 font-mono">
                {t('registerDeveloperSubtitle')}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-container"></div>
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 w-full py-4 bg-primary-container text-on-primary-fixed font-headline-md text-headline-md uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] active:scale-[0.98] transition-all relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
            {t('register')}
          </button>

          <p className="text-center font-label-sm text-label-sm text-on-surface-variant/50 mt-4">
            {t('alreadySynchronized')}{' '}
            <Link to="/login" className="text-secondary hover:text-primary-container transition-colors tracking-widest uppercase">
              {t('loginPortal')}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
