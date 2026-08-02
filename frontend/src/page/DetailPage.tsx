import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Info, Star, Film, Play, X, ChevronRight, Download } from "lucide-react";
import { Button } from "../components/Button";
import { Asset, User, CategoryResponse, PaymentResponse } from "../types";
import { resolveApiUrl } from "../utils/apiUrl";
import { IMAGE_SEED_MAP } from "../../assets/images";
import { gameApi } from "../api/gameApi";

interface DetailPageProps {
  focusedAsset: Asset;
  setCurrentScreen: (screen: any) => void;
  selectedThumbIndex: number;
  setSelectedThumbIndex: (index: number) => void;
  activeDetailTab: string;
  setActiveDetailTab: (tab: "overview" | "tech" | "documentation") => void;
  handleAddToCart: (asset: Asset) => void;
  handleCheckout: () => void;
  handleBuyNow: (asset: Asset) => void;
  isPreparingBuyNow?: boolean;
  assets: Asset[];
  handleViewAssetDetails: (asset: Asset) => void;
  currentUser: User | null;
  showToast: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
  ownedProductIds: Set<string>;
  purchaseOrderPayments?: PaymentResponse[];
  handleCategoryClick: (category: string) => void;
  handleTagClick: (tag: string) => void;
}

const resolveNumberLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split("-")[0];
  if (normalized === "en") return "en-US";
  if (normalized === "ja") return "ja-JP";
  return "vi-VN";
};

export const DetailPage: React.FC<DetailPageProps> = ({
  focusedAsset,
  setCurrentScreen,
  selectedThumbIndex,
  setSelectedThumbIndex,
  activeDetailTab,
  setActiveDetailTab,
  handleAddToCart,
  handleCheckout,
  handleBuyNow,
  isPreparingBuyNow = false,
  assets,
  handleViewAssetDetails,
  currentUser,
  showToast,
  ownedProductIds,
  purchaseOrderPayments,
  handleCategoryClick,
  handleTagClick,
}) => {
  const { t, i18n } = useTranslation(["marketplace"]);
  const isOwned = ownedProductIds.has(focusedAsset.id);
  const downloadUrl = React.useMemo(() => {
    if (!purchaseOrderPayments) return null;
    const payment = purchaseOrderPayments.find(
      (p) => p.paymentStatus === 'PAID' && p.marketplaceItemId === focusedAsset.id
    );
    return payment ? resolveApiUrl(payment.downloadUrl) : null;
  }, [purchaseOrderPayments, focusedAsset.id]);
  const numberLocale = resolveNumberLocale(
    i18n.resolvedLanguage || i18n.language,
  );

  const [isPlayDemoOpen, setIsPlayDemoOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryResponse[]>([]);

  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const [gameRes, assetRes] = await Promise.all([
          gameApi.getCategories("game"),
          gameApi.getCategories("asset"),
        ]);
        const allCats: CategoryResponse[] = [];
        if (gameRes.success && gameRes.data) allCats.push(...gameRes.data);
        if (assetRes.success && assetRes.data) allCats.push(...assetRes.data);
        setCategories(allCats);
      } catch (err) {
        console.error("Failed to load categories in DetailPage:", err);
      }
    };
    loadCategories();
  }, []);

  React.useEffect(() => {
    if (activeDetailTab === "tech" && !focusedAsset.webDemoUrl) {
      setActiveDetailTab("overview");
    }
  }, [focusedAsset, activeDetailTab, setActiveDetailTab]);

  const getParentCategoryName = React.useCallback((categoryName: string): string => {
    if (!categoryName || categories.length === 0) return categoryName || "";
    const currentCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!currentCat) return categoryName;

    let parent = currentCat;
    let iterations = 0;
    while (parent.parentId && iterations < 10) {
      const nextParent = categories.find(c => c.id === parent.parentId);
      if (!nextParent) break;
      parent = nextParent;
      iterations++;
    }
    return parent.name;
  }, [categories]);

  const authorAssets = React.useMemo(() => {
    if (!focusedAsset.author || !assets) return [];
    return assets.filter(
      (item) =>
        item.id !== focusedAsset.id &&
        item.author &&
        item.author.toLowerCase() === focusedAsset.author.toLowerCase()
    );
  }, [focusedAsset.author, focusedAsset.id, assets]);

  const formatPrice = React.useCallback(
    (price: number) => `${new Intl.NumberFormat(numberLocale).format(price)} đ`,
    [numberLocale],
  );

  const handlePlayDemoClick = () => {
    if (!currentUser) {
      showToast(t("detail.demo.loginRequired"), "warning");
      setCurrentScreen("signin");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIsPlayDemoOpen(true);
  };

  const mediaList = React.useMemo(() => {
    const list: { type: "image" | "video"; url: string }[] = [];
    if (focusedAsset.image) {
      list.push({ type: "image", url: focusedAsset.image });
    }
    if (focusedAsset.videoUrl) {
      list.push({ type: "video", url: focusedAsset.videoUrl });
    }
    if (focusedAsset.screenshots && focusedAsset.screenshots.length > 0) {
      focusedAsset.screenshots.forEach((url) => {
        list.push({ type: "image", url });
      });
    }

    // Fallback if no screenshots or video uploaded
    if (list.length <= 1) {
      list.push({ type: "image", url: IMAGE_SEED_MAP.interior });
      list.push({ type: "image", url: IMAGE_SEED_MAP.forest });
      list.push({ type: "image", url: IMAGE_SEED_MAP.char });
    }
    return list;
  }, [focusedAsset]);

  const activeMedia = mediaList[selectedThumbIndex];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Split gallery box on top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        {/* Left Grid: Screen images deck */}
        <div className="lg:col-span-2 space-y-4">
          {/* Master picture frame display */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/95 dark:border-slate-800">
            {activeMedia?.type === "video" ? (
              <video
                src={activeMedia.url}
                controls
                className="h-full w-full object-contain"
              />
            ) : (
              <img
                referrerPolicy="no-referrer"
                src={activeMedia?.url}
                alt={t("detail.gallery.activeAlt")}
                className="h-full w-full object-contain transition-all"
              />
            )}
            <div className="absolute inset-0 bg-neutral-950/5 pointer-events-none"></div>
          </div>

          {/* Mini index thumbnails */}
          <div className="flex gap-3 max-w-full overflow-x-auto py-1">
            {mediaList.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedThumbIndex(index)}
                className={`relative aspect-video w-24 sm:w-28 rounded-lg overflow-hidden border-2 cursor-pointer transition-studio shrink-0 ${selectedThumbIndex === index ? "border-amber-400 scale-[1.02]" : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700"}`}
              >
                {item.type === "video" ? (
                  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover opacity-70"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10">
                      <div className="w-7 h-7 rounded-full bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white border border-white/10 shadow-lg">
                        <Film className="text-amber-400" size={12} />
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 rounded text-[8px] bg-slate-900 text-white font-mono">
                      {t("detail.gallery.videoBadge")}
                    </span>
                  </div>
                ) : (
                  <img
                    referrerPolicy="no-referrer"
                    src={item.url}
                    alt={t("detail.gallery.thumbnailAlt")}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
          {/* Description and technical tags selectors inside tabs */}
          <div className="dark-depth-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
            {/* Underlay toggles */}
            <div className="flex items-center border-b border-slate-100 dark:border-slate-850/80 pb-1.5 gap-4">
              <button
                onClick={() => setActiveDetailTab("overview")}
                className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-studio ${activeDetailTab === "overview" ? "border-amber-400 text-slate-800 dark:text-white" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
              >
                {t("detail.tabs.overview")}
              </button>
              {focusedAsset.webDemoUrl && (
                <button
                  onClick={() => setActiveDetailTab("tech")}
                  className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-studio ${activeDetailTab === "tech" ? "border-amber-400 text-slate-800 dark:text-white" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                >
                  {t("detail.tabs.playDemo")}
                </button>
              )}
              {focusedAsset.documentation && (
                <button
                  onClick={() => setActiveDetailTab("documentation")}
                  className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-studio ${activeDetailTab === "documentation" ? "border-amber-400 text-slate-800 dark:text-white" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                >
                  {t("detail.tabs.documentation")}
                </button>
              )}
            </div>

            {activeDetailTab === "documentation" ? (
              <div className="space-y-4 animate-fade-in">
                <div className="dark-depth-inset text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-955 p-4 rounded-xl border border-slate-200 dark:border-slate-850">
                  {focusedAsset.documentation}
                </div>
              </div>
            ) : activeDetailTab === "overview" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {focusedAsset.description}
                </p>
                {focusedAsset.details && (
                  <div className="space-y-3 pt-3">
                    <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {t("detail.overview.includedFeatures")}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-350">
                      {focusedAsset.details.featuresList.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
                            <Check size={10} />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {focusedAsset.webDemoUrl ? (
                  <>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-md">
                      <iframe
                        src={focusedAsset.webDemoUrl}
                        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
                        allow="autoplay; fullscreen; gamepad; cross-origin-isolated"
                        className="w-full h-full border-none"
                        title={t("detail.demo.iframeTitle", { title: focusedAsset.title })}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center font-mono">
                      {t("detail.demo.tabNote")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("detail.demo.noDemo")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Purchase checklist sidebar column on right */}
        <div className="space-y-6">
          {/* Product Purchase configuration */}
          <div className="dark-depth-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs">
            
            {/* Author Profile Pill */}
            <div className="inline-flex max-w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 shadow-md dark:border-slate-700 dark:bg-slate-800/90">
              <img
                referrerPolicy="no-referrer"
                src={focusedAsset.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80'}
                alt={focusedAsset.author}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                {focusedAsset.author}
              </span>
            </div>

            {/* Game Title */}
            <h2 className="font-display text-[2rem] font-bold leading-[1.1] text-slate-850 dark:text-white">
              {focusedAsset.title}
            </h2>

            {/* Tags / Category Breadcrumb */}
            {focusedAsset.category && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-sky-500 dark:text-sky-400 font-semibold">
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => handleCategoryClick(getParentCategoryName(focusedAsset.category))}
                >
                  {getParentCategoryName(focusedAsset.category)}
                </span>
                {getParentCategoryName(focusedAsset.category) !== focusedAsset.category && (
                  <>
                    <span className="text-slate-400 dark:text-slate-600 font-normal">&gt;</span>
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => handleCategoryClick(focusedAsset.category)}
                    >
                      {focusedAsset.category}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Price Display */}
            <p className="font-display text-xl font-bold text-amber-400 pt-1">
              {focusedAsset.price === 0
                ? t("detail.pricing.freeDownload")
                : formatPrice(focusedAsset.price)}
            </p>

            {/* Purchase actions (No Wishlist, Buy Now on top, Add to Cart below) */}
            <div className="space-y-2.5 pt-2">
              {isOwned ? (
                <div className="space-y-2 w-full">
                  <div className="w-full py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-500 font-display text-center">
                    {t("detail.pricing.ownedMessage")}
                  </div>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white py-2.5 px-4 text-xs font-bold font-display text-center transition-studio cursor-pointer shadow-md"
                    >
                      <Download size={14} /> Download Asset Package
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleBuyNow(focusedAsset)}
                    disabled={isPreparingBuyNow}
                    className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white rounded-lg text-xs font-bold font-display text-center transition-studio cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isPreparingBuyNow
                      ? t("detail.actions.preparingPayment")
                      : t("detail.actions.buyNowBankTransfer")}
                  </button>
                  <Button
                    variant="secondary"
                    className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 font-display text-center transition-studio cursor-pointer border border-slate-200 dark:border-slate-700/60"
                    size="md"
                    onClick={() => handleAddToCart(focusedAsset)}
                  >
                    {t("detail.actions.addToCart")}
                  </Button>
                </>
              )}
            </div>

            <hr className="border-slate-100 dark:border-slate-850/60" />

            {/* Metadata (Details) Section */}
            <div className="space-y-3.5 text-xs text-slate-655 dark:text-slate-400">
              <div>
                <h3 className="mb-3.5 font-display text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {t("detail.meta.detailsTitle")}
                </h3>
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span>{t("detail.meta.version")}</span>
                    <span className="text-slate-800 dark:text-white font-bold">
                      {focusedAsset.version || "1.0.0"}
                    </span>
                  </div>

                  {focusedAsset.supportedPlatforms && (
                    <div className="flex justify-between">
                      <span>{t("detail.meta.platforms")}</span>
                      <span className="text-slate-800 dark:text-white font-bold">
                        {focusedAsset.supportedPlatforms}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t("detail.meta.lastUpdated")}</span>
                    <span className="text-slate-800 dark:text-white font-bold">
                      {focusedAsset.lastUpdated}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("detail.meta.fileSize")}</span>
                    <span className="text-slate-800 dark:text-white font-bold">
                      {t("detail.meta.fileSizeValue")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags list widget */}
          {focusedAsset.tagList && focusedAsset.tagList.length > 0 && (
            <div className="dark-depth-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t("detail.tags.title")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {focusedAsset.tagList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-sky-500/10 dark:bg-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/10 dark:border-sky-500/20 shadow-xs cursor-pointer hover:bg-sky-500/20 dark:hover:bg-sky-500/30 transition-colors"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Related Assets suggestions from same category */}
          <div className="space-y-3">
            <div className="dark-depth-card bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 shadow-sm">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                {t("detail.related.title")}
              </h3>
            </div>
            <div className="space-y-3">
              {assets
                .filter((item) => item.id !== focusedAsset.id)
                .slice(0, 2)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleViewAssetDetails(item)}
                    className="dark-depth-inset p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/20 cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        referrerPolicy="no-referrer"
                        src={item.image}
                        alt={item.title}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.category}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-500">
                      {item.price === 0
                        ? t("common.free")
                        : formatPrice(item.price)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* More from [Author] section */}
      {authorAssets.length > 0 && (
        <div className="dark-depth-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-[1.4rem] text-slate-850 dark:text-white flex items-center gap-1.5 hover:text-sky-500 cursor-pointer transition-colors group">
              <span>{t("detail.author.moreFrom", { author: focusedAsset.author })}</span>
              <ChevronRight size={22} className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
            </h3>
            <div className="flex items-center gap-2">
              <button type="button" className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60">
                <ChevronRight size={14} className="rotate-180" />
              </button>
              <button type="button" className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {authorAssets.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  handleViewAssetDetails(item);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="dark-depth-inset group/author-item cursor-pointer overflow-hidden rounded-xl border border-slate-250 bg-white hover:border-[#FE9A00]/50 hover:shadow-md dark:border-slate-850 dark:bg-slate-950/20 dark:hover:border-[#FE9A00]/50 transition-all duration-200"
              >
                <div className="aspect-[1.5/1] overflow-hidden bg-slate-950/20 relative border-b border-slate-200 dark:border-slate-800">
                  <img
                    referrerPolicy="no-referrer"
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/author-item:scale-105"
                  />
                </div>
                <div className="p-3.5 space-y-1 text-left">
                  <h5 className="text-sm font-bold text-slate-850 dark:text-white line-clamp-1 group-hover/author-item:text-[#FE9A00] transition-colors duration-200" title={item.title}>
                    {item.title}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-455 font-medium">
                    {item.price === 0
                      ? t("common.free")
                      : `${t("common.from")} ${formatPrice(item.price)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Play Game Demo — fullscreen modal, tách khỏi tab Overview/Tech Specs để có không gian chơi thử lớn nhất có thể */}
      {isPlayDemoOpen && focusedAsset.webDemoUrl && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
          onClick={() => setIsPlayDemoOpen(false)}
        >
          <div className="w-full max-w-6xl flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-white truncate">
              {t("detail.demo.modalTitle", { title: focusedAsset.title })}
            </h3>
            <button
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-studio active:scale-95 cursor-pointer shrink-0"
              onClick={() => setIsPlayDemoOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="relative w-full max-w-6xl aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={focusedAsset.webDemoUrl}
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              allow="autoplay; fullscreen; gamepad; cross-origin-isolated"
              className="w-full h-full border-none"
              title={t("detail.demo.iframeTitle", { title: focusedAsset.title })}
            />
          </div>
          <p className="mt-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
            {t("detail.demo.modalNote")}
          </p>
        </div>
      )}
    </div>
  );
};
