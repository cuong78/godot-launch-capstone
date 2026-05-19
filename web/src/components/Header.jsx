import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Bell,
  Search,
  SquareTerminal,
  Settings,
  Heart,
  Menu,
  X,
  Compass,
  BookOpen,
  Users,
  Terminal,
  Gavel,
  DollarSign,
  ClipboardList,
  ChevronDown,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { useLanguage } from "../hooks/useLanguage";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");
  const { unreadCount, setIsNotificationOpen, isNotificationOpen } =
    useNotification();
  const { cartCount, setIsCartOpen, isCartOpen } = useCart();
  const { wishlistCount, setIsWishlistOpen, isWishlistOpen } = useWishlist();
  const { language, setLanguage, languageNames, t } = useLanguage();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  });

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userStr = localStorage.getItem("user");
        setCurrentUser(userStr ? JSON.parse(userStr) : null);
      } catch (e) {
        setCurrentUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Close dropdowns on path change
  useEffect(() => {
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setIsProfileDropdownOpen(false);
    window.dispatchEvent(new Event("storage"));
    navigate("/login");
  };

  const handleCartClick = () => {
    setIsNotificationOpen(false);
    setIsWishlistOpen(false);
    setIsCartOpen(true);
  };

  const handleNotificationClick = () => {
    setIsCartOpen(false);
    setIsWishlistOpen(false);
    setIsNotificationOpen(true);
  };

  const handleWishlistClick = () => {
    setIsCartOpen(false);
    setIsNotificationOpen(false);
    setIsWishlistOpen(true);
  };

  return (
    <>
      <nav className="bg-surface-dim/75 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] top-0 z-50 fixed w-full transition-all duration-300">
        <div className={`h-[2px] w-full bg-gradient-to-r ${
          isAdmin 
            ? "from-error/45 via-error to-error/45" 
            : "from-surface-tint/25 via-surface-tint to-surface-tint/25"
        } opacity-80`} />

        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-3.5 max-w-container-max mx-auto relative">
          
          <Link
            to={isAdmin ? "/admin" : "/"}
            className="flex items-center gap-2.5 group select-none shrink-0"
          >
            <div className="relative flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${
                isAdmin 
                  ? "bg-error animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
                  : "bg-surface-tint animate-ping shadow-[0_0_10px_rgba(0,219,231,0.8)]"
              }`} />
              <span className={`w-2 h-2 rounded-full absolute ${
                isAdmin ? "bg-error/60" : "bg-surface-tint/60"
              }`} />
            </div>
            
            <div className="flex flex-col">
              <span className={`font-mono text-[8px] tracking-[0.2em] uppercase leading-none font-bold ${
                isAdmin ? "text-error/80" : "text-surface-tint/80"
              }`}>
                {isAdmin ? "SYS_ADMIN" : "SYS_ONLINE"}
              </span>
              <span className={`font-display-lg text-lg md:text-xl uppercase tracking-wider font-extrabold transition-all duration-300 leading-tight ${
                isAdmin 
                  ? "text-error drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                  : "text-transparent bg-clip-text bg-gradient-to-r from-surface-tint via-primary-fixed to-secondary-fixed group-hover:drop-shadow-[0_0_8px_rgba(0,219,231,0.4)]"
              }`}>
                {isAdmin ? "GLITCH_ADMIN" : "INDIE_CORE"}
              </span>
            </div>
          </Link>

          {isAdmin && (
            <div className="hidden lg:flex relative items-center ml-6">
              <Search className="absolute left-3.5 text-on-surface-variant/40 w-4 h-4" />
              <input
                className="bg-surface-container-lowest/80 border border-outline-variant/30 text-on-surface focus:border-error focus:outline-none focus:ring-1 focus:ring-error focus:shadow-[0_0_15px_rgba(239,68,68,0.2)] rounded-full py-1.5 pl-10 pr-4 font-mono text-[11px] w-48 xl:w-64 transition-all placeholder:text-on-surface-variant/40"
                placeholder={t('queryDB')}
                type="text"
              />
            </div>
          )}

          <div className="hidden md:flex items-center ml-auto mr-6">
            {isAdmin ? (
              <div className="flex items-center bg-surface-container-lowest/60 border border-white/5 rounded-full p-1 gap-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                <Link
                  to="/admin/moderation"
                  className={`flex items-center gap-1.5 px-4.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                    location.pathname === "/admin/moderation"
                      ? "text-error bg-error/10 border border-error/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold"
                      : "text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Gavel className="w-3.5 h-3.5" />
                  {t('moderation')}
                </Link>
                <Link
                  to="/admin/finance"
                  className={`flex items-center gap-1.5 px-4.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                    location.pathname === "/admin/finance"
                      ? "text-error bg-error/10 border border-error/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold"
                      : "text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  {t('finance')}
                </Link>
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-4.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                    location.pathname === "/admin"
                      ? "text-error bg-error/10 border border-error/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold"
                      : "text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {t('users')}
                </Link>
                <Link
                  to="/admin/logs"
                  className={`flex items-center gap-1.5 px-4.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                    location.pathname === "/admin/logs"
                      ? "text-error bg-error/10 border border-error/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold"
                      : "text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  {t('logs')}
                </Link>
              </div>
            ) : (
              <div className="flex items-center bg-surface-container-lowest/60 border border-white/5 rounded-full p-1 gap-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full font-mono text-[10.5px] uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    location.pathname === "/"
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)] font-bold"
                      : "text-on-surface-variant/80 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  {t('store')}
                </Link>
                <Link
                  to="/library"
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full font-mono text-[10.5px] uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    location.pathname === "/library"
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)] font-bold"
                      : "text-on-surface-variant/80 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {t('library')}
                </Link>
                <Link
                  to="/community"
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full font-mono text-[10.5px] uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    location.pathname === "/community"
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)] font-bold"
                      : "text-on-surface-variant/80 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {t('community')}
                </Link>
                <Link
                  to="/dev-portal"
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full font-mono text-[10.5px] uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    location.pathname.startsWith("/dev-portal")
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)] font-bold"
                      : "text-on-surface-variant/80 hover:text-on-surface hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  {t('devPortal')}
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4.5">
            {!isAdmin && (
              <button className="hidden lg:block relative overflow-hidden group bg-gradient-to-r from-surface-tint/10 to-secondary-container/10 border border-surface-tint/30 hover:border-surface-tint/60 px-4.5 py-1.5 rounded-full text-surface-tint font-mono text-[10px] uppercase tracking-widest transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:scale-[1.03] active:scale-95 cursor-pointer">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-tint/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                {t('supportDev')}
              </button>
            )}

            <div className="hidden sm:flex items-center relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-surface-container-low/60 border border-white/5 text-on-surface-variant hover:text-on-surface text-[10px] font-mono uppercase tracking-widest pl-3 pr-8 py-1.5 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-primary-container/40 appearance-none cursor-pointer"
              >
                {Object.entries(languageNames).map(([code, label]) => (
                  <option key={code} value={code} className="bg-surface-container-lowest text-on-surface">
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none text-on-surface-variant/50" />
            </div>

            <div className="flex items-center bg-surface-container-low/40 border border-white/5 rounded-full p-1 gap-1 shadow-inner">
              {isAdmin ? (
                <>
                  <button
                    onClick={handleNotificationClick}
                    className="relative p-2 text-on-surface-variant/70 hover:text-error hover:bg-white/5 rounded-full transition-all duration-300 active:scale-90 cursor-pointer"
                    title={t('logs')}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3 h-3 bg-error text-on-error text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <button 
                    className="p-2 text-on-surface-variant/70 hover:text-error hover:bg-white/5 rounded-full transition-all duration-300 hidden sm:block active:scale-90 cursor-pointer"
                    title="Console"
                  >
                    <SquareTerminal className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-on-surface-variant/70 hover:text-error hover:bg-white/5 rounded-full transition-all duration-300 hidden sm:block active:scale-90 cursor-pointer"
                    title="System Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCartClick}
                    className="relative p-2 text-on-surface-variant/75 hover:text-surface-tint hover:bg-white/5 rounded-full transition-all duration-300 active:scale-90 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-surface-tint text-surface-container-lowest text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(0,219,231,0.6)] border border-surface-dim">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={handleNotificationClick}
                    className="relative p-2 text-on-surface-variant/75 hover:text-surface-tint hover:bg-white/5 rounded-full transition-all duration-300 active:scale-90 cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-surface-dim">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {!isAdmin && (
                <button
                  onClick={handleWishlistClick}
                  className="relative p-2 text-on-surface-variant/75 hover:text-secondary hover:bg-white/5 rounded-full transition-all duration-300 active:scale-90 cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  {wishlistCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-secondary text-on-secondary text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(209,188,255,0.6)] border border-surface-dim">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {currentUser ? (
              <div className="relative shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`w-9 h-9 rounded-full overflow-hidden border p-0.5 block transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-container ${
                    isProfileDropdownOpen 
                      ? "border-surface-tint shadow-[0_0_12px_rgba(0,242,255,0.4)]" 
                      : "border-white/10 hover:border-surface-tint/60"
                  }`}
                >
                  <img
                    alt="User profile"
                    className="w-full h-full rounded-full object-cover"
                    src={
                      currentUser.avatarUrl ||
                      (currentUser.roleName.toLowerCase() === 'admin'
                        ? "https://lh3.googleusercontent.com/aida-public/AB6AXuCa1cAURjwqpEFrc2Tu_jVVbf55otNZTIZ2kSxnLml55ukqSwTyS5xRwkw0OUHPx7UcdWjOOjVeenxKDMBnpQzIle6iXJV5B3UmaUzAG1tenx-Cb5XEimErcZSMg42qNoMjE3n1QOn3IOtZ3HEUxeTD4_RO09qARz9QOn6brVk0Z9AgnNJqd4lp1sF9Uskb2-QN7t7nkjEQ_dbzG9bVOtZcfwQ9lWrRRuj1pRmt6yCbE3L59UzqrgGbXeqGfEPLHZGuya3hsCxL0MrU"
                        : "https://lh3.googleusercontent.com/aida-public/AB6AXuCbd2dT12ZtEf7c-mfxRSvXg2Fn5K64gg5sl24X3AEZbXN2TEtuJ-f9FVI9IsIMgSdHtbmj1OY4EPIU47YJ-SLFnn5lQSkmidlsoIpjrqCodm2AC9tU1s7RpJllR68lvcUXuBkngh5ml8HABcGICSnTBzCosIeDlx9BpKN5f8O_NiKTU0z7lS9JDulDJIDbsGMrPZHrU94xoSmGCwJ9JJjxHO5GQuAtq1Gd70ks3iGCg-JDCsC34-owmdY3jaOPqSurwOuvF_ZAWqyV")
                    }
                  />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-60 rounded-xl bg-surface-container-lowest/90 backdrop-blur-2xl border border-white/10 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 flex flex-col gap-3 font-mono text-[10px] text-on-surface animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="font-bold text-xs text-primary-container truncate">{currentUser.fullName || currentUser.username}</p>
                      </div>
                      <p className="text-[8.5px] text-on-surface-variant/60 uppercase tracking-widest mt-1">@{currentUser.username}</p>
                      
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                          currentUser.roleName.toLowerCase() === 'admin' 
                            ? 'bg-error/10 text-error border-error/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
                            : currentUser.roleName.toLowerCase() === 'developer'
                            ? 'bg-primary-container/10 text-primary-container border-primary-container/20 shadow-[0_0_8px_rgba(0,242,255,0.1)]'
                            : 'bg-secondary/10 text-secondary border-secondary/20'
                        }`}>
                          {currentUser.roleName}
                        </span>
                        <span className="text-[7.5px] text-on-surface-variant/40">NODE_ID_{currentUser.id ? currentUser.id.substring(0, 6) : "LOCAL"}</span>
                      </div>
                    </div>
                    
                    {currentUser.roleName.toLowerCase() === 'developer' && (
                      <Link 
                        to="/dev-portal" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="hover:text-primary-container hover:bg-white/5 p-2 rounded-lg transition-all uppercase tracking-wider text-left block flex items-center gap-2"
                      >
                        <Terminal className="w-3.5 h-3.5 text-primary-container" />
                        {t('devPortal')}
                      </Link>
                    )}
                    
                    {currentUser.roleName.toLowerCase() === 'admin' && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="hover:text-error hover:bg-white/5 p-2 rounded-lg transition-all uppercase tracking-wider text-left block flex items-center gap-2"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-error" />
                        Glitch Admin
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full mt-1 py-2 bg-error/15 hover:bg-error/25 border border-error/30 text-error hover:text-white rounded-lg transition-all uppercase tracking-wider font-bold cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="font-mono text-[10.5px] text-surface-tint border border-surface-tint/50 px-4.5 py-1.5 rounded-full uppercase tracking-wider hover:bg-surface-tint/10 hover:border-surface-tint hover:shadow-[0_0_12px_rgba(0,242,255,0.15)] transition-all duration-300"
              >
                {t('login')}
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-on-surface-variant hover:text-on-surface md:hidden transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[57px] z-40 md:hidden bg-surface-dim/95 backdrop-blur-2xl border-t border-white/5 flex flex-col p-6 animate-in fade-in duration-300 overflow-y-auto">
          {isAdmin && (
            <div className="relative items-center mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 w-4.5 h-4.5" />
              <input
                className="w-full bg-surface-container-lowest/80 border border-outline-variant/30 text-on-surface focus:border-error focus:outline-none focus:ring-1 focus:ring-error rounded-full py-2.5 pl-11 pr-4 font-mono text-[12px] transition-all placeholder:text-on-surface-variant/40"
                placeholder={t('queryDB')}
                type="text"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[9px] text-on-surface-variant/40 tracking-[0.2em] uppercase mb-1">Navigation</span>
            {isAdmin ? (
              <>
                <Link
                  to="/admin/moderation"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/admin/moderation"
                      ? "text-error bg-error/10 border border-error/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Gavel className="w-5 h-5 text-error" />
                  {t('moderation')}
                </Link>
                <Link
                  to="/admin/finance"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/admin/finance"
                      ? "text-error bg-error/10 border border-error/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <DollarSign className="w-5 h-5 text-error" />
                  {t('finance')}
                </Link>
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/admin"
                      ? "text-error bg-error/10 border border-error/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Users className="w-5 h-5 text-error" />
                  {t('users')}
                </Link>
                <Link
                  to="/admin/logs"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/admin/logs"
                      ? "text-error bg-error/10 border border-error/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <ClipboardList className="w-5 h-5 text-error" />
                  {t('logs')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/"
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Compass className="w-5 h-5 text-surface-tint" />
                  {t('store')}
                </Link>
                <Link
                  to="/library"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/library"
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-surface-tint" />
                  {t('library')}
                </Link>
                <Link
                  to="/community"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname === "/community"
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Users className="w-5 h-5 text-surface-tint" />
                  {t('community')}
                </Link>
                <Link
                  to="/dev-portal"
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-mono text-xs uppercase tracking-widest ${
                    location.pathname.startsWith("/dev-portal")
                      ? "text-surface-tint bg-surface-tint/10 border border-surface-tint/20 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Terminal className="w-5 h-5 text-surface-tint" />
                  {t('devPortal')}
                </Link>
              </>
            )}
          </div>

          <div className="mt-auto border-t border-white/5 pt-6 flex flex-col gap-4">
            {!isAdmin && (
              <button className="w-full relative overflow-hidden bg-gradient-to-r from-surface-tint/10 to-secondary-container/10 border border-surface-tint/40 py-3 rounded-xl text-surface-tint font-mono text-xs uppercase tracking-widest text-center shadow-[0_0_15px_rgba(0,242,255,0.1)] active:scale-98">
                {t('supportDev')}
              </button>
            )}

            <div className="flex items-center justify-between bg-surface-container-low/40 border border-white/5 p-3 rounded-xl">
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">Select Interface Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent border-0 text-on-surface text-xs font-mono uppercase tracking-widest focus:outline-none cursor-pointer"
              >
                {Object.entries(languageNames).map(([code, label]) => (
                  <option key={code} value={code} className="bg-surface-container-lowest text-on-surface">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono text-on-surface-variant/40 px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>CORE_OK_</span>
              </div>
              <span>VER_2.4.1 // LATENCY_9MS</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
