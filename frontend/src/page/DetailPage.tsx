import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, Star, Film, X, ChevronRight, Download, AlertTriangle, Flag, FileText } from "lucide-react";
import { Asset, User, CategoryResponse, PaymentResponse } from "../types";
import { resolveApiUrl } from "../utils/apiUrl";
import { IMAGE_SEED_MAP } from "../../assets/images";
import { gameApi } from "../api/gameApi";
import { ReviewSection } from "../components/ReviewSection";
import { agreementApi } from "../api/agreementApi";
import ReportDisputeModal from "../components/ReportDisputeModal";

const formatEulaContent = (text: string) => {
  if (!text) return <p className="text-slate-400">Đang tải thỏa thuận...</p>;

  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-3" />;

    // Title mapping (e.g. THỎA THUẬN CẤP PHÉP...)
    if (trimmed.toUpperCase() === trimmed && trimmed.length > 15 && !trimmed.match(/^[0-9]/)) {
      return (
        <h2 key={idx} className="text-base font-extrabold text-white tracking-wide border-b border-white/5 pb-2 mb-4 font-display">
          {trimmed}
        </h2>
      );
    }

    // Section headers (e.g. 1. CẤP PHÉP SỬ DỤNG NỘI DUNG)
    if (trimmed.match(/^[0-9]+\.\s/)) {
      return (
        <h3 key={idx} className="text-[13px] font-bold uppercase tracking-wider text-emerald-400 mt-5 mb-2 font-display flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {trimmed}
        </h3>
      );
    }

    // Bullet points (e.g. - Bán lại...)
    if (trimmed.startsWith('-')) {
      return (
        <li key={idx} className="ml-4 pl-1 text-[12.5px] leading-relaxed text-slate-300 dark:text-slate-200 list-disc font-sans">
          {trimmed.substring(1).trim()}
        </li>
      );
    }

    // Sub-sections (e.g. a. Quyền sở hữu:)
    if (trimmed.match(/^[a-z]\.\s/)) {
      return (
        <p key={idx} className="pl-3 text-[12.5px] leading-relaxed text-slate-300 dark:text-slate-200 font-sans">
          <span className="font-semibold text-emerald-300/90">{trimmed.substring(0, 3)}</span>
          {trimmed.substring(3)}
        </p>
      );
    }

    // Standard text line
    return (
      <p key={idx} className="text-[12.5px] leading-relaxed text-slate-300 dark:text-slate-200 font-sans">
        {trimmed}
      </p>
    );
  });
};

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
  creatorOwnedProductIds: Set<string>;
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
  creatorOwnedProductIds,
  purchaseOrderPayments,
  handleCategoryClick,
  handleTagClick,
  handleAuthorClick,
}) => {
  const { t, i18n } = useTranslation(["marketplace", "shared"]);
  const isOwned = ownedProductIds.has(focusedAsset.id);
  const isCreatorOwnedAsset = (asset: Asset) =>
    creatorOwnedProductIds.has(asset.id);
  const isCreatorOwner = React.useMemo(() => {
    const currentUserId = currentUser?.id;
    const currentEmail = currentUser?.email?.trim().toLowerCase();
    const sellerEmail = focusedAsset.sellerEmail?.trim().toLowerCase();
    return Boolean(
      (currentUserId && focusedAsset.sellerId === currentUserId) ||
      (currentEmail && sellerEmail && currentEmail === sellerEmail) ||
      creatorOwnedProductIds.has(focusedAsset.id)
    );
  }, [currentUser?.id, currentUser?.email, focusedAsset.sellerId, focusedAsset.sellerEmail, creatorOwnedProductIds, focusedAsset.id]);
  
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
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [showDownloadEula, setShowDownloadEula] = React.useState(false);
  const [downloadEulaText, setDownloadEulaText] = React.useState("");
  const [showBuyNowEula, setShowBuyNowEula] = React.useState(false);
  const [downloadCheckboxChecked, setDownloadCheckboxChecked] = React.useState(false);
  const [buyNowCheckboxChecked, setBuyNowCheckboxChecked] = React.useState(false);

  const handleBuyNowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast(t('app.toast.loginRequiredBuy'), "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!focusedAsset.itemType) {
      showToast(t('app.toast.onlyMarketplacePaymentSupported'), "warning");
      return;
    }

    if (isCreatorOwner) {
      showToast(t('app.toast.cannotBuyOwnProduct'), "warning");
      return;
    }

    if (isOwned) {
      showToast(t('app.toast.ownedAlready'), "warning");
      return;
    }

    try {
      const response = await agreementApi.getActive('BUYER_EULA');
      if (response.success && response.data) {
        setDownloadEulaText(response.data.content);
      }
    } catch (err) {
      console.error(err);
      setDownloadEulaText("THỎA THUẬN CẤP PHÉP NGƯỜI DÙNG CUỐI (EULA) CỦA GODOT LAUNCH\n\nThỏa thuận Cấp phép Người dùng Cuối này áp dụng cho việc bạn sử dụng các tài nguyên kỹ thuật số được cung cấp thông qua Chợ ứng dụng của Godot Launch. Bằng cách nhấn chọn xác nhận đồng ý hoặc tải xuống nội dung, bạn đồng ý tuân thủ các điều khoản trong thỏa thuận này.");
    }
    setBuyNowCheckboxChecked(false);
    setShowBuyNowEula(true);
  };

  const confirmBuyNowEula = async () => {
    setShowBuyNowEula(false);
    try {
      await agreementApi.accept('BUYER_EULA');
    } catch (err) {
      console.error("Failed to record EULA acceptance:", err);
    }
    handleBuyNow(focusedAsset);
  };

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      const statusRes = await agreementApi.getAcceptanceStatus('BUYER_EULA');
      if (statusRes.success && statusRes.data && statusRes.data.accepted) {
        if (downloadUrl) {
          window.location.href = downloadUrl;
        }
        return;
      }
    } catch (err) {
      console.error("Failed to fetch EULA acceptance status:", err);
    }

    try {
      const response = await agreementApi.getActive('BUYER_EULA');
      if (response.success && response.data) {
        setDownloadEulaText(response.data.content);
      } else {
        setDownloadEulaText("Thỏa thuận cấp phép người dùng cuối (EULA)");
      }
    } catch (err) {
      console.error(err);
      setDownloadEulaText("THỎA THUẬN CẤP PHÉP NGƯỜI DÙNG CUỐI (EULA) CỦA GODOT LAUNCH\n\nThỏa thuận Cấp phép Người dùng Cuối này áp dụng cho việc bạn sử dụng các tài nguyên kỹ thuật số được cung cấp thông qua Chợ ứng dụng của Godot Launch. Bằng cách nhấn chọn xác nhận đồng ý hoặc tải xuống nội dung, bạn đồng ý tuân thủ các điều khoản trong thỏa thuận này.");
    }
    setDownloadCheckboxChecked(false);
    setShowDownloadEula(true);
  };

  const confirmDownload = async () => {
    setShowDownloadEula(false);
    try {
      await agreementApi.accept('BUYER_EULA');
    } catch (err) {
      console.error("Failed to record EULA acceptance:", err);
    }
    if (downloadUrl) {
      window.location.href = downloadUrl;
    }
  };
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
      <div className="space-y-4 font-sans text-sm leading-relaxed text-slate-600 dark:text-[#b1bdcc]">
        {paragraphs.map((para, idx) => {
          const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
          const isList = lines.every(line => /^[-*•]/.test(line));
          
          if (isList) {
            return (
              <ul key={idx} className="list-disc space-y-2 pl-5 text-slate-600 dark:text-[#b1bdcc]">
                {lines.map((line, lIdx) => (
                  <li key={lIdx}>
                    {line.replace(/^[-*•]\s*/, "")}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={idx} className="text-justify text-slate-600 dark:text-[#b1bdcc]">
              {lines.map((line, lIdx) => {
                if (/^[-*•]/.test(line)) {
                  return (
                    <span key={lIdx} className="flex items-start gap-2 mt-1.5 first:mt-0 pl-1">
                      <span className="mt-1.5 select-none text-xs text-amber-500 dark:text-[#fbbf24]">•</span>
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
    <div className="min-h-[100dvh] space-y-6 bg-slate-50/80 dark:bg-[#06090f]/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-sm text-slate-900 animate-fade-in dark:text-[#f4f7fb]">
      {/* Two-column layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        
        {/* Left Column: Gallery and Description Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Master Video/Image Viewer Frame */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-[rgba(96,119,148,0.34)] dark:bg-[#090e16] dark:shadow-none">
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
                    ? "scale-[1.02] border-amber-400 shadow-sm"
                    : "border-slate-200 hover:border-slate-400 dark:border-[rgba(96,119,148,0.34)]"
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
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[rgba(96,119,148,0.34)] dark:bg-[#090e16] dark:shadow-none">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-1 dark:border-[rgba(96,119,148,0.15)]">
              <button
                onClick={() => setActiveDetailTab("overview")}
                className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-all ${
                  activeDetailTab === "overview" 
                    ? "border-amber-500 text-slate-900 dark:border-[#fbbf24] dark:text-[#f4f7fb]"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#718096] dark:hover:text-[#b1bdcc]"
                }`}
              >
                {t("detail.tabs.overview")}
              </button>
              {focusedAsset.webDemoUrl && (
                <button
                  onClick={() => setActiveDetailTab("tech")}
                  className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-all ${
                    activeDetailTab === "tech" 
                      ? "border-amber-500 text-slate-900 dark:border-[#fbbf24] dark:text-[#f4f7fb]"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#718096] dark:hover:text-[#b1bdcc]"
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
                      ? "border-amber-500 text-slate-900 dark:border-[#fbbf24] dark:text-[#f4f7fb]"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#718096] dark:hover:text-[#b1bdcc]"
                  }`}
                >
                  {t("detail.tabs.documentation")}
                </button>
              )}
            </div>

            {activeDetailTab === "documentation" ? (
              <div className="space-y-4 animate-fade-in">
                <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-600 dark:border-[rgba(96,119,148,0.2)] dark:bg-[#0e1520] dark:text-[#b1bdcc]">
                  {cleanText(focusedAsset.documentation)}
                </div>
              </div>
            ) : activeDetailTab === "overview" ? (
              <div className="space-y-4">
                {renderDescription(focusedAsset.description)}
                {focusedAsset.details && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-[#718096]">
                      {t("detail.overview.includedFeatures")}
                    </h4>
                    <ul className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2 dark:text-[#b1bdcc]">
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
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-950 shadow-md dark:border-[rgba(96,119,148,0.34)]">
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

          {/* Product Reviews & Ratings Section */}
          <ReviewSection
            productId={focusedAsset.id}
            productType={focusedAsset.itemType === 'asset' ? 'asset' : 'game'}
            currentUserId={currentUser?.id}
            currentUserEmail={currentUser?.email}
            isAdmin={currentUser?.role === 'admin'}
            sellerId={focusedAsset.sellerId}
            sellerEmail={focusedAsset.sellerEmail}
          />
        </div>

        {/* Right Column: Sticky Sidebar Info & Purchase */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          
          {/* Purchase Configuration Card */}
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[rgba(96,119,148,0.34)] dark:bg-[#090e16] dark:shadow-none">
            
            {/* Header row with Author profile tag and Flag icon */}
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex max-w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-[rgba(96,119,148,0.34)] dark:bg-[#0e1520]">
                <img
                  referrerPolicy="no-referrer"
                  src={focusedAsset.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80'}
                  alt={cleanText(focusedAsset.author)}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-[11px] font-bold text-slate-800 dark:text-[#f4f7fb]">
                  {cleanText(focusedAsset.author)}
                </span>
              </div>
              
              {currentUser && (currentUser.role === 'developer' || currentUser.role === 'admin') && !isCreatorOwner && (
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  title={t("reportDispute.title", { ns: "shared" })}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-md transition-all cursor-pointer"
                >
                  <Flag size={14} />
                </button>
              )}
            </div>

            {/* Game / Asset Title */}
            <h2 className="font-display text-2xl font-bold leading-tight text-slate-950 dark:text-[#f4f7fb]">
              {cleanText(focusedAsset.title)}
            </h2>

            {/* Category Breadcrumbs */}
            {focusedAsset.category && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-[#38bdf8]">
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
            <p className="pt-1 font-display text-xl font-bold text-amber-600 dark:text-[#fbbf24]">
              {focusedAsset.price === 0
                ? t("detail.pricing.freeDownload")
                : formatPrice(focusedAsset.price)}
            </p>

            {/* CTA action buttons */}
            <div className="space-y-2.5 pt-2">
              {isCreatorOwner ? (
                <div className="relative w-full overflow-hidden rounded-lg border border-sky-500/25 bg-gradient-to-r from-sky-500/12 via-cyan-500/8 to-transparent px-4 py-3.5 text-center">
                  <div className="pointer-events-none absolute -right-5 -top-8 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl" />
                  <div className="relative flex items-center justify-center gap-2 font-display text-xs font-bold text-sky-600 dark:text-sky-400">
                    <Check size={15} strokeWidth={2.5} />
                    {t("detail.pricing.ownerMessage")}
                  </div>
                </div>
              ) : isOwned ? (
                <div className="space-y-2 w-full">
                  <div className="w-full py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs font-bold text-emerald-500 font-display text-center">
                    {t("detail.pricing.ownedMessage")}
                  </div>
                  {downloadUrl && (
                    <a
                      href="#"
                      onClick={handleDownloadClick}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-4 text-xs font-bold font-display text-center transition-all cursor-pointer"
                    >
                      <Download size={14} /> {focusedAsset.itemType === "source_code" ? "Download Game Package" : "Download Asset Package"}
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={handleBuyNowClick}
                    disabled={isPreparingBuyNow}
                    className="w-full cursor-pointer rounded-lg bg-amber-400 px-4 py-2.5 text-center font-display text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:saturate-50 disabled:hover:bg-amber-400 dark:bg-[#fbbf24] dark:hover:bg-[#d97706] dark:disabled:hover:bg-[#fbbf24]"
                  >
                    {isPreparingBuyNow
                      ? t("detail.actions.preparingPayment")
                      : focusedAsset.price === 0
                        ? t("detail.pricing.freeDownload")
                        : t("detail.actions.buyNowBankTransfer")}
                  </button>
                  <button
                    onClick={() => handleAddToCart(focusedAsset)}
                    className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center font-display text-xs font-bold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white dark:border-[rgba(96,119,148,0.34)] dark:bg-transparent dark:text-[#f4f7fb] dark:hover:bg-[#0e1520] dark:disabled:hover:bg-transparent"
                  >
                    {t("detail.actions.addToCart")}
                  </button>
                </>
              )}
            </div>

            <hr className="border-slate-200 dark:border-[rgba(96,119,148,0.15)]" />

            {/* Technical details specs metadata */}
            <div>
              <h3 className="mb-3 text-xs font-bold text-slate-500 dark:text-[#718096]">
                {t("detail.meta.detailsTitle")}
              </h3>
              <div className="space-y-2.5 text-[11px] font-mono">
                <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-[rgba(96,119,148,0.1)]">
                  <span className="text-slate-500 dark:text-[#718096]">{t("detail.meta.version")}</span>
                  <span className="font-bold text-slate-800 dark:text-[#f4f7fb]">
                    {cleanText(focusedAsset.version || "1.0.0")}
                  </span>
                </div>


                <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-[rgba(96,119,148,0.1)]">
                  <span className="text-slate-500 dark:text-[#718096]">{t("detail.meta.lastUpdated")}</span>
                  <span className="font-bold text-slate-800 dark:text-[#f4f7fb]">
                    {cleanText(focusedAsset.lastUpdated)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#718096]">{t("detail.meta.fileSize")}</span>
                  <span className="font-bold text-slate-800 dark:text-[#f4f7fb]">
                    {t("detail.meta.fileSizeValue")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags list widget */}
          {focusedAsset.tagList && focusedAsset.tagList.length > 0 && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[rgba(96,119,148,0.34)] dark:bg-[#090e16] dark:shadow-none">
              <h3 className="text-xs font-bold text-slate-500 dark:text-[#718096]">
                {t("detail.tags.title")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {focusedAsset.tagList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="cursor-pointer rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-600 transition-all hover:bg-sky-500/20 dark:text-[#38bdf8]"
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[rgba(96,119,148,0.34)] dark:bg-[#090e16] dark:shadow-none">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-[#f4f7fb]">
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
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-[rgba(96,119,148,0.2)] dark:bg-[#0e1520] dark:shadow-none dark:hover:bg-[#141e2b]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        referrerPolicy="no-referrer"
                        src={item.image}
                        alt={cleanText(item.title)}
                        className="h-10 w-10 rounded border border-slate-200 object-cover dark:border-[rgba(96,119,148,0.2)]"
                      />
                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-semibold text-slate-900 dark:text-[#f4f7fb]">
                          {cleanText(item.title)}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          {cleanText(item.category)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isCreatorOwnedAsset(item) && (
                        <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-400">
                          {t("card.owner")}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-[#fbbf24]">
                        {item.price === 0
                          ? t("common.free")
                          : formatPrice(item.price)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* More from author section (horizontal scroll carousel) */}
      {authorAssets.length > 0 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[rgba(96,119,148,0.34)] dark:bg-[#090e16] dark:shadow-none">
          <div className="flex items-center justify-between">
            <h3 
              onClick={() => handleAuthorClick(focusedAsset.author)}
              className="group flex cursor-pointer items-center gap-1.5 font-display text-[1.4rem] font-bold text-slate-900 transition-colors hover:text-sky-600 dark:text-[#f4f7fb] dark:hover:text-[#38bdf8]"
            >
              <span>{t("detail.author.moreFrom", { author: cleanText(focusedAsset.author) })}</span>
              <ChevronRight size={22} className="text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-sky-600 dark:text-slate-500 dark:group-hover:text-[#38bdf8]" />
            </h3>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => scroll("left")}
                className="cursor-pointer rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-90 dark:border-[rgba(96,119,148,0.34)] dark:bg-[#0e1520] dark:text-[#f4f7fb] dark:shadow-none dark:hover:bg-[#141e2b]"
              >
                <ChevronRight size={14} className="rotate-180" />
              </button>
              <button 
                type="button" 
                onClick={() => scroll("right")}
                className="cursor-pointer rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-90 dark:border-[rgba(96,119,148,0.34)] dark:bg-[#0e1520] dark:text-[#f4f7fb] dark:shadow-none dark:hover:bg-[#141e2b]"
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
                className="group/author-item w-[260px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:shadow-md dark:border-[rgba(96,119,148,0.2)] dark:bg-[#0e1520] dark:shadow-none dark:hover:border-[#fbbf24]/50"
              >
                <div className="relative aspect-[1.5/1] overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-[rgba(96,119,148,0.2)] dark:bg-slate-950/20">
                  <img
                    referrerPolicy="no-referrer"
                    src={item.image}
                    alt={cleanText(item.title)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/author-item:scale-105"
                  />
                  {isCreatorOwnedAsset(item) && (
                    <span className="absolute right-2 top-2 rounded bg-sky-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {t("card.owner")}
                    </span>
                  )}
                </div>
                <div className="p-3.5 space-y-1">
                  <h5 className="line-clamp-1 text-sm font-bold text-slate-900 transition-colors duration-200 group-hover/author-item:text-amber-600 dark:text-[#f4f7fb] dark:group-hover/author-item:text-[#fbbf24]" title={item.title}>
                    {cleanText(item.title)}
                  </h5>
                  <p className="text-xs font-medium text-slate-500 dark:text-[#718096]">
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

      {isReportModalOpen && (
        <ReportDisputeModal
          gameId={focusedAsset.id}
          productTitle={focusedAsset.title}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            showToast(t("reportDispute.doneTitle", { ns: "shared" }), "success");
          }}
        />
      )}

      {showDownloadEula && createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowDownloadEula(false)}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0c101a]/95 dark:bg-[#070a13]/98 shadow-[0_32px_96px_rgba(0,0,0,0.85)] flex flex-col max-h-[82vh] animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-white text-base tracking-wide leading-none">Thỏa thuận Cấp phép EULA</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">PRE-DOWNLOAD EULA • THỎA THUẬN TRƯỚC KHI TẢI XUỐNG</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadEula(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {formatEulaContent(downloadEulaText)}
            </div>
            <div className="px-7 py-3 border-t border-white/5 bg-[#090d16]/40">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-transparent p-3 transition hover:border-amber-500/30">
                <input
                  type="checkbox"
                  checked={downloadCheckboxChecked}
                  onChange={(e) => setDownloadCheckboxChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-755 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <div className="text-xs text-slate-300">
                  Tôi đã đọc kĩ và đồng ý với Thỏa thuận Cấp phép Người dùng Cuối (EULA) của Godot Launch.
                </div>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4 bg-[#090d16]/80">
              <button
                type="button"
                onClick={() => setShowDownloadEula(false)}
                className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!downloadCheckboxChecked}
                onClick={confirmDownload}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:pointer-events-none px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} strokeWidth={2.5} />
                Tôi đồng ý
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showBuyNowEula && createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowBuyNowEula(false)}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0c101a]/95 dark:bg-[#070a13]/98 shadow-[0_32px_96px_rgba(0,0,0,0.85)] flex flex-col max-h-[82vh] animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-white text-base tracking-wide leading-none">Thỏa thuận Cấp phép EULA</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">BUYER EULA • THỎA THUẬN NGƯỜI DÙNG CUỐI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBuyNowEula(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {formatEulaContent(downloadEulaText)}
            </div>
            <div className="px-7 py-3 border-t border-white/5 bg-[#090d16]/40">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-transparent p-3 transition hover:border-amber-500/30">
                <input
                  type="checkbox"
                  checked={buyNowCheckboxChecked}
                  onChange={(e) => setBuyNowCheckboxChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-755 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <div className="text-xs text-slate-300">
                  Tôi đã đọc kĩ và đồng ý với Thỏa thuận Cấp phép Người dùng Cuối (EULA) của Godot Launch.
                </div>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4 bg-[#090d16]/80">
              <button
                type="button"
                onClick={() => setShowBuyNowEula(false)}
                className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!buyNowCheckboxChecked}
                onClick={confirmBuyNowEula}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:pointer-events-none px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} strokeWidth={2.5} />
                Tôi đồng ý
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
