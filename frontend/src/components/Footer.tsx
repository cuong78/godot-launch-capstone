import React from 'react';

interface FooterProps {
  setCurrentScreen: (screen: 'explore' | 'marketplace' | 'upload' | 'path' | 'dashboard' | 'detail' | 'community') => void;
}

export function Footer({ setCurrentScreen }: FooterProps) {
  return (
    <footer id="godotlaunch-footer" className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 transition-colors duration-200 relative z-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1.5 flex flex-col items-center md:items-start text-center md:text-left">
          <span className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-white">
            godotlaunch® Open Sandbox Collective
          </span>
          <p className="text-xs text-slate-450 dark:text-slate-400">
            Premium scripts and creative high-fidelity asset blocks built for the modern indie engine pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-550 dark:text-slate-400 font-mono">
          <span className="cursor-pointer hover:text-amber-400 transition-studio" onClick={() => { setCurrentScreen('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Explore Home</span>
          <span className="cursor-pointer hover:text-amber-400 transition-studio" onClick={() => { setCurrentScreen('marketplace'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Marketplace Listing</span>
          <span className="cursor-pointer hover:text-amber-400 transition-studio" onClick={() => { setCurrentScreen('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Dev Room stats</span>
          <span className="text-slate-500 select-none">|</span>
          <span className="text-[11px] text-slate-500 select-none">© 2026. ALL RIGHTS RESERVED.</span>
        </div>
      </div>
    </footer>
  );
}
