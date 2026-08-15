import React from "react";
import {
  Shield,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { User, ScreenType } from "../../types";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { NotificationBell } from "../NotificationBell";
import { useTranslation } from "react-i18next";
import { dispatchAdminNavigation } from "../../utils/adminNavigation";

interface AdminHeaderProps {
  setCurrentScreen: (screen: ScreenType) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  setSelectedAssetId?: (id: string) => void;
  setSelectedPost?: (post: any) => void;
  setSelectedAuthor?: (author: any) => void;
  onNavigateToDashboardTab?: (tab: any) => void;
}

export function AdminHeader({
  setCurrentScreen,
  currentUser,
  setCurrentUser,
  darkMode,
  setDarkMode,
  setSelectedAssetId,
  setSelectedPost,
  setSelectedAuthor,
  onNavigateToDashboardTab,
}: AdminHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const { t } = useTranslation(["common", "payment", "admin"]);

  const handleMenuNavigate = (screen: ScreenType) => {
    setIsProfileOpen(false);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = () => {
    setIsProfileOpen(false);
    setCurrentUser(null);
    setCurrentScreen("explore");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAdminOverview = () => {
    setIsProfileOpen(false);
    setCurrentScreen("admin");
    dispatchAdminNavigation({ section: "overview" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAdminPayments = () => {
    setIsProfileOpen(false);
    setCurrentScreen("admin");
    dispatchAdminNavigation({ section: "finance", tab: "payments" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const adminDisplayName =
    currentUser?.fullName || currentUser?.username || currentUser?.email || t("admin:header.fallbackName");
  const adminEmail = currentUser?.email || "admin@godotlaunch.com";
  const adminAvatar =
    currentUser?.avatarUrl ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80";

  return (
    <header
      id="godotlaunch-admin-navbar"
      className="sticky top-0 z-45 border-b border-slate-200/80 bg-white/90 text-slate-900 shadow-sm backdrop-blur-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-lg"
    >
      <div className="flex items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <div
          className="flex cursor-pointer items-center gap-2.5"
          onClick={handleOpenAdminOverview}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 font-display shadow-[0_2px_0_0_#991b1b] transition-transform active:scale-95">
            <Shield size={16} className="fill-white text-white" />
          </div>
          <div>
            <span className="flex items-center gap-1.5 font-display text-base font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              godotlaunch{" "}
              <span className="rounded border border-rose-500/20 bg-rose-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400">
                {t("admin:header.badge")}
              </span>
            </span>
            <span className="font-mono text-[9px] tracking-wider text-slate-500 dark:text-slate-400">
              {t("admin:header.managementMatrix")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden md:block" />

          {currentUser && (
            <NotificationBell
              setCurrentScreen={setCurrentScreen}
              setSelectedAssetId={setSelectedAssetId || (() => {})}
              setSelectedPost={setSelectedPost || (() => {})}
              setSelectedAuthor={setSelectedAuthor || (() => {})}
              onNavigateToDashboardTab={onNavigateToDashboardTab}
            />
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl border border-slate-200 bg-white/85 p-2 text-slate-500 shadow-sm transition-studio hover:text-amber-500 dark:border-slate-750 dark:bg-slate-900 dark:text-slate-400 dark:shadow-none dark:hover:text-amber-400"
            title={t("admin:header.toggleTheme")}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="relative flex items-center gap-2">
            <img
              src={adminAvatar}
              alt={adminDisplayName}
              onClick={() => setIsProfileOpen((current) => !current)}
              className="h-8 w-8 cursor-pointer rounded-full border-2 border-rose-500 object-cover"
            />

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 top-10 z-50 mt-2.5 w-64 rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-700 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <p className="truncate text-base font-bold text-slate-900 dark:text-white">
                    {adminDisplayName}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {adminEmail}
                  </p>

                  <div className="my-3 border-t border-slate-200 dark:border-slate-800" />

                  <button
                    onClick={() => handleMenuNavigate("profile")}
                    className="w-full cursor-pointer py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:text-sky-600 dark:text-slate-200 dark:hover:text-amber-400"
                  >
                    {t("my_profile")}
                  </button>

                  <button
                    onClick={handleOpenAdminPayments}
                    className="w-full cursor-pointer py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:text-sky-600 dark:text-slate-200 dark:hover:text-amber-400"
                  >
                    {t("payment:center.title", "Quản lý đơn hàng")}
                  </button>

                  <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

                  <button
                    onClick={handleSignOut}
                    className="flex w-full cursor-pointer items-center gap-1.5 py-2 text-left text-sm font-medium text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                  >
                    <LogOut size={12} /> {t("sign_out")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
