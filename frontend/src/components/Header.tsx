import React from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Rocket,
  X,
  ShoppingCart,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "./Button";
import { Asset, User, ScreenType } from "../types";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import logoImage from "../../assets/logo.png";

interface HeaderProps {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  cart: Asset[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  handleRemoveFromCart: (id: string, e: React.MouseEvent) => void;
  handleCheckout: () => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedPost: (post: any) => void;
  setSelectedAuthor: (author: any) => void;
}

const resolveCurrencyLocale = (language: string) => {
  switch (language) {
    case "en":
      return "en-US";
    case "ja":
      return "ja-JP";
    case "vi":
    default:
      return "vi-VN";
  }
};

const resolveCurrencyCode = (language: string) =>
  language === "vi" ? "VND" : "USD";

interface CreatorJourneyDialogProps {
  isOpen: boolean;
  onBecomeDeveloper: () => void;
  onMaybeLater: () => void;
  onClose: () => void;
}

const FOCUSABLE_MODAL_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function CreatorJourneyDialog({
  isOpen,
  onBecomeDeveloper,
  onMaybeLater,
  onClose,
}: CreatorJourneyDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation("common");
  const creatorBenefitKeys = [
    "creator_journey_publish_projects",
    "creator_journey_sell_source_assets",
    "creator_journey_manage_workspace",
    "creator_journey_receive_earnings",
  ];

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        FOCUSABLE_MODAL_SELECTOR,
      );
      firstFocusable?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_MODAL_SELECTOR,
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <style>
        {`
          @keyframes creatorJourneyDialogIn {
            from { opacity: 0; transform: translateY(12px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-journey-title"
        aria-describedby="creator-journey-description"
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_80px_-28px_rgba(15,23,42,0.58)] outline-none dark:border-slate-800 dark:bg-slate-900"
        style={{
          animation:
            "creatorJourneyDialogIn 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white/85 p-2 text-slate-400 transition-studio hover:border-slate-300 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-400/20 dark:border-slate-800 dark:bg-slate-950/80 dark:hover:text-white"
          aria-label={t("creator_journey_close")}
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8 sm:pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/15 text-amber-500 shadow-inner shadow-amber-400/10 dark:text-amber-300">
              <Rocket size={30} />
            </div>
            <h2
              id="creator-journey-title"
              className="mt-5 font-display text-2xl font-bold text-slate-950 dark:text-white"
            >
              {t("creator_journey_title")}
            </h2>
            <p
              id="creator-journey-description"
              className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              {t("creator_journey_subtitle")}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-950/45">
            <p className="text-sm font-semibold text-slate-850 dark:text-slate-100">
              {t("creator_journey_abilities_intro")}
            </p>
            <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {creatorBenefitKeys.map((itemKey) => (
                <li key={itemKey} className="flex items-start gap-3">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  <span>{t(itemKey)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={onBecomeDeveloper}
            >
              {t("become_developer")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={onMaybeLater}
            >
              {t("creator_journey_maybe_later")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Header({
  currentScreen,
  setCurrentScreen,
  currentUser,
  setCurrentUser,
  cart,
  isCartOpen,
  setIsCartOpen,
  handleRemoveFromCart,
  handleCheckout,
  setSelectedAssetId,
  setSelectedPost,
  setSelectedAuthor,
}: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isCreatorJourneyDialogOpen, setIsCreatorJourneyDialogOpen] =
    React.useState(false);
  const { t, i18n } = useTranslation(["common", "payment"]);
  const activeLanguage = i18n.resolvedLanguage || i18n.language || "vi";
  const currencyLocale = resolveCurrencyLocale(activeLanguage);
  const currencyCode = resolveCurrencyCode(activeLanguage);
  const formatCartMoney = React.useCallback(
    (amount: number) =>
      amount === 0
        ? t("payment:common.free")
        : new Intl.NumberFormat(currencyLocale, {
            style: "currency",
            currency: currencyCode,
          }).format(amount),
    [currencyCode, currencyLocale, t],
  );
  const groupedCartItems = React.useMemo(() => {
    const itemMap = new Map<string, { item: Asset; quantity: number }>();

    cart.forEach((item) => {
      const key = `${item.id}:${item.itemType ?? "unknown"}`;
      const existing = itemMap.get(key);

      if (existing) {
        existing.quantity += 1;
        return;
      }

      itemMap.set(key, { item, quantity: 1 });
    });

    return Array.from(itemMap.values());
  }, [cart]);
  const navGroupButtonClassName = (isActive: boolean, isOpen: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-studio ${
      isActive || isOpen
        ? "bg-[#292a31] text-white shadow-inner shadow-white/5"
        : "text-[#b8bac5] hover:bg-white/[0.06] hover:text-white"
    }`;
  const isCreatorActive =
    currentScreen === "path" || currentScreen === "upload";
  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
  };
  const handleOpenCreatorCenter = () => {
    setIsCartOpen(false);
    setIsProfileOpen(false);

    if (currentUser?.role === "customer") {
      setIsCreatorJourneyDialogOpen(true);
      return;
    }

    setCurrentScreen("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleBecomeDeveloper = () => {
    setIsCreatorJourneyDialogOpen(false);
    setCurrentScreen("developer-onboarding");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleMaybeLater = () => {
    setIsCreatorJourneyDialogOpen(false);
    setCurrentScreen("explore");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <header
      id="godotlaunch-navbar"
      className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0e13]/95 text-white shadow-[0_10px_35px_rgba(0,0,0,0.24)] backdrop-blur-xl"
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:gap-6">
        {/* Brand */}
        <div
          className="flex shrink-0 cursor-pointer items-center gap-2.5"
          onClick={() => {
            setCurrentScreen("explore");
          }}
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden transition-transform active:scale-95">
            <img
              src={logoImage}
              alt="GodotLaunch"
              className="pointer-events-none absolute -left-[55px] -top-[10px] h-[82px] w-auto max-w-none select-none"
            />
          </div>
          <span className="font-display text-lg font-bold leading-none tracking-tight text-white sm:text-xl">
            godotlaunch
          </span>
        </div>

        {/* Navigation Items (Responsive on Desktop) */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-1 lg:flex xl:gap-2">
          <div className="relative shrink-0">
            <button
              type="button"
              className={navGroupButtonClassName(
                currentScreen === "marketplace",
                false,
              )}
              onClick={() => handleNavigate("marketplace")}
            >
              {t("marketplace")}
            </button>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              className={navGroupButtonClassName(isCreatorActive, false)}
              onClick={() => {
                handleOpenCreatorCenter();
              }}
            >
              {t("creator_hub")}
            </button>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              className={navGroupButtonClassName(
                currentScreen === "dashboard",
                false,
              )}
              onClick={() => {
                setCurrentScreen("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {t("dashboard")}
            </button>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              className={navGroupButtonClassName(
                currentScreen === "community",
                false,
              )}
              onClick={() => handleNavigate("community")}
            >
              {t("community")}
            </button>
          </div>
        </nav>

        {/* Utility actions: language, cart, notifications, and account */}
        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageSwitcher className="shrink-0 [&>button]:!border-white/10 [&>button]:!bg-white/[0.04] [&>button]:!text-[#b8bac5] [&>button:hover]:!border-white/20 [&>button:hover]:!bg-white/[0.08] [&>button:hover]:!text-white" />

          {/* Shopping Cart Trigger */}
          <div className="relative">
            <button
              id="shopping-cart-btn"
              onClick={() => {
                setIsCartOpen(!isCartOpen);
                setIsProfileOpen(false);
              }}
              className="relative shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-[#b8bac5] transition-studio hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              title={t("cart_view_items")}
              aria-label={t("cart_view_items")}
            >
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white animate-bounce">
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
                      <ShoppingBag size={14} /> {t("shopping_cart")}
                    </span>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="text-slate-450 hover:text-slate-600 dark:hover:text-white"
                      aria-label={t("cart_close")}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {cart.length > 0 ? (
                    <div className="space-y-3 my-3 max-h-60 overflow-y-auto">
                      {groupedCartItems.map(({ item, quantity }) => (
                        <div
                          key={`${item.id}:${item.itemType ?? "unknown"}`}
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
                              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate max-w-[140px]">
                                {item.title}
                              </p>
                              <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span>{item.category}</span>
                                {quantity > 1 && (
                                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                                    x{quantity}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold dark:text-amber-400">
                              {formatCartMoney(item.price * quantity)}
                            </span>
                            <button
                              onClick={(e) => handleRemoveFromCart(item.id, e)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              aria-label={t("cart_remove_item", {
                                title: item.title,
                              })}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between font-display font-semibold text-sm text-slate-800 dark:text-slate-200 pt-1">
                        <span>{t("cart_total_checkout_value")}</span>
                        <span className="text-base font-mono font-bold text-sky-600 dark:text-amber-400">
                          {formatCartMoney(
                            cart.reduce((sum, item) => sum + item.price, 0),
                          )}
                        </span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="mt-2 w-full rounded-lg bg-sky-500 px-4 py-2 text-center font-display text-sm font-bold text-white shadow-[0_4px_0_0_#025272] transition-studio hover:translate-y-[1px] hover:bg-sky-400 active:translate-y-[3px] active:shadow-none"
                      >
                        {t("proceed_to_checkout")}
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-650">
                      <p className="text-sm">{t("cart_empty")}</p>
                      <button
                        onClick={() => {
                          setCurrentScreen("marketplace");
                          setIsCartOpen(false);
                        }}
                        className="mt-1 text-sm font-semibold text-amber-500 hover:underline"
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
                        <p className="text-sm font-semibold text-slate-850 dark:text-white truncate">
                          {currentUser.username}
                        </p>
                        <p className="mb-2 text-xs text-slate-455 dark:text-slate-400 truncate">
                          {currentUser.email}
                        </p>
                        <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentScreen("profile");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full cursor-pointer py-1.5 text-left text-sm font-medium text-slate-700 transition-colors hover:text-amber-500 dark:text-slate-200 dark:hover:text-amber-400"
                        >
                          {t("my_profile")}
                        </button>
                        {currentUser.role === "admin" && (
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              setCurrentScreen("admin");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="w-full cursor-pointer py-1.5 text-left text-sm font-medium text-slate-700 transition-colors hover:text-amber-500 dark:text-slate-200 dark:hover:text-amber-400"
                          >
                            {t("admin_portal")}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentScreen("wallet");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full cursor-pointer py-1.5 text-left text-sm font-medium text-slate-700 transition-colors hover:text-amber-500 dark:text-slate-200 dark:hover:text-amber-400"
                        >
                          {t("wallet")}
                        </button>
                        {currentUser.role === "customer" && (
                          <>
                            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                            <button
                              onClick={() => {
                                setIsProfileOpen(false);
                                setCurrentScreen("developer-onboarding");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="w-full cursor-pointer py-1.5 text-left text-sm font-medium text-amber-500 transition-colors hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                            >
                              {t("become_developer")}
                            </button>
                          </>
                        )}
                        <div className="border-t border-slate-100 dark:border-slate-805 my-1" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentUser(null);
                            setCurrentScreen("explore");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full cursor-pointer py-1 text-left text-sm font-medium text-rose-500 transition-colors hover:text-rose-650 dark:hover:text-rose-400"
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
                  className="shrink-0 whitespace-nowrap !text-sm"
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
                  className="shrink-0 whitespace-nowrap !text-sm"
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
      <div className="flex max-w-full justify-start gap-1 overflow-x-auto border-t border-white/10 bg-[#101116]/95 px-3 py-2 text-xs lg:hidden sm:justify-center">
        <button
          onClick={() => setCurrentScreen("marketplace")}
          className={`shrink-0 rounded px-2.5 py-1.5 font-medium ${currentScreen === "marketplace" ? "bg-[#292a31] font-bold text-white" : "text-[#aeb0bb]"}`}
        >
          {t("marketplace")}
        </button>
        <button
          onClick={handleOpenCreatorCenter}
          className={`shrink-0 rounded px-2.5 py-1.5 font-medium ${currentScreen === "upload" ? "bg-[#292a31] font-bold text-white" : "text-[#aeb0bb]"}`}
        >
          {t("creator_hub")}
        </button>
        <button
          onClick={() => setCurrentScreen("dashboard")}
          className={`shrink-0 rounded px-2.5 py-1.5 font-medium ${currentScreen === "dashboard" ? "bg-[#292a31] font-bold text-white" : "text-[#aeb0bb]"}`}
        >
          {t("dashboard")}
        </button>
        <button
          onClick={() => setCurrentScreen("community")}
          className={`shrink-0 rounded px-2.5 py-1.5 font-medium ${currentScreen === "community" ? "bg-[#292a31] font-bold text-white" : "text-[#aeb0bb]"}`}
        >
          {t("community")}
        </button>
      </div>

      <CreatorJourneyDialog
        isOpen={isCreatorJourneyDialogOpen}
        onBecomeDeveloper={handleBecomeDeveloper}
        onMaybeLater={handleMaybeLater}
        onClose={() => setIsCreatorJourneyDialogOpen(false)}
      />
    </header>
  );
}
