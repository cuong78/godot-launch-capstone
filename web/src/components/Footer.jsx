import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldAlert, TerminalSquare, Activity, Globe } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function Footer() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { t } = useLanguage();

  // Admin Footer (Minimal, Fixed or Absolute style, but here we just render at the bottom)
  if (isAdmin) {
    return (
      <footer className="bg-surface-container-lowest/90 backdrop-blur-md border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-3 z-40 mt-auto">
        <div className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed-dim flex items-center gap-2 mb-2 sm:mb-0">
          <Activity className="w-4 h-4 animate-pulse" />
          {t('systemStatusOptimal')}
        </div>
        <ul className="flex items-center gap-6 font-label-sm text-label-sm uppercase tracking-widest">
          <li>
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">{t('apiV24')}</a>
          </li>
          <li>
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">{t('latency12ms')}</a>
          </li>
          <li>
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">{t('logStream')}</a>
          </li>
        </ul>
      </footer>
    );
  }

  // Store / Home Footer (Full)
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/20 pt-16 pb-8 px-margin-mobile md:px-margin-desktop mt-auto z-40 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary-fixed-dim/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="inline-block font-headline-md text-headline-md font-black tracking-tighter text-on-surface mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              INDIE_CORE
            </Link>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              {t('brandDescription')}
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary-fixed-dim transition-colors cursor-pointer bg-surface-container-low">
                <TerminalSquare className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 rounded border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary-fixed-dim transition-colors cursor-pointer bg-surface-container-low">
                <Globe className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 rounded border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary-fixed-dim transition-colors cursor-pointer bg-surface-container-low">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-widest mb-6 border-b border-outline-variant/20 pb-2">{t('platform')}</h3>
            <ul className="flex flex-col gap-4 font-body-md text-body-md">
              <li><Link to="/" className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2"><span className="text-primary-fixed-dim opacity-0 hover:opacity-100 transition-opacity">›</span> {t('storefront')}</Link></li>
              <li><Link to="/library" className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2"><span className="text-primary-fixed-dim opacity-0 hover:opacity-100 transition-opacity">›</span> {t('userVault')}</Link></li>
              <li><Link to="/dev-portal" className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2"><span className="text-primary-fixed-dim opacity-0 hover:opacity-100 transition-opacity">›</span> {t('devPortal')}</Link></li>
              <li><Link to="/community" className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2"><span className="text-primary-fixed-dim opacity-0 hover:opacity-100 transition-opacity">›</span> {t('theGrid')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-widest mb-6 border-b border-outline-variant/20 pb-2">{t('support')}</h3>
            <ul className="flex flex-col gap-4 font-body-md text-body-md">
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('helpCenter')}</a></li>
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('refundPolicy')}</a></li>
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('submitTicket')}</a></li>
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('systemStatus')}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-widest mb-6 border-b border-outline-variant/20 pb-2">{t('legal')}</h3>
            <ul className="flex flex-col gap-4 font-body-md text-body-md">
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('termsOfService')}</a></li>
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('privacyDirective')}</a></li>
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('eula')}</a></li>
              <li><a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{t('cookieControls')}</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-outline-variant/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            {t('copyright')}
          </div>
          <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_rgba(0,219,231,0.8)]"></div>
            <span className="font-label-sm text-[10px] text-primary-fixed-dim uppercase tracking-widest">{t('serversOnline')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
