import React from "react";
import {
  Play,
  Search,
  X,
  Sun,
  Moon,
  Compass,
  ChevronDown,
  ArrowUpRight,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Plus,
  Users,
  WalletCards,
  LayoutDashboard,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { Button } from "./Button";
import { Asset, User, ScreenType } from "../types";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

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
  showToast?: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

type DesktopMenuKey = "discover" | "creator" | "workspace";

interface DesktopMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
  isActive: boolean;
  glowClassName: string;
  onClick: () => void;
  featured?: boolean;
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
  showToast,
}: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] =
    React.useState<DesktopMenuKey | null>(null);
  const desktopMenuCloseTimeoutRef = React.useRef<number | null>(null);
  const { t } = useTranslation("common");
  const desktopSearchClassName = currentUser
    ? "hidden md:flex shrink-0 w-[220px] xl:w-[280px] 2xl:w-[340px] relative"
    : "hidden md:flex shrink-0 w-[260px] lg:w-[320px] xl:w-[380px] relative";
  const navGroupButtonClassName = (isActive: boolean, isOpen: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 xl:px-3.5 py-2 text-xs xl:text-sm font-semibold rounded-lg transition-studio ${
      isActive || isOpen
        ? "bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400"
        : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
    }`;
  const isDiscoverActive =
    currentScreen === "explore" ||
    currentScreen === "marketplace" ||
    currentScreen === "community";
  const isCreatorActive =
    currentScreen === "path" || currentScreen === "upload";
  const isWorkspaceActive =
    currentScreen === "wallet" ||
    currentScreen === "dashboard" ||
    currentScreen === "chat" ||
    currentScreen === "admin";
  const clearDesktopMenuCloseTimeout = React.useCallback(() => {
    if (desktopMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(desktopMenuCloseTimeoutRef.current);
      desktopMenuCloseTimeoutRef.current = null;
    }
  }, []);
  const openDesktopMenuPanel = React.useCallback(
    (menu: DesktopMenuKey) => {
      clearDesktopMenuCloseTimeout();
      setOpenDesktopMenu(menu);
    },
    [clearDesktopMenuCloseTimeout],
  );
  const scheduleDesktopMenuClose = React.useCallback(
    (menu: DesktopMenuKey) => {
      clearDesktopMenuCloseTimeout();
      desktopMenuCloseTimeoutRef.current = window.setTimeout(() => {
        setOpenDesktopMenu((current) => (current === menu ? null : current));
        desktopMenuCloseTimeoutRef.current = null;
      }, 180);
    },
    [clearDesktopMenuCloseTimeout],
  );
  React.useEffect(() => {
    return () => {
      clearDesktopMenuCloseTimeout();
    };
  }, [clearDesktopMenuCloseTimeout]);
  const handleNavigate = (screen: ScreenType) => {
    setOpenDesktopMenu(null);
    setCurrentScreen(screen);
  };
  const handleOpenPath = () => {
    if (currentUser?.role === "customer") {
      if (showToast) {
        showToast(
          "Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.",
          "warning",
        );
      } else {
        alert(
          "Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.",
        );
      }
    }
    setOpenDesktopMenu(null);
    setCurrentScreen("path");
  };
  const desktopMenuPositionClassName = (menu: DesktopMenuKey) => {
    if (menu === "workspace") {
      return "right-0";
    }

    if (menu === "creator") {
      return "left-1/2 -translate-x-1/2";
    }

    return "left-0";
  };
  const discoverMenuItems: DesktopMenuItem[] = [
    {
      id: "explore",
      title: t("explore"),
      description: t("explore_hint"),
      icon: <Compass size={18} />,
      iconClassName: "border-amber-500/20 bg-amber-400/12 text-amber-500",
      isActive: currentScreen === "explore",
      glowClassName: "from-amber-400/22 via-amber-400/10 to-transparent",
      featured: true,
      onClick: () => {
        setOpenDesktopMenu(null);
        setCurrentScreen("explore");
        setSearchText("");
      },
    },
    {
      id: "marketplace",
      title: t("marketplace"),
      description: t("marketplace_hint"),
      icon: <ShoppingBag size={18} />,
      iconClassName: "border-sky-500/20 bg-sky-500/12 text-sky-500",
      isActive: currentScreen === "marketplace",
      glowClassName: "from-sky-500/22 via-sky-500/10 to-transparent",
      onClick: () => handleNavigate("marketplace"),
    },
    {
      id: "community",
      title: t("community"),
      description: t("community_hint"),
      icon: <Users size={18} />,
      iconClassName: "border-purple-500/20 bg-purple-500/12 text-purple-500",
      isActive: currentScreen === "community",
      glowClassName: "from-purple-500/20 via-purple-500/8 to-transparent",
      onClick: () => handleNavigate("community"),
    },
  ];
  const creatorMenuItems: DesktopMenuItem[] = [
    {
      id: "sell-acquire",
      title: t("sell_acquire"),
      description: t("sell_acquire_hint"),
      icon: <Play size={18} className="fill-current" />,
      iconClassName: "border-emerald-500/20 bg-emerald-500/12 text-emerald-500",
      isActive: currentScreen === "path",
      glowClassName: "from-emerald-500/20 via-emerald-500/8 to-transparent",
      featured: true,
      onClick: handleOpenPath,
    },
    {
      id: "upload",
      title: t("upload_file"),
      description: t("upload_file_hint"),
      icon: <Plus size={18} />,
      iconClassName: "border-amber-500/20 bg-amber-400/12 text-amber-500",
      isActive: currentScreen === "upload",
      glowClassName: "from-amber-400/22 via-amber-400/10 to-transparent",
      onClick: () => {
        setOpenDesktopMenu(null);
        setCurrentScreen("upload");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
  ];
  const workspaceMenuItems: DesktopMenuItem[] = [
    {
      id: "wallet",
      title: t("wallet"),
      description: t("wallet_hint"),
      icon: <WalletCards size={18} />,
      iconClassName: "border-emerald-500/20 bg-emerald-500/12 text-emerald-500",
      isActive: currentScreen === "wallet",
      glowClassName: "from-emerald-500/20 via-emerald-500/8 to-transparent",
      onClick: () => handleNavigate("wallet"),
    },
    ...(currentUser?.role !== "customer"
      ? [
          {
            id: "dashboard",
            title: t("dashboard"),
            description: t("dashboard_hint"),
            icon: <LayoutDashboard size={18} />,
            iconClassName: "border-sky-500/20 bg-sky-500/12 text-sky-500",
            isActive: currentScreen === "dashboard",
            glowClassName: "from-sky-500/20 via-sky-500/8 to-transparent",
            onClick: () => handleNavigate("dashboard"),
          },
        ]
      : []),
    {
      id: "messages",
      title: t("messages"),
      description: t("messages_hint"),
      icon: <MessageCircle size={18} />,
      iconClassName: "border-purple-500/20 bg-purple-500/12 text-purple-500",
      isActive: currentScreen === "chat",
      glowClassName: "from-purple-500/20 via-purple-500/8 to-transparent",
      onClick: () => handleNavigate("chat"),
    },
    ...(currentUser?.role === "admin"
      ? [
          {
            id: "admin",
            title: t("admin_portal"),
            description: t("admin_portal_hint"),
            icon: <ShieldCheck size={18} />,
            iconClassName: "border-rose-500/20 bg-rose-500/12 text-rose-500",
            isActive: currentScreen === "admin",
            glowClassName: "from-rose-500/20 via-rose-500/8 to-transparent",
            onClick: () => handleNavigate("admin"),
          },
        ]
      : []),
  ];
  const renderDesktopMenuPanel = (
    menu: DesktopMenuKey,
    title: string,
    subtitle: string,
    items: DesktopMenuItem[],
  ) => {
    if (openDesktopMenu !== menu) {
      return null;
    }

    return (
      <div
        className={`absolute top-full z-50 pt-3 ${desktopMenuPositionClassName(menu)}`}
        onMouseEnter={clearDesktopMenuCloseTimeout}
        onMouseLeave={() => scheduleDesktopMenuClose(menu)}
      >
        <div className="w-[min(92vw,21rem)] overflow-hidden rounded-[22px] border border-slate-700/80 bg-slate-800/96 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.78)] backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-850/96">
          <div className="border-b border-slate-700/70 px-3 pb-2.5 pt-1.5">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {subtitle}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={item.description}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-studio ${
                  item.isActive
                    ? "bg-slate-700/80 text-white shadow-[inset_0_0_0_1px_rgba(251,191,36,0.16)]"
                    : "text-slate-100 hover:bg-slate-700/72 hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.iconClassName}`}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 font-display text-[15px] font-semibold tracking-tight">
                  {item.title}
                </span>
                <ArrowUpRight
                  size={15}
                  className={`shrink-0 transition-transform duration-300 ${
                    item.isActive
                      ? "text-amber-400"
                      : "text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <header
      id="godotlaunch-navbar"
      className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 z-40 transition-colors duration-200 shadow-sm"
    >
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 xl:gap-6">
        {/* Logo & Small Engine version brand tag */}
        <div
          className="flex shrink-0 items-center gap-2 cursor-pointer"
          onClick={() => {
            setOpenDesktopMenu(null);
            setCurrentScreen("explore");
            setSearchText("");
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center font-display shadow-[0_3px_0_0_#9a7d00] transition-transform active:scale-95">
            <Play size={18} className="text-slate-900 fill-slate-900 ml-0.5" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 leading-none">
              godotlaunch{" "}
              <span className="bg-amber-400/20 text-amber-500 text-[10px] uppercase font-bold py-0.5 px-1.5 rounded border border-amber-500/30 font-mono">
                v4
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">
              CREATORS MATRIX
            </span>
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
              setOpenDesktopMenu(null);
              setSearchText(e.target.value);
              if (
                currentScreen !== "marketplace" &&
                currentScreen !== "detail"
              ) {
                setCurrentScreen("marketplace");
              }
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 dark:bg-slate-950 border border-transparent dark:border-slate-800/60 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 text-sm text-slate-800 dark:text-slate-200 transition-studio placeholder-slate-500 dark:placeholder-slate-400"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-amber-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Navigation Items (Responsive on Desktop) */}
        <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-1 px-1 xl:gap-2 2xl:gap-4">
          <div
            className="relative shrink-0"
            onMouseEnter={() => openDesktopMenuPanel("discover")}
            onMouseLeave={() => scheduleDesktopMenuClose("discover")}
          >
            <button
              type="button"
              className={navGroupButtonClassName(
                isDiscoverActive,
                openDesktopMenu === "discover",
              )}
              onClick={() => {
                clearDesktopMenuCloseTimeout();
                setOpenDesktopMenu((current) =>
                  current === "discover" ? null : "discover",
                );
              }}
              aria-expanded={openDesktopMenu === "discover"}
              aria-haspopup="true"
            >
              {t("discover_menu")}
              <ChevronDown
                size={14}
                className={`transition-transform ${openDesktopMenu === "discover" ? "rotate-180" : ""}`}
              />
            </button>

            {renderDesktopMenuPanel(
              "discover",
              t("discover_menu"),
              t("discover_menu_subtitle"),
              discoverMenuItems,
            )}
          </div>

          <div
            className="relative shrink-0"
            onMouseEnter={() => openDesktopMenuPanel("creator")}
            onMouseLeave={() => scheduleDesktopMenuClose("creator")}
          >
            <button
              type="button"
              className={navGroupButtonClassName(
                isCreatorActive,
                openDesktopMenu === "creator",
              )}
              onClick={() => {
                clearDesktopMenuCloseTimeout();
                setOpenDesktopMenu((current) =>
                  current === "creator" ? null : "creator",
                );
              }}
              aria-expanded={openDesktopMenu === "creator"}
              aria-haspopup="true"
            >
              {t("creator_hub")}
              <ChevronDown
                size={14}
                className={`transition-transform ${openDesktopMenu === "creator" ? "rotate-180" : ""}`}
              />
            </button>

            {renderDesktopMenuPanel(
              "creator",
              t("creator_hub"),
              t("creator_hub_subtitle"),
              creatorMenuItems,
            )}
          </div>

          {currentUser && (
            <div
              className="relative shrink-0"
              onMouseEnter={() => openDesktopMenuPanel("workspace")}
              onMouseLeave={() => scheduleDesktopMenuClose("workspace")}
            >
              <button
                type="button"
                className={navGroupButtonClassName(
                  isWorkspaceActive,
                  openDesktopMenu === "workspace",
                )}
                onClick={() => {
                  clearDesktopMenuCloseTimeout();
                  setOpenDesktopMenu((current) =>
                    current === "workspace" ? null : "workspace",
                  );
                }}
                aria-expanded={openDesktopMenu === "workspace"}
                aria-haspopup="true"
              >
                {t("workspace_hub")}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${openDesktopMenu === "workspace" ? "rotate-180" : ""}`}
                />
              </button>

              {renderDesktopMenuPanel(
                "workspace",
                t("workspace_hub"),
                t("workspace_hub_subtitle"),
                workspaceMenuItems,
              )}
            </div>
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
                setOpenDesktopMenu(null);
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
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCartOpen(false)}
                />
                <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xl z-50 p-4 transition-colors duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2.5">
                    <span className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 animate-pulse">
                      <ShoppingBag size={15} /> {t("shopping_cart")}
                    </span>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="text-slate-450 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {cart.length > 0 ? (
                    <div className="space-y-3 my-3 max-h-60 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-855 pb-2"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              referrerPolicy="no-referrer"
                              src={item.image}
                              alt={item.title}
                              className="w-10 h-10 object-cover rounded border border-slate-100 dark:border-slate-800"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[140px]">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.category}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold dark:text-amber-400">
                              {item.price === 0
                                ? "Free"
                                : `$${item.price.toFixed(2)}`}
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
                          $
                          {cart
                            .reduce((sum, item) => sum + item.price, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="w-full mt-2 py-2 px-4 bg-sky-500 hover:bg-sky-400 text-white font-display text-xs font-bold rounded-lg shadow-[0_4px_0_0_#025272] hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-studio text-center"
                      >
                        {t("proceed_to_checkout")}
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-650">
                      <p className="text-sm">Your cart is empty.</p>
                      <button
                        onClick={() => {
                          setCurrentScreen("marketplace");
                          setIsCartOpen(false);
                        }}
                        className="text-xs text-amber-500 hover:underline mt-1 font-semibold"
                      >
                        {t("browse_packages")}
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

          {/* Authentication Section */}
          <div className="flex shrink-0 items-center gap-2">
            {currentUser ? (
              <div className="relative flex shrink-0 items-center gap-2">
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    onClick={() => {
                      setOpenDesktopMenu(null);
                      setIsProfileOpen(!isProfileOpen);
                      setIsCartOpen(false);
                    }}
                    className="w-8 h-8 rounded-full border-2 border-amber-400 cursor-pointer hover:border-amber-300 transition-colors"
                  />
                  {/* Dropdown menu */}
                  {isProfileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileOpen(false)}
                      />
                      <div className="absolute right-0 mt-2.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xl p-3 z-50">
                        <p className="text-xs font-bold text-slate-850 dark:text-white truncate">
                          {currentUser.username}
                        </p>
                        <p className="text-[10px] text-slate-455 dark:text-slate-400 truncate mb-2">
                          {currentUser.email}
                        </p>
                        <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentScreen("profile");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 py-1.5 transition-colors cursor-pointer"
                        >
                          {t("my_profile")}
                        </button>
                        <div className="border-t border-slate-100 dark:border-slate-805 my-1" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentScreen("chat");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 py-1.5 transition-colors cursor-pointer"
                        >
                          {t("direct_chat")}
                        </button>
                        <div className="border-t border-slate-100 dark:border-slate-805 my-1" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentUser(null);
                            setCurrentScreen("explore");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full text-left text-xs font-semibold text-rose-500 hover:text-rose-650 dark:hover:text-rose-400 py-1 transition-colors cursor-pointer"
                        >
                          {t("sign_out")}
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
                  onClick={() => {
                    setCurrentScreen("signin");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {t("login")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                  onClick={() => {
                    setCurrentScreen("signup");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {t("signup")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar strips */}
      <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 flex justify-around py-1.5 bg-slate-50 dark:bg-slate-900/40 text-xs gap-1 max-w-full overflow-x-auto">
        <button
          onClick={() => setCurrentScreen("explore")}
          className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "explore" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
        >
          {t("explore")}
        </button>
        <button
          onClick={() => setCurrentScreen("marketplace")}
          className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "marketplace" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
        >
          {t("marketplace")}
        </button>
        <button
          onClick={() => setCurrentScreen("community")}
          className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "community" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
        >
          {t("community")}
        </button>
        {currentUser && (
          <button
            onClick={() => setCurrentScreen("chat")}
            className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "chat" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
          >
            {t("messages")}
          </button>
        )}
        <button
          onClick={() => {
            if (currentUser?.role === "customer") {
              if (showToast) {
                showToast(
                  "Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.",
                  "warning",
                );
              } else {
                alert(
                  "Tính năng này chỉ có thể kích hoạt nếu có vai trò Developer khi kết nối với tài khoản GitHub.",
                );
              }
            }
            setCurrentScreen("path");
          }}
          className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "path" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
        >
          {t("sell_acquire")}
        </button>
        {currentUser && (
          <button
            onClick={() => setCurrentScreen("wallet")}
            className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "wallet" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
          >
            {t("wallet")}
          </button>
        )}
        {currentUser && (
          <button
            onClick={() => {
              setCurrentScreen("upload");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "upload" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
          >
            {t("upload_file")}
          </button>
        )}
        {currentUser?.role !== "customer" && (
          <button
            onClick={() => setCurrentScreen("dashboard")}
            className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "dashboard" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
          >
            {t("dashboard")}
          </button>
        )}
        {currentUser?.role === "admin" && (
          <button
            onClick={() => setCurrentScreen("admin")}
            className={`py-1 px-2 rounded font-medium shrink-0 ${currentScreen === "admin" ? "text-amber-500 dark:text-amber-400 font-bold bg-slate-100 dark:bg-slate-850" : "text-slate-600 dark:text-slate-400"}`}
          >
            {t("admin_portal")}
          </button>
        )}
      </div>
    </header>
  );
}
