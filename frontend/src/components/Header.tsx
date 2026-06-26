import React from 'react';
import {
  Play,
  Search,
  X,
  Sun,
  Moon,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Plus,
  Bell
} from 'lucide-react';
import { Button } from './Button';
import { Asset, User, ScreenType } from '../types';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  cart: Asset[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  handleRemoveFromCart: (id: string, e: React.MouseEvent) => void;
  handleCheckout: () => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedPost: (post: any) => void;
  setSelectedAuthor: (author: any) => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function Header({
  currentScreen,
  setCurrentScreen,
  currentUser,
  setCurrentUser,
  darkMode,
  setDarkMode,
  searchText,
  setSearchText,
  cart,
  isCartOpen,
  setIsCartOpen,
  handleRemoveFromCart,
  handleCheckout,
  setSelectedAssetId,
  setSelectedPost,
  setSelectedAuthor,
  showToast
}: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const { t } = useTranslation('common');
  const desktopSearchClassName = currentUser
    ? 'hidden md:flex shrink-0 w-[220px] xl:w-[280px] 2xl:w-[340px] relative'
    : 'hidden md:flex shrink-0 w-[260px] lg:w-[320px] xl:w-[380px] relative';
  const navButtonClassName = (isActive: boolean) =>
    `shrink-0 whitespace-nowrap px-2 xl:px-3.5 py-2 text-xs xl:text-sm font-semibold rounded-lg transition-studio ${
      isActive
        ? 'bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
    }`;

  return (
    <header id="godotlaunch-navbar" className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 z-40 transition-colors duration-200 shadow-sm">
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 xl:gap-6">
        
        {/* Logo & Small Engine version brand tag */}
        <div className="flex shrink-0 items-center gap-2 cursor-pointer" onClick={() => { setCurrentScreen('explore'); setSearchText(''); }}>
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center font-display shadow-[0_3px_0_0_#9a7d00] transition-transform active:scale-95">
            <Play size={18} className="text-slate-900 fill-slate-900 ml-0.5" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 leading-none">
              godotlaunch <span className="bg-amber-400/20 text-amber-500 text-[10px] uppercase font-bold py-0.5 px-1.5 rounded border border-amber-500/30 font-mono">v4</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">CREATORS MATRIX</span>
          </div>
        </div>

        {/* Combined Quick Search input bar */}
        <div className={desktopSearchClassName}>
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search scripts, shaders, templates..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              if (currentScreen !== 'marketplace' && currentScreen !== 'detail') {
                setCurrentScreen('marketplace');
              }
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 dark:bg-slate-950 border border-transparent dark:border-slate-800/60 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 text-sm text-slate-800 dark:text-slate-200 transition-studio placeholder-slate-500 dark:placeholder-slate-400"
          />
          {searchText && (
            <button 
              onClick={() => setSearchText('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-amber-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Navigation Items (Responsive on Desktop) */}
        <nav className="hidden lg:flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 xl:gap-2 2xl:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => { setCurrentScreen('explore'); setSearchText(''); }}
            className={navButtonClassName(currentScreen === 'explore')}
          >
            {t('explore')}
          </button>
          <button
            onClick={() => { setCurrentScreen('marketplace'); }}
            className={navButtonClassName(currentScreen === 'marketplace')}
          >
            {t('marketplace')}
          </button>
          <button
            onClick={() => { setCurrentScreen('community'); }}
            className={navButtonClassName(currentScreen === 'community')}
          >
            {t('community')}
          </button>
          <button
            onClick={() => { 
              if (currentUser?.role === 'customer') {
                if (showToast) {
                  showToast("Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.", "warning");
                } else {
                  alert("Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.");
                }
              }
              setCurrentScreen('path'); 
            }}
            className={navButtonClassName(currentScreen === 'path')}
          >
            {t('sell_acquire')}
          </button>
          {currentUser && (
            <button
              onClick={() => { setCurrentScreen('wallet'); }}
              className={navButtonClassName(currentScreen === 'wallet')}
            >
              {t('wallet')}
            </button>
          )}
          {currentUser?.role !== 'customer' && (
            <button
              onClick={() => { setCurrentScreen('dashboard'); }}
              className={navButtonClassName(currentScreen === 'dashboard')}
            >
              {t('dashboard')}
            </button>
          )}
          {currentUser && (
            <button
              onClick={() => { setCurrentScreen('chat'); }}
              className={navButtonClassName(currentScreen === 'chat')}
            >
              {t('messages')}
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => { setCurrentScreen('admin'); }}
              className={navButtonClassName(currentScreen === 'admin')}
            >
              {t('admin_portal')}
            </button>
          )}
        </nav>

        {/* Utility Action tools: Dark Mode, Cart Badge dropdown trigger, Publish Button */}
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher className="hidden shrink-0 md:block" />
          
          {/* Dark mode custom click toggle */}
          <button
            id="theme-toggler"
            onClick={() => setDarkMode(!darkMode)}
            className="shrink-0 p-2 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-amber-400 transition-studio rounded-lg bg-slate-100/80 dark:bg-slate-950 border border-transparent dark:border-slate-850"
            title="Toggle theme mode"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Shopping Cart Trigger */}
          <div className="relative">
            <button
              id="shopping-cart-btn"
              onClick={() => {
                setIsCartOpen(!isCartOpen);
                setIsProfileOpen(false);
              }}
              className="shrink-0 p-2 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-amber-400 transition-studio rounded-lg bg-slate-100/80 dark:bg-slate-950 border border-transparent dark:border-slate-850 relative"
              title="View cart items"
            >
              <ShoppingCart size={17} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-sky-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {cart.length}
                </span>
              )}
            </button>

            {/* Collapsible Cart overlay dropdown list box */}
            {isCartOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCartOpen(false)} />
                <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xl z-50 p-4 transition-colors duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2.5">
                    <span className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 animate-pulse">
                      <ShoppingBag size={15} /> {t('shopping_cart')}
                    </span>
                    <button onClick={() => setIsCartOpen(false)} className="text-slate-450 hover:text-slate-600 dark:hover:text-white">
                      <X size={15} />
                    </button>
                  </div>

                {cart.length > 0 ? (
                  <div className="space-y-3 my-3 max-h-60 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-855 pb-2">
                        <div className="flex items-center gap-2">
                          <img referrerPolicy="no-referrer" src={item.image} alt={item.title} className="w-10 h-10 object-cover rounded border border-slate-100 dark:border-slate-800" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[140px]">{item.title}</p>
                            <p className="text-[10px] text-slate-400">{item.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold dark:text-amber-400">
                            {item.price === 0 ? 'Free' : `$${item.price.toFixed(2)}`}
                          </span>
                          <button
                            onClick={(e) => handleRemoveFromCart(item.id, e)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between font-display font-semibold text-xs text-slate-800 dark:text-slate-200 pt-1">
                      <span>Total Checkout Value:</span>
                      <span className="text-sm font-mono font-bold text-sky-600 dark:text-amber-400">
                        ${cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full mt-2 py-2 px-4 bg-sky-500 hover:bg-sky-400 text-white font-display text-xs font-bold rounded-lg shadow-[0_4px_0_0_#025272] hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-studio text-center"
                    >
                      {t('proceed_to_checkout')}
                    </button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-650">
                    <p className="text-sm">Your cart is empty.</p>
                    <button
                      onClick={() => { setCurrentScreen('marketplace'); setIsCartOpen(false); }}
                      className="text-xs text-amber-500 hover:underline mt-1 font-semibold"
                    >
                      {t('browse_packages')}
                    </button>
                  </div>
                )}
              </div>
            </>
           )}
          </div>

          {/* Notifications Trigger */}
          {currentUser && (
            <NotificationBell
              setCurrentScreen={setCurrentScreen}
              setSelectedAssetId={setSelectedAssetId}
              setSelectedPost={setSelectedPost}
              setSelectedAuthor={setSelectedAuthor}
            />
          )}

          {/* Launch product custom setup screen button */}
          <div className="hidden shrink-0 sm:block lg:hidden xl:block">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              className="shrink-0 whitespace-nowrap"
              onClick={() => { setCurrentScreen('upload'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {t('upload_file')}
            </Button>
          </div>

          {/* Authentication Section */}
          <div className="flex shrink-0 items-center gap-2">
            {currentUser ? (
              <div className="relative flex shrink-0 items-center gap-2">
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsCartOpen(false);
                    }}
                    className="w-8 h-8 rounded-full border-2 border-amber-400 cursor-pointer hover:border-amber-300 transition-colors"
                  />
                  {/* Dropdown menu */}
                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                      <div className="absolute right-0 mt-2.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xl p-3 z-50">
                        <p className="text-xs font-bold text-slate-850 dark:text-white truncate">{currentUser.username}</p>
                        <p className="text-[10px] text-slate-455 dark:text-slate-400 truncate mb-2">{currentUser.email}</p>
                        <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentScreen('profile');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 py-1.5 transition-colors cursor-pointer"
                        >
                          {t('my_profile')}
                        </button>
                        <div className="border-t border-slate-100 dark:border-slate-805 my-1" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentScreen('chat');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 py-1.5 transition-colors cursor-pointer"
                        >
                          {t('direct_chat')}
                        </button>
                        <div className="border-t border-slate-100 dark:border-slate-805 my-1" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentUser(null);
                            setCurrentScreen('explore');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full text-left text-xs font-semibold text-rose-500 hover:text-rose-650 dark:hover:text-rose-400 py-1 transition-colors cursor-pointer"
                        >
                          {t('sign_out')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                  onClick={() => { setCurrentScreen('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {t('login')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                  onClick={() => { setCurrentScreen('signup'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {t('signup')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar strips */}
      <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 flex justify-around py-1.5 bg-slate-50 dark:bg-slate-900/40 text-xs gap-1 max-w-full overflow-x-auto">
        <button onClick={() => setCurrentScreen('explore')} className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'explore' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}>{t('explore')}</button>
        <button onClick={() => setCurrentScreen('marketplace')} className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'marketplace' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}>{t('marketplace')}</button>
        <button onClick={() => setCurrentScreen('community')} className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'community' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}>{t('community')}</button>
        {currentUser && (
          <button onClick={() => setCurrentScreen('chat')} className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'chat' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}>{t('messages')}</button>
        )}
        <button 
          onClick={() => {
            if (currentUser?.role === 'customer') {
              if (showToast) {
                showToast("Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.", "warning");
              } else {
                alert("Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.");
              }
            }
            setCurrentScreen('path');
          }} 
          className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'path' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {t('sell_acquire')}
        </button>
        {currentUser?.role !== 'customer' && (
          <button onClick={() => setCurrentScreen('dashboard')} className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'dashboard' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}>{t('dashboard')}</button>
        )}
        {currentUser?.role === 'admin' && (
          <button onClick={() => setCurrentScreen('admin')} className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === 'admin' ? 'text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850' : 'text-slate-600 dark:text-slate-400'}`}>{t('admin_portal')}</button>
        )}
      </div>
    </header>
  );
}
