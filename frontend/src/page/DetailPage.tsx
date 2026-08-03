import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Star, Film, X, ChevronRight, Download } from "lucide-react";
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
  handleAuthorClick: (author: string) => void;
}

const resolveNumberLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split("-")[0];
  if (normalized === "en") return "en-US";
  if (normalized === "ja") return "ja-JP";
  return "vi-VN";
};

// Sanitization helper to replace banned em-dashes with regular hyphens
const cleanText = (str: string): string => {
  if (!str) return "";
  return str.replace(/—/g, "-");
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
  handleAuthorClick,
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
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === "left"
        ? scrollLeft - clientWidth * 0.75
        : scrollLeft + clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

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

    if (list.length <= 1) {
      list.push({ type: "image", url: IMAGE_SEED_MAP.interior });
      list.push({ type: "image", url: IMAGE_SEED_MAP.forest });
      list.push({ type: "image", url: IMAGE_SEED_MAP.char });
    }
    return list;
  }, [focusedAsset]);

  const activeMedia = mediaList[selectedThumbIndex];

  // Logic to parse and format the description to solve the wall-of-text issue
  const renderDescription = (text: string) => {
    const cleaned = cleanText(text);
    if (!cleaned) return null;

    const paragraphs = cleaned.split(/\n\n+/);
    return (
      <div className="space-y-4 font-sans text-sm text-[#b1bdcc] leading-relaxed">
        {paragraphs.map((para, idx) => {
          const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
          const isList = lines.every(line => /^[-*•]/.test(line));
          
          if (isList) {
            return (
              <ul key={idx} className="list-disc pl-5 space-y-2 text-[#b1bdcc]">
                {lines.map((line, lIdx) => (
                  <li key={lIdx}>
                    {line.replace(/^[-*•]\s*/, "")}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={idx} className="text-[#b1bdcc] text-justify">
              {lines.map((line, lIdx) => {
                if (/^[-*•]/.test(line)) {
                  return (
                    <span key={lIdx} className="flex items-start gap-2 mt-1.5 first:mt-0 pl-1">
                      <span className="text-[#fbbf24] mt-1.5 text-xs select-none">•</span>
                      <span>{line.replace(/^[-*•]\s*/, "")}</span>
                    </span>
                  );
                }
                return <React.Fragment key={lIdx}>{line} </React.Fragment>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-[#f4f7fb] animate-fade-in bg-[#06090f] min-h-[100dvh]">
      {/* Two-column layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        
        {/* Left Column: Gallery and Description Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Master Video/Image Viewer Frame */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[rgba(96,119,148,0.34)] bg-[#090e16]">
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
                alt={cleanText(t("detail.gallery.activeAlt"))}
                className="h-full w-full object-contain transition-all"
              />
            )}
          </div>

          {/* Thumbnails strip */}
          <div className="flex gap-3 max-w-full overflow-x-auto py-1">
            {mediaList.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedThumbIndex(index)}
                className={`relative aspect-video w-24 sm:w-28 rounded-md overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
                  selectedThumbIndex === index 
                    ? "border-[#fbbf24] scale-[1.02]" 
                    : "border-[rgba(96,119,148,0.34)] hover:border-slate-400"
                }`}
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
                      <div className="w-7 h-7 rounded-full bg-slate-900/70 flex items-center justify-center text-white border border-white/10 shadow-lg">
                        <Film className="text-[#fbbf24]" size={12} />
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

          {/* Description Tabs Panel */}
          <div className="bg-[#090e16] border border-[rgba(96,119,148,0.34)] rounded-lg p-6 space-y-6">
            <div className="flex items-center border-b border-[rgba(96,119,148,0.15)] pb-1 gap-4">
              <button
                onClick={() => setActiveDetailTab("overview")}
                className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-all ${
                  activeDetailTab === "overview" 
                    ? "border-[#fbbf24] text-[#f4f7fb]" 
                    : "border-transparent text-[#718096] hover:text-[#b1bdcc]"
                }`}
              >
                {t("detail.tabs.overview")}
              </button>
              {focusedAsset.webDemoUrl && (
                <button
                  onClick={() => setActiveDetailTab("tech")}
                  className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-all ${
                    activeDetailTab === "tech" 
                      ? "border-[#fbbf24] text-[#f4f7fb]" 
                      : "border-transparent text-[#718096] hover:text-[#b1bdcc]"
                  }`}
                >
                  {t("detail.tabs.playDemo")}
                </button>
              )}
              {focusedAsset.documentation && (
                <button
                  onClick={() => setActiveDetailTab("documentation")}
                  className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-all ${
                    activeDetailTab === "documentation" 
                      ? "border-[#fbbf24] text-[#f4f7fb]" 
                      : "border-transparent text-[#718096] hover:text-[#b1bdcc]"
                  }`}
                >
                  {t("detail.tabs.documentation")}
                </button>
              )}
            </div>

            {activeDetailTab === "documentation" ? (
              <div className="space-y-4 animate-fade-in">
                <div className="text-sm text-[#b1bdcc] leading-relaxed whitespace-pre-wrap font-sans bg-[#0e1520] p-4 rounded-md border border-[rgba(96,119,148,0.2)]">
                  {cleanText(focusedAsset.documentation)}
                </div>
              </div>
            ) : activeDetailTab === "overview" ? (
              <div className="space-y-4">
                {renderDescription(focusedAsset.description)}
                {focusedAsset.details && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold text-[#718096]">
                      {t("detail.overview.includedFeatures")}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#b1bdcc]">
                      {focusedAsset.details.featuresList.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
                            <Check size={10} />
                          </div>
                          {cleanText(feature)}
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
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[rgba(96,119,148,0.34)] bg-slate-950 shadow-md">
                      <iframe
                        src={focusedAsset.webDemoUrl}
                        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
                        allow="autoplay; fullscreen; gamepad; cross-origin-isolated"
                        className="w-full h-full border-none"
                        title={cleanText(t("detail.demo.iframeTitle", { title: focusedAsset.title }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center font-mono">
                      {t("detail.demo.tabNote")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    {t("detail.demo.noDemo")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Sidebar Info & Purchase */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          
          {/* Purchase Configuration Card */}
          <div className="bg-[#090e16] border border-[rgba(96,119,148,0.34)] rounded-lg p-5 space-y-5">
            
            {/* Author profile tag */}
            <div className="inline-flex max-w-fit items-center gap-2 rounded-full border border-[rgba(96,119,148,0.34)] bg-[#0e1520] px-3 py-1.5">
              <img
                referrerPolicy="no-referrer"
                src={focusedAsset.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80'}
                alt={cleanText(focusedAsset.author)}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-[11px] font-bold text-[#f4f7fb]">
                {cleanText(focusedAsset.author)}
              </span>
            </div>

            {/* Game / Asset Title */}
            <h2 className="font-display text-2xl font-bold leading-tight text-[#f4f7fb]">
              {cleanText(focusedAsset.title)}
            </h2>

            {/* Category Breadcrumbs */}
            {focusedAsset.category && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#38bdf8] font-semibold">
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => handleCategoryClick(getParentCategoryName(focusedAsset.category))}
                >
                  {cleanText(getParentCategoryName(focusedAsset.category))}
                </span>
                {getParentCategoryName(focusedAsset.category) !== focusedAsset.category && (
                  <>
                    <span className="text-slate-600 font-normal">&gt;</span>
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => handleCategoryClick(focusedAsset.category)}
                    >
                      {cleanText(focusedAsset.category)}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Price tag */}
            <p className="font-display text-xl font-bold text-[#fbbf24] pt-1">
              {focusedAsset.price === 0
                ? t("detail.pricing.freeDownload")
                : formatPrice(focusedAsset.price)}
            </p>

            {/* CTA action buttons */}
            <div className="space-y-2.5 pt-2">
              {isOwned ? (
                <div className="space-y-2 w-full">
                  <div className="w-full py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs font-bold text-emerald-500 font-display text-center">
                    {t("detail.pricing.ownedMessage")}
                  </div>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-4 text-xs font-bold font-display text-center transition-all cursor-pointer"
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
                    className="w-full py-2.5 px-4 bg-[#fbbf24] hover:bg-[#d97706] text-[#0f172a] font-bold rounded-md text-xs font-display text-center transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPreparingBuyNow
                      ? t("detail.actions.preparingPayment")
                      : focusedAsset.price === 0
                        ? t("detail.pricing.freeDownload")
                        : t("detail.actions.buyNowBankTransfer")}
                  </button>
                  <button
                    onClick={() => handleAddToCart(focusedAsset)}
                    className="w-full py-2.5 px-4 bg-transparent hover:bg-[#0e1520] text-[#f4f7fb] border border-[rgba(96,119,148,0.34)] rounded-md text-xs font-bold font-display text-center transition-all cursor-pointer"
                  >
                    {t("detail.actions.addToCart")}
                  </button>
                </>
              )}
            </div>

            <hr className="border-[rgba(96,119,148,0.15)]" />

            {/* Technical details specs metadata */}
            <div>
              <h3 className="text-xs font-bold text-[#718096] mb-3">
                {t("detail.meta.detailsTitle")}
              </h3>
              <div className="space-y-2.5 text-[11px] font-mono">
                <div className="flex justify-between border-b border-[rgba(96,119,148,0.1)] pb-1.5">
                  <span className="text-[#718096]">{t("detail.meta.version")}</span>
                  <span className="text-[#f4f7fb] font-bold">
                    {cleanText(focusedAsset.version || "1.0.0")}
                  </span>
                </div>

                {focusedAsset.supportedPlatforms && (
                  <div className="flex justify-between border-b border-[rgba(96,119,148,0.1)] pb-1.5">
                    <span className="text-[#718096]">{t("detail.meta.platforms")}</span>
                    <span className="text-[#f4f7fb] font-bold">
                      {cleanText(focusedAsset.supportedPlatforms)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-[rgba(96,119,148,0.1)] pb-1.5">
                  <span className="text-[#718096]">{t("detail.meta.lastUpdated")}</span>
                  <span className="text-[#f4f7fb] font-bold">
                    {cleanText(focusedAsset.lastUpdated)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">{t("detail.meta.fileSize")}</span>
                  <span className="text-[#f4f7fb] font-bold">
                    {t("detail.meta.fileSizeValue")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags list widget */}
          {focusedAsset.tagList && focusedAsset.tagList.length > 0 && (
            <div className="bg-[#090e16] border border-[rgba(96,119,148,0.34)] rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-[#718096]">
                {t("detail.tags.title")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {focusedAsset.tagList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-[#38bdf8]/20 transition-all cursor-pointer"
                    onClick={() => handleTagClick(tag)}
                  >
                    {cleanText(tag)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended related assets */}
          <div className="space-y-3">
            <div className="bg-[#090e16] border border-[rgba(96,119,148,0.34)] rounded-lg p-4">
              <h3 className="font-display font-bold text-sm text-[#f4f7fb]">
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
                    className="p-3 bg-[#0e1520] border border-[rgba(96,119,148,0.2)] rounded-md hover:bg-[#141e2b] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        referrerPolicy="no-referrer"
                        src={item.image}
                        alt={cleanText(item.title)}
                        className="w-10 h-10 object-cover rounded border border-[rgba(96,119,148,0.2)]"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#f4f7fb] truncate">
                          {cleanText(item.title)}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          {cleanText(item.category)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#fbbf24]">
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

      {/* More from author section (horizontal scroll carousel) */}
      {authorAssets.length > 0 && (
        <div className="bg-[#090e16] border border-[rgba(96,119,148,0.34)] rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 
              onClick={() => handleAuthorClick(focusedAsset.author)}
              className="font-display font-bold text-[1.4rem] text-[#f4f7fb] flex items-center gap-1.5 hover:text-[#38bdf8] cursor-pointer transition-colors group"
            >
              <span>{t("detail.author.moreFrom", { author: cleanText(focusedAsset.author) })}</span>
              <ChevronRight size={22} className="text-slate-500 group-hover:text-[#38bdf8] group-hover:translate-x-0.5 transition-all" />
            </h3>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => scroll("left")}
                className="p-1.5 rounded-full border border-[rgba(96,119,148,0.34)] bg-[#0e1520] hover:bg-[#141e2b] text-[#f4f7fb] cursor-pointer transition-all active:scale-90"
              >
                <ChevronRight size={14} className="rotate-180" />
              </button>
              <button 
                type="button" 
                onClick={() => scroll("right")}
                className="p-1.5 rounded-full border border-[rgba(96,119,148,0.34)] bg-[#0e1520] hover:bg-[#141e2b] text-[#f4f7fb] cursor-pointer transition-all active:scale-90"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth pb-1 snap-x"
          >
            {authorAssets.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  handleViewAssetDetails(item);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-[260px] shrink-0 snap-start bg-[#0e1520] border border-[rgba(96,119,148,0.2)] hover:border-[#fbbf24]/50 group/author-item cursor-pointer overflow-hidden rounded-lg transition-all duration-200 text-left"
              >
                <div className="aspect-[1.5/1] overflow-hidden bg-slate-950/20 relative border-b border-[rgba(96,119,148,0.2)]">
                  <img
                    referrerPolicy="no-referrer"
                    src={item.image}
                    alt={cleanText(item.title)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/author-item:scale-105"
                  />
                </div>
                <div className="p-3.5 space-y-1">
                  <h5 className="text-sm font-bold text-[#f4f7fb] line-clamp-1 group-hover/author-item:text-[#fbbf24] transition-colors duration-200" title={item.title}>
                    {cleanText(item.title)}
                  </h5>
                  <p className="text-xs text-[#718096] font-medium">
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

      {/* Play Game Demo fullscreen modal, tách khỏi tab Overview/Tech Specs để có không gian chơi thử lớn nhất có thể */}
      {isPlayDemoOpen && focusedAsset.webDemoUrl && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
          onClick={() => setIsPlayDemoOpen(false)}
        >
          <div className="w-full max-w-6xl flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-white truncate">
              {t("detail.demo.modalTitle", { title: cleanText(focusedAsset.title) })}
            </h3>
            <button
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
              onClick={() => setIsPlayDemoOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="relative w-full max-w-6xl aspect-video rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={focusedAsset.webDemoUrl}
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              allow="autoplay; fullscreen; gamepad; cross-origin-isolated"
              className="w-full h-full border-none"
              title={cleanText(t("detail.demo.iframeTitle", { title: focusedAsset.title }))}
            />
          </div>
          <p className="mt-3 text-center font-mono text-xs text-slate-500">
            {t("detail.demo.modalNote")}
          </p>
        </div>
      )}
    </div>
  );
};
