import React from 'react';
import { 
  Shield, 
  Sun, 
  Moon, 
  LogOut, 
  ArrowRight,
  Activity,
  Cpu
} from 'lucide-react';
import { Button } from './Button';
import { User, ScreenType } from '../types';

interface AdminHeaderProps {
  setCurrentScreen: (screen: ScreenType) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
}

export function AdminHeader({
  setCurrentScreen,
  currentUser,
  setCurrentUser,
  darkMode,
  setDarkMode
}: AdminHeaderProps) {
  return (
    <header id="godotlaunch-admin-navbar" className="sticky top-0 bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border-b border-slate-800 backdrop-blur-md z-45 transition-colors duration-200 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-6">
        
        {/* Brand Logo with admin suffix */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentScreen('explore')}>
          <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center font-display shadow-[0_2px_0_0_#991b1b] transition-transform active:scale-95">
            <Shield size={16} className="text-white fill-white" />
          </div>
          <div>
            <span className="font-display font-bold text-base text-white tracking-tight flex items-center gap-1.5 leading-none">
              godotlaunch <span className="bg-rose-500/20 text-rose-400 text-[9px] uppercase font-bold py-0.5 px-1.5 rounded border border-rose-500/30 font-mono">ADMIN</span>
            </span>
            <span className="text-[9px] text-slate-400 font-mono tracking-wider">MANAGEMENT MATRIX</span>
          </div>
        </div>

        {/* Center Section: System Node Telemetry */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 dark:bg-slate-900/60 rounded border border-slate-700/40 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <Activity size={12} />
            <span>CLUSTERS: ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 dark:bg-slate-900/60 rounded border border-slate-700/40 text-sky-400">
            <Cpu size={12} />
            <span>NODE HEALTH: 99.98%</span>
          </div>
        </div>

        {/* Right Section: Controls, Theme Toggle, View Storefront, Profile */}
        <div className="flex items-center gap-3">
          
          {/* Exit to Storefront button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCurrentScreen('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-slate-300 border-slate-750 hover:bg-slate-800 hover:text-white transition-studio"
            icon={<ArrowRight size={13} />}
            iconPosition="right"
          >
            View Storefront
          </Button>

          {/* Theme mode toggle button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-400 hover:text-amber-400 transition-studio rounded-lg bg-slate-800/60 dark:bg-slate-900 border border-slate-750"
            title="Toggle theme mode"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Profile controls */}
          {currentUser ? (
            <div className="relative group flex items-center gap-2">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-8 h-8 rounded-full border-2 border-rose-500 cursor-pointer"
              />
              {/* Dropdown panel */}
              <div className="absolute right-0 mt-2.5 top-8 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-3 hidden group-hover:block hover:block z-50 text-slate-200">
                <p className="text-xs font-bold truncate">{currentUser.username}</p>
                <p className="text-[9px] text-slate-400 truncate mb-2">{currentUser.email}</p>
                <div className="border-t border-slate-800 my-1.5" />
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setCurrentScreen('explore');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left text-xs font-semibold text-rose-400 hover:text-rose-300 py-1 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group flex items-center gap-2">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"
                alt="Admin Profile"
                className="w-8 h-8 rounded-full border border-slate-700 cursor-pointer"
              />
              <div className="absolute right-0 mt-2.5 top-8 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-3 hidden group-hover:block hover:block z-50 text-slate-200">
                <p className="text-xs font-bold truncate">Default Admin</p>
                <p className="text-[9px] text-slate-400 truncate mb-2">admin@godotlaunch.com</p>
                <div className="border-t border-slate-800 my-1.5" />
                <button
                  onClick={() => {
                    setCurrentScreen('signin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left text-xs font-semibold text-sky-400 hover:text-sky-300 py-1 transition-colors cursor-pointer"
                >
                  Sign In Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
