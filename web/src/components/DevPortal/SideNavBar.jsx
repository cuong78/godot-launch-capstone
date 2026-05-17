import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart, Gamepad2, Archive, Settings, Upload } from "lucide-react";
import { useLanguage } from '../../hooks/useLanguage';

export default function SideNavBar() {
  const { t } = useLanguage();
  return (
    <nav className="bg-surface-container-lowest/90 backdrop-blur-lg fixed left-0 top-0 h-full w-64 z-40 border-r border-white/5 hidden lg:flex flex-col py-8 space-y-4 pt-24">
      <div className="px-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-lg bg-surface-variant border border-outline-variant overflow-hidden neon-border-purple">
            <img
              alt="Developer Avatar"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSvAKRsv_N3JCokDFJ0j3YbUAv1X6KkbtydwZ6yAwkcc70zrogQwaqDD1FQdFfvqO7-m07uAcFPfjXL7TZZLBLHw-fqHCQKzO8d4hrTUWv3815MBtYodtUIMzCmBKyvnotbe7nF9Fa-rKSUYiPPBeyAMr_BiaLA40u2p31zKLILj4LWBoWUHtdeXpgKeERxI50RfpTvg6xXf364ga9mxy4LAQF8OkYVCri_Eol33y_8zzeEOcZuvipQFPhAj3vVgy6z0i7Xp9I8Nr4"
            />
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-secondary text-lg"> {t('devConsole')} </h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant">V2.0.4-Beta</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-2">
        <NavLink
          end
          to="/dev-portal"
          className={({ isActive }) => isActive
            ? "bg-secondary-container/20 text-secondary border-r-4 border-secondary px-4 py-3 font-label-sm text-label-sm flex items-center space-x-3 translate-x-1 duration-200"
            : "text-on-surface-variant hover:bg-surface-variant/30 px-4 py-3 hover:text-secondary transition-all font-label-sm text-label-sm flex items-center space-x-3"
          }
        >
          <LayoutDashboard className="w-6 h-6" />
          <span>{t('dashboard')}</span>
        </NavLink>
        <NavLink
          to="/dev-portal/analytics"
          className={({ isActive }) => isActive
            ? "bg-secondary-container/20 text-secondary border-r-4 border-secondary px-4 py-3 font-label-sm text-label-sm flex items-center space-x-3 translate-x-1 duration-200"
            : "text-on-surface-variant hover:bg-surface-variant/30 px-4 py-3 hover:text-secondary transition-all font-label-sm text-label-sm flex items-center space-x-3"
          }
        >
          <LineChart className="w-6 h-6" />
          <span>{t('analytics')}</span>
        </NavLink>
        <NavLink
          to="/dev-portal/games"
          className={({ isActive }) => isActive
            ? "bg-secondary-container/20 text-secondary border-r-4 border-secondary px-4 py-3 font-label-sm text-label-sm flex items-center space-x-3 translate-x-1 duration-200"
            : "text-on-surface-variant hover:bg-surface-variant/30 px-4 py-3 hover:text-secondary transition-all font-label-sm text-label-sm flex items-center space-x-3"
          }
        >
          <Gamepad2 className="w-6 h-6" />
          <span>{t('myGames')}</span>
        </NavLink>
        <a className="text-on-surface-variant hover:bg-surface-variant/30 px-4 py-3 hover:text-secondary transition-all font-label-sm text-label-sm flex items-center space-x-3" href="#">
          <Archive className="w-6 h-6" />
          <span>{t('assets')}</span>
        </a>
        <a className="text-on-surface-variant hover:bg-surface-variant/30 px-4 py-3 hover:text-secondary transition-all font-label-sm text-label-sm flex items-center space-x-3 mt-auto" href="#">
          <Settings className="w-6 h-6" />
          <span>{t('settings')}</span>
        </a>
      </div>

      <div className="px-6 mt-auto pt-8">
        <button className="w-full border border-secondary text-secondary font-label-sm text-label-sm px-4 py-3 rounded-lg hover:bg-secondary/10 transition-colors flex justify-center items-center space-x-2">
          <Upload className="w-[18px] h-[18px]" />
          <span>{t('submitGame')}</span>
        </button>
      </div>
    </nav>
  );
}
