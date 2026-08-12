  import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Video,
  Image,
  RefreshCw,
  X,
  AlertTriangle,
  FileCheck,
  PenTool,
  FileText,
  ShoppingBag,
  Gamepad2,
  Trash2,
  WalletCards,
  TrendingUp,
  Github,
  Upload,
} from "lucide-react";
import axios from "axios";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import {
  Project,
  User,
  GameResponse,
  ContractResponse,
  MarketplaceItemResponse,
  PaymentResponse,
  DeveloperSalesStatsResponse,
} from "../types";
import { gameApi } from "../api/gameApi";
import { contractApi } from "../api/contractApi";
import { marketplaceApi } from "../api/marketplaceApi";
import { walletApi } from "../api/walletApi";
import { useToast } from "../hooks/useToast";
import { SignaturePad } from "../components/SignaturePad";
import { ContractViewerModal } from "../components/ContractViewerModal";
import { EditGameModal } from "../components/EditGameModal";
import { DashboardFilterSelect } from "../components/developer-dashboard/DashboardFilterSelect";
import { DashboardSidebar } from "../components/developer-dashboard/DashboardSidebar";
import type {
  DashboardWorkspaceId,
  DashboardWorkspaceItem,
} from "../components/developer-dashboard/DashboardSidebar";
import { PaymentDetailPage } from "./PaymentDetailPage";

interface DashboardPageProps {
  currentUser: User | null;
  projectRepositories: Project[];
  purchasedPayments: PaymentResponse[];
  selectedPaymentOrderId: string | null;
  setSelectedPaymentOrderId: (orderId: string) => void;
  isRefreshingPayments: boolean;
  onRefreshPayments: () => void;
  onCancelPayment: (paymentId: string) => Promise<void>;
  setCurrentScreen: (screen: any) => void;
}

const getContractStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status?.toLowerCase()) {
    case "signed":
      return {
        text: t("dashboard:contracts.status.signed"),
        colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "pending":
      return {
        text: t("dashboard:contracts.status.awaitingYourSign"),
        colorClass:
          "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
      };
    case "cancelled":
      return {
        text: t("dashboard:contracts.status.cancelled"),
        colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      };
    case "expired":
      return {
        text: t("dashboard:contracts.status.expired"),
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
    default:
      return {
        text: status || t("dashboard:contracts.status.unknown"),
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
  }
};

const getGameStatusLabel = (
  status: string | undefined,
  t: (key: string) => string,
) => {
  switch (status?.toLowerCase()) {
    case "published":
      return t("dashboard:status.game.published");
    case "pending":
      return t("dashboard:status.game.pending");
    case "rejected":
      return t("dashboard:status.game.rejected");
    case "draft":
      return t("dashboard:status.game.draft");
    default:
      return status || t("dashboard:status.game.unknown");
  }
};

const getMarketplaceStatusLabel = (
  status: string | undefined,
  t: (key: string) => string,
) => {
  switch (status) {
    case "active":
      return t("dashboard:status.asset.active");
    case "pending":
      return t("dashboard:status.asset.pending");
    case "rejected":
      return t("dashboard:status.asset.rejected");
    case "removed":
      return t("dashboard:status.asset.removed");
    default:
      return status || t("dashboard:status.asset.unknown");
  }
};

const formatCurrencyValue = (
  value: number | undefined,
  locale: string,
  t: (key: string) => string,
) => {
  if (value === 0 || value === undefined) {
    return t("dashboard:table.free");
  }
  return `${value.toLocaleString(locale)} ${t("dashboard:table.currencyVnd")}`;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  projectRepositories,
  purchasedPayments,
  selectedPaymentOrderId,
  setSelectedPaymentOrderId,
  isRefreshingPayments,
  onRefreshPayments,
  onCancelPayment,
  setCurrentScreen,
}) => {
  const { t, i18n } = useTranslation(["dashboard"]);
  const { showToast } = useToast();
  const locale = React.useMemo(() => {
    const language = i18n.resolvedLanguage || i18n.language || "vi";
    return language === "vi" ? "vi-VN" : language === "ja" ? "ja-JP" : "en-US";
  }, [i18n.language, i18n.resolvedLanguage]);

  const isDeveloperOrAdmin = currentUser?.role === "developer" || currentUser?.role === "admin";

  // Tab control: 'my-games' | 'marketplace-items' | 'sales' | 'payment-center'
  const [activeTab, setActiveTab] =
    useState<DashboardWorkspaceId>(isDeveloperOrAdmin ? "my-games" : "payment-center");

  // Game & Asset status filters
  const [gameStatusFilter, setGameStatusFilter] = useState<string>("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all");
  const [marketplaceTypeFilter, setMarketplaceTypeFilter] = useState<
    "all" | "game" | "asset"
  >("all");

  // Real Game list state
  const [myGames, setMyGames] = useState<GameResponse[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [expandedMarketplaceId, setExpandedMarketplaceId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
    type: "game" | "asset";
    originalItem: any;
  } | null>(null);

  const handleOpenEditModal = (id: string, title: string, type: "game" | "asset", originalItem: any) => {
    setEditingItem({ id, title, type, originalItem });
    setIsEditModalOpen(true);
  };

  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(
    null,
  );

  // Real Marketplace Items state
  const [myMarketplaceItems, setMyMarketplaceItems] = useState<
    MarketplaceItemResponse[]
  >([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] =
    useState<boolean>(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [isOpenLightbox, setIsOpenLightbox] = useState<boolean>(false);

  // Real Sales Stats state (units sold + revenue as seller)
  const [salesStats, setSalesStats] =
    useState<DeveloperSalesStatsResponse | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState<boolean>(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Contract integration states
  const [contracts, setContracts] = useState<ContractResponse[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState<boolean>(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [selectedContract, setSelectedContract] =
    useState<ContractResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewerMode, setViewerMode] = useState<"view" | "sign-developer">(
    "view",
  );

  // Form fields for Developer Signature
  const [sellerRepresentative, setSellerRepresentative] = useState<string>("");
  const [sellerAddress, setSellerAddress] = useState<string>("");
  const [sellerTaxCode, setSellerTaxCode] = useState<string>("");
  const [developerSignatureBase64, setDeveloperSignatureBase64] = useState<
    string | null
  >(null);
  const [isSubmittingSignature, setIsSubmittingSignature] =
    useState<boolean>(false);
  const dashboardWorkspaceRef = React.useRef<HTMLDivElement | null>(null);

  const [zippingId, setZippingId] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [zipError, setZipError] = useState<string | null>(null);

  const extractObjectKey = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      return decodeURIComponent(parsedUrl.pathname.substring(1));
    } catch (e) {
      const prefix = ".amazonaws.com/";
      const idx = url.indexOf(prefix);
      if (idx !== -1) {
        const remaining = url.substring(idx + prefix.length);
        const queryIdx = remaining.indexOf("?");
        return queryIdx !== -1 ? remaining.substring(0, queryIdx) : remaining;
      }
      return url;
    }
  };

  const handleUploadZip = async (id: string, type: "game" | "asset", file: File) => {
    setZippingId(id);
    setZipProgress(0);
    setZipError(null);
    try {
      if (type === "asset") {
        const res = await marketplaceApi.uploadItemFile(id, file, (percent) => {
          setZipProgress(percent);
        });
        if (res.success) {
          showToast("Gửi yêu cầu cập nhật tài nguyên thành công! Bản cập nhật đang được quét bảo mật và chờ Admin duyệt.", 'success');
          fetchMyGames();
          fetchMyMarketplaceItems();
        } else {
          setZipError(res.message || "Không thể tải lên tệp tài nguyên.");
        }
      } else {
        const urlRes = await gameApi.getPresignedUrl(id, "game", file.type);
        if (!urlRes.success || !urlRes.data?.uploadUrl) {
          throw new Error(urlRes.message || "Không thể lấy link tải lên.");
        }
        const uploadUrl = urlRes.data.uploadUrl;

        await axios.put(uploadUrl, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size;
            const percent = Math.round((progressEvent.loaded * 100) / total);
            setZipProgress(percent);
          },
        });

        const objectKey = extractObjectKey(uploadUrl);
        const confirmRes = await gameApi.confirmUploadComplete(id, "game", objectKey);
        if (confirmRes.success) {
          showToast("Tải lên file game mới thành công! Bản cập nhật đang được quét bảo mật và chờ Admin duyệt.", 'success');
          fetchMyGames();
          fetchMyMarketplaceItems();
        } else {
          setZipError(confirmRes.message || "Không thể xác nhận hoàn thành tải lên.");
        }
      }
    } catch (err: any) {
      setZipError(
        err.response?.data?.message || err.message || "Lỗi khi tải lên file ZIP."
      );
    } finally {
      setZippingId(null);
    }
  };

  const [syncingGameId, setSyncingGameId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSyncRepo = async (gameId: string, repoUrl: string, branch?: string) => {
    setSyncingGameId(gameId);
    setSyncError(null);
    try {
      const res = await gameApi.submitGameRepo(gameId, repoUrl, branch);
      if (res.success) {
        showToast("Gửi yêu cầu đồng bộ thành công! Bản cập nhật đang được quét bảo mật và chờ Admin duyệt.", 'success');
        fetchMyGames();
        fetchMyMarketplaceItems();
      } else {
        setSyncError(res.message || "Không thể đồng bộ repository.");
      }
    } catch (err: any) {
      setSyncError(
        err.response?.data?.message || err.message || "Lỗi kết nối khi đồng bộ."
      );
    } finally {
      setSyncingGameId(null);
    }
  };

  const fetchMyGames = async (): Promise<boolean> => {
    if (!currentUser?.email) return false;
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const response = await gameApi.getAllGames();
      if (response.success && response.data) {
        // Filter by creatorName matching current user's email
        const filtered = response.data.filter(
          (game) =>
            game.creatorName?.toLowerCase() === currentUser.email.toLowerCase(),
        );
        setMyGames(filtered);
        return true;
      } else {
        setGamesError(
          response.message ||
            t("dashboard:table.errorGames", {
              message: t("dashboard:errors.loadGames"),
            }),
        );
        return false;
      }
    } catch (err: any) {
      setGamesError(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:table.errorGames", {
            message: t("dashboard:errors.fetchGames"),
          }),
      );
      return false;
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchMyMarketplaceItems = async (): Promise<boolean> => {
    if (!currentUser?.email) return false;
    setIsLoadingMarketplace(true);
    setMarketplaceError(null);
    try {
      const response = await marketplaceApi.getMyMarketplaceItems();
      if (response.success && response.data) {
        setMyMarketplaceItems(response.data);
        return true;
      } else {
        setMarketplaceError(
          response.message ||
            t("dashboard:table.errorAssets", {
              message: t("dashboard:errors.loadMarketplaceItems"),
            }),
        );
        return false;
      }
    } catch (err: any) {
      setMarketplaceError(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:table.errorAssets", {
            message: t("dashboard:errors.fetchMarketplaceItems"),
          }),
      );
      return false;
    } finally {
      setIsLoadingMarketplace(false);
    }
  };

  const handleDeleteMarketplaceItem = async (id: string) => {
    if (!window.confirm(t("dashboard:contracts.deleteConfirm"))) {
      return;
    }
    try {
      const res = await marketplaceApi.deleteMarketplaceItem(id);
      if (res.success) {
        showToast(t("dashboard:contracts.deleteSuccess"), 'success');
        fetchMyMarketplaceItems();
      } else {
        showToast(res.message || t("dashboard:contracts.deleteFail"), 'error');
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:contracts.deleteError"),
        'error',
      );
    }
  };

  const fetchMyContracts = async (): Promise<boolean> => {
    if (!currentUser?.email) return false;
    setIsLoadingContracts(true);
    try {
      const response = await contractApi.getMyContracts();
      if (response.success && response.data) {
        setContracts(response.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to fetch contracts", err);
      return false;
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const fetchSalesStats = async (): Promise<boolean> => {
    if (!currentUser?.email) return false;
    setIsLoadingSales(true);
    setSalesError(null);
    try {
      const response = await walletApi.getDeveloperSalesStats();
      if (response.success && response.data) {
        setSalesStats(response.data);
        return true;
      } else {
        setSalesError(
          response.message || t("dashboard:errors.loadSalesStatistics"),
        );
        return false;
      }
    } catch (err: any) {
      setSalesError(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:errors.fetchSalesStatistics"),
      );
      return false;
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleOpenSignModal = (contract: ContractResponse) => {
    setSelectedContract(contract);
    // Prefill details with developer's full name, not email
    setSellerRepresentative(currentUser?.fullName || "");
    setSellerAddress(contract.sellerAddress || "");
    setSellerTaxCode(contract.sellerTaxCode || "");
    setDeveloperSignatureBase64(null);
    setIsSignModalOpen(true);
  };

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !developerSignatureBase64) return;

    setIsSubmittingSignature(true);
    try {
      const response = await contractApi.signByDeveloper(
        selectedContract.id,
        developerSignatureBase64,
        sellerRepresentative,
        sellerAddress,
        sellerTaxCode,
      );
      if (response.success) {
        showToast(t("dashboard:contracts.signSuccess"), 'success');
        setIsSignModalOpen(false);
        fetchMyGames();
        fetchMyContracts();
      } else {
        showToast(response.message || t("dashboard:contracts.signErrorMessage"), 'error');
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:contracts.signError"),
        'error',
      );
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  useEffect(() => {
    fetchMyGames();
    fetchMyMarketplaceItems();
    fetchMyContracts();
    fetchSalesStats();
  }, [currentUser]);

  const gameFilterOptions = [
    {
      label: t("dashboard:filters.all"),
      value: "all",
      tone: "neutral" as const,
    },
    {
      label: t("dashboard:filters.publishedSigned"),
      value: "published_signed",
      tone: "success" as const,
    },
    {
      label: t("dashboard:filters.pendingSigning"),
      value: "pending_signing",
      tone: "warning" as const,
    },
    {
      label: t("dashboard:filters.negotiating"),
      value: "negotiating",
      tone: "info" as const,
    },
    {
      label: t("dashboard:filters.rejected"),
      value: "rejected",
      tone: "danger" as const,
    },
    {
      label: t("dashboard:filters.draft"),
      value: "draft",
      tone: "neutral" as const,
    },
  ];

  const assetFilterOptions = [
    {
      label: t("dashboard:filters.all"),
      value: "all",
      tone: "neutral" as const,
    },
    {
      label: t("dashboard:filters.active"),
      value: "active",
      tone: "success" as const,
    },
    {
      label: t("dashboard:filters.pending"),
      value: "pending",
      tone: "warning" as const,
    },
    {
      label: t("dashboard:filters.rejected"),
      value: "rejected",
      tone: "danger" as const,
    },
    {
      label: t("dashboard:filters.removed"),
      value: "removed",
      tone: "neutral" as const,
    },
  ];

  const marketplaceTypeFilterOptions = [
    {
      label: t("dashboard:filters.allProducts"),
      value: "all" as const,
      tone: "neutral" as const,
    },
    {
      label: t("dashboard:filters.productGame"),
      value: "game" as const,
      tone: "info" as const,
    },
    {
      label: t("dashboard:filters.productAsset"),
      value: "asset" as const,
      tone: "warning" as const,
    },
  ];

  // Store games: games not listed as marketplace_listing
  const storeGames = myGames.filter(
    (game) => game.publishingType !== "marketplace_listing"
  );

  // Marketplace games: games listed as marketplace_listing
  const marketplaceGames = myGames.filter(
    (game) => game.publishingType === "marketplace_listing"
  );

  const filteredGames = storeGames
    .filter((game) => {
      if (gameStatusFilter === "all") return true;

      const contract = [...contracts]
        .reverse()
        .find((c) => c.gameId === game.id && c.status !== "cancelled");

      if (gameStatusFilter === "published_signed") {
        if (contract) return contract.status === "signed";
        return game.status?.toLowerCase() === "published";
      }

      if (gameStatusFilter === "pending_signing") {
        if (contract) return contract.status === "pending";
        return game.status?.toLowerCase() === "pending";
      }

      if (gameStatusFilter === "negotiating") {
        const latestContract = [...contracts]
          .reverse()
          .find((c) => c.gameId === game.id);
        return latestContract?.status === "cancelled";
      }

      if (gameStatusFilter === "rejected") {
        return game.status?.toLowerCase() === "rejected";
      }

      if (gameStatusFilter === "draft") {
        return game.status?.toLowerCase() === "draft";
      }

      return true;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const combinedMarketplaceItems = [
    ...myMarketplaceItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: "asset" as const,
      categoryName: item.categoryName,
      price: item.price,
      status: item.status, // active, pending, rejected, removed
      createdAt: item.createdAt,
      originalItem: item,
    })),
    ...marketplaceGames.map((game) => ({
      id: game.id,
      title: game.title,
      type: "game" as const,
      categoryName: game.categoryName,
      price: game.priceProposed || 0,
      status: game.status?.toLowerCase() === "published" ? "active" : game.status?.toLowerCase() || "pending", // map published to active
      createdAt: game.createdAt,
      originalItem: game,
    })),
  ];

  const filteredMarketplaceItems = combinedMarketplaceItems
    .filter((item) => {
      // 1. Filter by product type
      if (marketplaceTypeFilter === "game" && item.type !== "game") return false;
      if (marketplaceTypeFilter === "asset" && item.type !== "asset") return false;

      // 2. Filter by status
      if (assetStatusFilter === "all") return true;

      // Map active to published for games
      if (assetStatusFilter === "active") {
        return item.status === "active" || item.status === "published";
      }
      return item.status === assetStatusFilter;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const workspaceItems: DashboardWorkspaceItem[] = [
    ...(isDeveloperOrAdmin
      ? [
          {
            id: "my-games" as const,
            label: t("dashboard:tabs.publishedGames"),
            count: storeGames.length,
            icon: Gamepad2,
          },
          {
            id: "marketplace-items" as const,
            label: t("dashboard:tabs.marketplaceAssets"),
            count: combinedMarketplaceItems.length,
            icon: ShoppingBag,
          },
          {
            id: "sales" as const,
            label: t("dashboard:tabs.soldOrders"),
            count: salesStats?.totalUnitsSold ?? 0,
            icon: TrendingUp,
          },
        ]
      : []),
    {
      id: "payment-center" as const,
      label: t("dashboard:tabs.purchasedOrders"),
      count: purchasedPayments.length,
      icon: WalletCards,
    },
  ];

  return (
    <>
      <div className="space-y-6 animate-fade-in py-2">
        {/* Quick counters grid */}
        {isDeveloperOrAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="dark-depth-card space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-sans tracking-wider text-slate-550 dark:text-slate-400 font-bold">
                {t("dashboard:stats.revenue")}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-emerald-500 font-bold font-sans">
                  +12%
                </span>
                <span className="text-2xl font-sans font-bold dark:text-white">
                  {(salesStats?.totalRevenue ?? 0).toLocaleString(locale)}
                </span>
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-350 ml-1">
                  VND
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-tight">
                {t("dashboard:stats.revenueHint")}
              </p>
            </div>

            <div className="dark-depth-card space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-sans tracking-wider text-slate-550 dark:text-slate-400 font-bold">
                {t("dashboard:stats.unitsSold")}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-sans font-bold dark:text-white">
                  {salesStats?.totalUnitsSold ?? 0}
                </span>
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-350 ml-1">
                  {t("dashboard:stats.unitsLabel").toLowerCase()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-tight">
                {t("dashboard:stats.unitsSoldHint")}
              </p>
            </div>

            <div className="dark-depth-card space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-sans tracking-wider text-slate-550 dark:text-slate-400 font-bold">
                {t("dashboard:stats.publishedGames")}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-sans font-bold dark:text-white">
                  {storeGames.length}
                </span>
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-350 ml-1">
                  {t("dashboard:table.game").toLowerCase()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-tight">
                {t("dashboard:stats.publishedGamesHint")}
              </p>
            </div>

            <div className="dark-depth-card space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-sans tracking-wider text-slate-550 dark:text-slate-400 font-bold">
                {t("dashboard:stats.marketplaceItems")}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-sans font-bold dark:text-white">
                  {combinedMarketplaceItems.length}
                </span>
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-350 ml-1">
                  {t("dashboard:table.resource").toLowerCase()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-tight">
                {t("dashboard:stats.marketplaceItemsHint")}
              </p>
            </div>
          </div>
        )}

        <section
          className="grid min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/80 dark:bg-[#101720] md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[224px_minmax(0,1fr)]"
          ref={dashboardWorkspaceRef}
        >
          <DashboardSidebar
            activeWorkspace={activeTab}
            items={workspaceItems}
            navigationLabel={t("dashboard:workspace.navigationLabel")}
            mobileLabel={t("dashboard:workspace.mobileLabel")}
            onChange={setActiveTab}
          />

          <div className="min-w-0">

            {/* Tab 1: Developer's Real Uploaded Games */}
            {activeTab === "my-games" && (
              <div className="space-y-5 p-4 sm:p-6">
                <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-100">
                      {t("dashboard:workspace.gameTitle")}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {t("dashboard:workspace.gameSubtitle")}
                    </p>
                  </div>
                  <DashboardFilterSelect
                    label={t("dashboard:filters.gameStatus")}
                    value={gameStatusFilter}
                    options={gameFilterOptions}
                    onChange={setGameStatusFilter}
                  />
                </header>

                {isLoadingGames ? (
                  <div className="dark-depth-card flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-500 dark:border-slate-855 dark:bg-slate-900">
                    <RefreshCw className="animate-spin" size={18} />{" "}
                    {t("dashboard:table.loadingGames")}
                  </div>
                ) : gamesError ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-505 rounded-xl text-xs font-semibold">
                    {t("dashboard:table.errorGames", { message: gamesError })}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-sans">
                          <th className="p-3 w-10"></th>
                          <th className="p-3">
                            {t("dashboard:table.headers.details")}
                          </th>
                          <th className="p-3 w-40">
                            {t("dashboard:table.headers.category")}
                          </th>
                          <th className="p-3 w-48">
                            {t("dashboard:table.headers.publishingType")}
                          </th>
                          <th className="p-3 w-36">
                            {t("dashboard:table.headers.proposedPrice")}
                          </th>
                          <th className="p-3 w-40 text-center">
                            {t("dashboard:table.headers.status")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                        {filteredGames.length > 0 ? (
                          filteredGames.map((game) => (
                            <React.Fragment key={game.id}>
                              <tr
                                className={`hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors ${expandedGameId === game.id ? "bg-slate-50/50 dark:bg-slate-950/20" : ""}`}
                              >
                                <td className="p-3 w-10 text-center">
                                  <button
                                    onClick={() =>
                                      setExpandedGameId(
                                        expandedGameId === game.id
                                          ? null
                                          : game.id,
                                      )
                                    }
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                    title={
                                      expandedGameId === game.id
                                        ? t("dashboard:table.actions.hideDetails")
                                        : t("dashboard:table.actions.viewDetails")
                                    }
                                  >
                                    {expandedGameId === game.id ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    )}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {game.title}
                                    <span className="text-[9px] font-sans bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700/60">
                                      v{game.version || "1.0.0"}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setExpandedGameId(
                                          expandedGameId === game.id
                                            ? null
                                            : game.id,
                                        )
                                      }
                                      className="text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                                      title={t("dashboard:table.actions.quickPreview")}
                                    >
                                      <Eye size={12} />
                                    </button>
                                  </div>
                                  <div className="font-sans text-[10px] text-slate-400 dark:text-slate-300 mt-0.5">
                                    ID: {game.id}
                                  </div>
                                </td>
                                <td className="p-3 w-40 text-slate-600 dark:text-slate-350">
                                  {game.categoryName || t("dashboard:table.unassigned")}
                                </td>
                                <td className="p-3 w-48">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium font-sans border ${
                                      game.publishingType === "full_acquisition"
                                        ? "bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
                                        : game.publishingType === "co_publishing"
                                          ? "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40"
                                          : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60"
                                    }`}
                                  >
                                    {game.publishingType
                                      ? game.publishingType.toUpperCase().replace("_", " ")
                                      : t("dashboard:table.marketplaceListing")}
                                  </span>
                                </td>
                                <td className="p-3 w-36 font-sans font-semibold dark:text-amber-400">
                                  {formatCurrencyValue(game.priceProposed, locale, t)}
                                </td>
                                <td className="p-3 w-40 text-center">
                                  <div className="flex flex-col items-center gap-1.5 justify-center">
                                    {(() => {
                                      const contract = [...contracts]
                                        .reverse()
                                        .find(
                                          (c) =>
                                            c.gameId === game.id &&
                                            c.status !== "cancelled",
                                        );
                                      if (contract) {
                                        const statusInfo = getContractStatusLabel(contract.status, t);
                                        return (
                                          <span
                                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-sans ${statusInfo.colorClass}`}
                                          >
                                            {statusInfo.text}
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-sans ${
                                            game.status?.toLowerCase() === "published"
                                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-250/20"
                                              : game.status?.toLowerCase() === "pending"
                                                ? "bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-400 border-amber-250/20 animate-pulse"
                                                : game.status?.toLowerCase() === "rejected"
                                                  ? "bg-rose-50 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 border-rose-250/20"
                                                  : "bg-slate-55/10 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-205/50 dark:border-slate-800/50"
                                          }`}
                                        >
                                          {getGameStatusLabel(game.status, t)}
                                        </span>
                                      );
                                    })()}
                                    {(() => {
                                      const contract = [...contracts]
                                        .reverse()
                                        .find(
                                          (c) =>
                                            c.gameId === game.id &&
                                            c.status !== "cancelled",
                                        );
                                      if (contract) {
                                        if (contract.status === "pending") {
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedContract(contract);
                                                setViewerMode("sign-developer");
                                                setIsViewerOpen(true);
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-550 text-slate-950 font-bold rounded text-[10px] transition-studio cursor-pointer animate-pulse whitespace-nowrap shadow-sm"
                                            >
                                              <PenTool size={10} />
                                              {t(
                                                "dashboard:table.actions.signContract",
                                              )}
                                            </button>
                                          );
                                        } else if (
                                          contract.status === "signed"
                                        ) {
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedContract(contract);
                                                setViewerMode("view");
                                                setIsViewerOpen(true);
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-450 text-white font-bold rounded text-[10px] transition-studio cursor-pointer whitespace-nowrap shadow-sm"
                                            >
                                              <FileText size={10} />
                                              {t(
                                                "dashboard:table.actions.viewContract",
                                              )}
                                            </button>
                                          );
                                        } else if (
                                          contract.status === "negotiating"
                                        ) {
                                          return null;
                                        }
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded detail sub-row */}
                              {expandedGameId === game.id && (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="p-6 bg-slate-50/10 dark:bg-slate-950/20 border-t border-b border-slate-200/50 dark:border-slate-800/60"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-300">
                                      {/* Left Column: Thumbnail, Description, ZIP */}
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                            <Image size={12} />{" "}
                                            {t(
                                              "dashboard:table.coverThumbnail",
                                            )}
                                          </h4>
                                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 aspect-video bg-slate-900 flex items-center justify-center">
                                            {game.thumbnailUrl ? (
                                              <img
                                                src={game.thumbnailUrl}
                                                alt={game.title}
                                                className="object-cover w-full h-full"
                                              />
                                            ) : (
                                              <div className="flex flex-col items-center justify-center text-slate-500">
                                                <Image
                                                  size={32}
                                                  className="mb-2 text-slate-650"
                                                />
                                                <span className="text-[10px] font-mono">
                                                  {t(
                                                    "dashboard:table.noThumbnail",
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-1.5">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                            {t(
                                              "dashboard:table.detailedDescription",
                                            )}
                                          </h4>
                                          <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-955/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                            {game.description ||
                                              t(
                                                "dashboard:table.noDescription",
                                              )}
                                          </p>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditModal(game.id, game.title, "game", game)}
                                          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                        >
                                          <PenTool size={14} /> Chỉnh sửa thông tin & Media
                                        </button>

                                        {game.fileUrl ? (
                                          <a
                                            href={game.fileUrl}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                          >
                                            <Download size={14} />{" "}
                                            {t(
                                              "dashboard:table.downloadGameZip",
                                            )}
                                          </a>
                                        ) : (
                                          <div className="text-center py-2.5 px-4 bg-slate-550/10 border border-slate-500/20 text-slate-550 rounded-xl text-xs font-semibold">
                                            {t("dashboard:table.noZip")}
                                          </div>
                                        )}

                                        {game.githubRepoUrl && (
                                          <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-205 dark:border-slate-800 rounded-xl space-y-2">
                                            <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-550 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                              <Github size={12} className="text-sky-500" />{" "}
                                              Cập nhật mã nguồn (GitHub)
                                            </h4>
                                            <div className="text-[11px] font-sans text-slate-650 dark:text-slate-350 break-all space-y-0.5">
                                              <div>
                                                <strong>Repo: </strong>
                                                <a href={game.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
                                                  {game.githubRepoUrl}
                                                </a>
                                              </div>
                                              {game.githubBranch && (
                                                <div>
                                                  <strong>Branch: </strong>
                                                  <span className="font-mono bg-slate-200/50 dark:bg-slate-850 px-1 py-0.5 rounded text-[10px]">
                                                    {game.githubBranch}
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {game.pendingUpdateSnapshotId ? (
                                              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-450 rounded-lg text-[10px] leading-relaxed">
                                                Phiên bản mới đang chờ duyệt và quét bảo mật. Phiên bản công khai của bạn vẫn đang hoạt động bình thường trên chợ.
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => handleSyncRepo(game.id, game.githubRepoUrl!, game.githubBranch)}
                                                disabled={syncingGameId !== null}
                                                className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-studio disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
                                              >
                                                {syncingGameId === game.id ? (
                                                  <>
                                                    <RefreshCw className="animate-spin" size={12} />
                                                    Đang kéo code mới...
                                                  </>
                                                ) : (
                                                  <>
                                                    <RefreshCw size={12} />
                                                    Đồng bộ bản mới từ GitHub
                                                  </>
                                                )}
                                              </button>
                                            )}

                                            {syncError && syncingGameId === null && (
                                              <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                                Lỗi: {syncError}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {!game.githubRepoUrl && (
                                            <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-205 dark:border-slate-800 rounded-xl space-y-2">
                                              <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-550 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                                <Upload size={12} className="text-sky-500" />{" "}
                                                Cập nhật sản phẩm trực tiếp (Tệp ZIP)
                                              </h4>
                                              
                                              {game.pendingUpdateSnapshotId ? (
                                                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-450 rounded-lg text-[10px] leading-relaxed">
                                                  Phiên bản mới đang chờ duyệt và quét bảo mật. Phiên bản công khai của bạn vẫn đang hoạt động bình thường trên chợ.
                                                </div>
                                              ) : (
                                                <div className="space-y-2">
                                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                                    Chọn tệp ZIP phiên bản mới để tải lên. Tệp sẽ được quét virus tự động trước khi kiểm duyệt.
                                                  </p>
                                                  <label
                                                    htmlFor={`zip-upload-game-${game.id}`}
                                                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-studio cursor-pointer disabled:bg-slate-350 disabled:cursor-not-allowed"
                                                  >
                                                    <Upload size={12} />
                                                    Tải lên file ZIP mới
                                                  </label>
                                                  <input
                                                    type="file"
                                                    id={`zip-upload-game-${game.id}`}
                                                    accept=".zip"
                                                    disabled={zippingId !== null}
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) {
                                                        handleUploadZip(game.id, "game", file);
                                                      }
                                                    }}
                                                    className="hidden"
                                                  />
                                                </div>
                                              )}

                                              {zippingId === game.id && (
                                                <div className="space-y-1.5 mt-2">
                                                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                                                    <span>Đang tải lên...</span>
                                                    <span>{zipProgress}%</span>
                                                  </div>
                                                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                      className="h-full bg-sky-500 transition-all duration-300"
                                                      style={{ width: `${zipProgress}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              {zipError && zippingId === game.id && (
                                                <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                                  Lỗi: {zipError}
                                                </p>
                                              )}
                                            </div>
                                          )}

                                        {/* Alert box for rejected games */}
                                        {game.status?.toLowerCase() ===
                                          "rejected" &&
                                          (() => {
                                            const latestContract = [
                                              ...contracts,
                                            ]
                                              .reverse()
                                              .find(
                                                (c) => c.gameId === game.id,
                                              );
                                            const isDeveloperCancelled =
                                              latestContract &&
                                              latestContract.rejectionReason?.startsWith(
                                                "[HỦY HỢP ĐỒNG]",
                                              );
                                            return (
                                              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 space-y-1">
                                                <span className="font-bold flex items-center gap-1.5 text-xs">
                                                  <AlertTriangle size={14} />
                                                  {isDeveloperCancelled
                                                    ? t(
                                                        "dashboard:table.contractCancelled",
                                                      )
                                                    : t(
                                                        "dashboard:table.gameRejected",
                                                      )}
                                                </span>
                                                <p className="text-[10px] leading-normal text-slate-500 dark:text-slate-400">
                                                  {isDeveloperCancelled
                                                    ? t(
                                                        "dashboard:table.contractCancelledHint",
                                                      )
                                                    : t(
                                                        "dashboard:table.gameRejectedHint",
                                                      )}
                                                </p>
                                              </div>
                                            );
                                          })()}

                                        {/* Contract Status Card for Co-publishing or Full Acquisition */}
                                        {(() => {
                                          const contract = [...contracts]
                                            .reverse()
                                            .find(
                                              (c) =>
                                                c.gameId === game.id &&
                                                c.status !== "cancelled",
                                            );
                                          if (contract) {
                                            return (
                                              <div className="p-4 bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                  <FileCheck
                                                    size={12}
                                                    className="text-sky-500"
                                                  />{" "}
                                                  {t(
                                                    "dashboard:table.publishingContract",
                                                  )}
                                                </span>
                                                <div className="flex justify-between items-center text-xs">
                                                  <span className="text-slate-500">
                                                    {t(
                                                      "dashboard:table.statusLabel",
                                                    )}
                                                  </span>
                                                  {(() => {
                                                    const statusInfo =
                                                      getContractStatusLabel(
                                                        contract.status,
                                                        t,
                                                      );
                                                    return (
                                                      <span
                                                        className={`font-bold uppercase tracking-wider ${
                                                          contract.status ===
                                                          "signed"
                                                            ? "text-emerald-500"
                                                            : contract.status ===
                                                                "cancelled"
                                                              ? "text-rose-500"
                                                              : "text-amber-500"
                                                        }`}
                                                      >
                                                        {statusInfo.text}
                                                      </span>
                                                    );
                                                  })()}
                                                </div>
                                                {contract.status ===
                                                  "pending" && (
                                                  <button
                                                    onClick={() => {
                                                      setSelectedContract(
                                                        contract,
                                                      );
                                                      setViewerMode(
                                                        "sign-developer",
                                                      );
                                                      setIsViewerOpen(true);
                                                    }}
                                                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-amber-400 hover:bg-amber-550 text-slate-950 font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                  >
                                                    <PenTool size={14} />{" "}
                                                    {t(
                                                      "dashboard:table.signElectronicContract",
                                                    )}
                                                  </button>
                                                )}
                                                {contract.status ===
                                                  "signed" && (
                                                  <button
                                                    onClick={() => {
                                                      setSelectedContract(
                                                        contract,
                                                      );
                                                      setViewerMode("view");
                                                      setIsViewerOpen(true);
                                                    }}
                                                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-450 text-white font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                  >
                                                    <FileText size={14} />{" "}
                                                    {t(
                                                      "dashboard:table.viewDownloadContract",
                                                    )}
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>

                                      {/* Middle & Right Column: Screenshots & Video */}
                                      <div className="space-y-4 md:col-span-2 flex flex-col justify-between">
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Image
                                              size={12}
                                              className="text-sky-500"
                                            />{" "}
                                            {t("dashboard:table.screenshots")}
                                          </h4>
                                          {game.screenshots &&
                                          game.screenshots.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                              {game.screenshots.map(
                                                (url, index) => (
                                                  <div
                                                    key={index}
                                                    onClick={() => {
                                                      setActiveScreenshotUrl(
                                                        url,
                                                      );
                                                      setIsOpenLightbox(true);
                                                    }}
                                                    className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group hover:border-sky-550/55 transition-studio"
                                                  >
                                                    <img
                                                      src={url}
                                                      alt={`Screenshot ${index + 1}`}
                                                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                      <Eye
                                                        size={16}
                                                        className="text-white"
                                                      />
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-8 text-slate-500 dark:border-slate-800 dark:bg-slate-955/20 dark:text-slate-400">
                                              <Image
                                                size={24}
                                                className="mb-1 text-slate-350 dark:text-slate-650"
                                              />
                                              <span className="text-[10px]">
                                                {t(
                                                  "dashboard:table.noScreenshots",
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Video Gameplay */}
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Video
                                              size={12}
                                              className="text-sky-500"
                                            />{" "}
                                            {t("dashboard:table.videoDemo")}
                                          </h4>
                                          {game.videoUrl ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-h-56">
                                              <video
                                                src={game.videoUrl}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-8 text-slate-500 dark:border-slate-800 dark:bg-slate-955/20 dark:text-slate-400">
                                              <Video
                                                size={24}
                                                className="mb-1 text-slate-350 dark:text-slate-650"
                                              />
                                              <span className="text-[10px]">
                                                {t("dashboard:table.noVideo")}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="bg-slate-100/50 p-8 text-center font-medium text-slate-500 dark:bg-slate-950/20 dark:text-slate-400"
                            >
                              {myGames.length === 0
                                ? t("dashboard:table.emptyGames")
                                : t("dashboard:table.emptyGamesFiltered")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Developer's Real Marketplace Items */}
            {activeTab === "marketplace-items" && (
              <div className="space-y-5 p-4 sm:p-6">
                <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-100">
                      {t("dashboard:workspace.assetTitle")}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {t("dashboard:workspace.assetSubtitle")}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                    <DashboardFilterSelect<"all" | "game" | "asset">
                      label={t("dashboard:filters.productType")}
                      value={marketplaceTypeFilter}
                      options={marketplaceTypeFilterOptions}
                      onChange={setMarketplaceTypeFilter}
                    />
                    <DashboardFilterSelect
                      label={t("dashboard:filters.assetStatus")}
                      value={assetStatusFilter}
                      options={assetFilterOptions}
                      onChange={setAssetStatusFilter}
                    />
                  </div>
                </header>

                {isLoadingMarketplace ? (
                  <div className="dark-depth-card flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-500 dark:border-slate-855 dark:bg-slate-900">
                    <RefreshCw className="animate-spin" size={18} />{" "}
                    {t("dashboard:table.loadingAssets")}
                  </div>
                ) : marketplaceError ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-505 rounded-xl text-xs font-semibold">
                    {t("dashboard:table.errorAssets", {
                      message: marketplaceError,
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-sans">
                          <th className="p-3 w-10"></th>
                          <th className="p-3">
                            {t("dashboard:table.headers.details")}
                          </th>
                          <th className="p-3 w-32">
                            {t("dashboard:table.headers.productType")}
                          </th>
                          <th className="p-3 w-40">
                            {t("dashboard:table.headers.category")}
                          </th>
                          <th className="p-3 w-36">
                            {t("dashboard:table.headers.price")}
                          </th>
                          <th className="p-3 w-40 text-center">
                            {t("dashboard:table.headers.status")}
                          </th>
                          <th className="p-3 w-24 text-center">
                            {t("dashboard:table.headers.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                        {filteredMarketplaceItems.length > 0 ? (
                          filteredMarketplaceItems.map((item) => (
                            <React.Fragment key={item.id}>
                              <tr
                                className={`hover:bg-slate-50/40 dark:hover:bg-slate-955/5 transition-colors ${expandedMarketplaceId === item.id ? "bg-slate-50/50 dark:bg-slate-955/20" : ""}`}
                              >
                                <td className="p-3 w-10 text-center">
                                  <button
                                    onClick={() =>
                                      setExpandedMarketplaceId(
                                        expandedMarketplaceId === item.id
                                          ? null
                                          : item.id,
                                      )
                                    }
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                    title={
                                      expandedMarketplaceId === item.id
                                        ? t("dashboard:table.actions.hideDetails")
                                        : t("dashboard:table.actions.viewDetails")
                                    }
                                  >
                                    {expandedMarketplaceId === item.id ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    )}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {item.title}
                                    {item.type === "game" && item.originalItem.version && (
                                      <span className="text-[9px] font-sans bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700/60">
                                        v{item.originalItem.version}
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-sans text-[10px] text-slate-400 dark:text-slate-300 mt-0.5">
                                    ID: {item.id}
                                  </div>
                                </td>
                                <td className="p-3 w-32">
                                  {item.type === "game" ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold font-sans border bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40">
                                      {t("dashboard:table.game")}
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold font-sans border bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60">
                                      {t("dashboard:table.resourceAsset")}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 w-40 text-slate-600 dark:text-slate-350">
                                  {item.categoryName || t("dashboard:table.unassigned")}
                                </td>
                                <td className="p-3 w-36 font-sans font-semibold dark:text-amber-400">
                                  {formatCurrencyValue(item.price, locale, t)}
                                </td>
                                <td className="p-3 w-40 text-center">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-sans ${
                                      item.status === "active" || item.status === "published"
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                                        : item.status === "pending"
                                          ? "bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-400 border border-amber-250/20 animate-pulse"
                                          : item.status === "rejected"
                                            ? "bg-rose-50 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 border border-rose-250/20"
                                            : "bg-slate-55/10 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-205/50 dark:border-slate-800/50"
                                    }`}
                                  >
                                    {item.type === "game"
                                      ? getGameStatusLabel(item.status, t)
                                      : getMarketplaceStatusLabel(item.status, t)}
                                  </span>
                                </td>
                                <td className="p-3 w-24 text-center">
                                  {item.type === "asset" ? (
                                    <button
                                      onClick={() => handleDeleteMarketplaceItem(item.id)}
                                      className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                      title={t("dashboard:table.actions.removeProduct")}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs font-sans">-</span>
                                  )}
                                </td>
                              </tr>

                              {/* Expanded detail sub-row */}
                              {expandedMarketplaceId === item.id && (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="p-6 bg-slate-50/10 dark:bg-slate-955/10 border-t border-b border-slate-200/50 dark:border-slate-800/60"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-350">
                                      {/* Left Column: Thumbnail, Description, ZIP */}
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                            <Image size={12} /> {t("dashboard:table.coverThumbnail")}
                                          </h4>
                                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 aspect-video bg-slate-900 flex items-center justify-center">
                                            {item.originalItem.thumbnailUrl ? (
                                              <img
                                                src={item.originalItem.thumbnailUrl}
                                                alt={item.title}
                                                className="object-cover w-full h-full"
                                              />
                                            ) : (
                                              <div className="flex flex-col items-center justify-center text-slate-500">
                                                <Image size={32} className="mb-2 text-slate-650" />
                                                <span className="text-[10px] font-mono">
                                                  {t("dashboard:table.noThumbnail")}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-1.5">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                            {t("dashboard:table.detailedDescription")}
                                          </h4>
                                          <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-955/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                            {item.originalItem.description || t("dashboard:table.noDescription")}
                                          </p>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditModal(item.id, item.title, item.type, item.originalItem)}
                                          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                        >
                                          <PenTool size={14} /> Chỉnh sửa thông tin & Media
                                        </button>

                                        {item.originalItem.fileUrl ? (
                                          <a
                                            href={item.originalItem.fileUrl}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                          >
                                            <Download size={14} />{" "}
                                            {item.type === "game"
                                              ? t("dashboard:table.downloadGameZip")
                                              : t("dashboard:table.downloadAsset")}
                                          </a>
                                        ) : (
                                          <div className="text-center py-2.5 px-4 bg-slate-550/10 border border-slate-500/20 text-slate-550 rounded-xl text-xs font-semibold">
                                            {item.type === "game"
                                              ? t("dashboard:table.noZip")
                                              : t("dashboard:table.noAssetZip")}
                                          </div>
                                        )}

                                        {item.type === "game" && item.originalItem.githubRepoUrl && (
                                          <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-205 dark:border-slate-800 rounded-xl space-y-2">
                                            <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-550 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                              <Github size={12} className="text-sky-500" />{" "}
                                              Cập nhật mã nguồn (GitHub)
                                            </h4>
                                            <div className="text-[11px] font-sans text-slate-650 dark:text-slate-350 break-all space-y-0.5">
                                              <div>
                                                <strong>Repo: </strong>
                                                <a href={item.originalItem.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
                                                  {item.originalItem.githubRepoUrl}
                                                </a>
                                              </div>
                                              {item.originalItem.githubBranch && (
                                                <div>
                                                  <strong>Branch: </strong>
                                                  <span className="font-mono bg-slate-200/50 dark:bg-slate-850 px-1 py-0.5 rounded text-[10px]">
                                                    {item.originalItem.githubBranch}
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {item.originalItem.pendingUpdateSnapshotId ? (
                                              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-450 rounded-lg text-[10px] leading-relaxed">
                                                Phiên bản mới đang chờ duyệt và quét bảo mật. Phiên bản công khai của bạn vẫn đang hoạt động bình thường trên chợ.
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => handleSyncRepo(item.id, item.originalItem.githubRepoUrl!, item.originalItem.githubBranch)}
                                                disabled={syncingGameId !== null}
                                                className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-studio disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
                                              >
                                                {syncingGameId === item.id ? (
                                                  <>
                                                    <RefreshCw className="animate-spin" size={12} />
                                                    Đang kéo code mới...
                                                  </>
                                                ) : (
                                                  <>
                                                    <RefreshCw size={12} />
                                                    Đồng bộ bản mới từ GitHub
                                                  </>
                                                )}
                                              </button>
                                            )}

                                            {syncError && syncingGameId === null && (
                                              <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                                Lỗi: {syncError}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {(item.type === "asset" || (item.type === "game" && !item.originalItem.githubRepoUrl)) && (
                                          <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-205 dark:border-slate-800 rounded-xl space-y-2">
                                            <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-550 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                              <Upload size={12} className="text-sky-500" />{" "}
                                              {item.type === "game" ? "Cập nhật sản phẩm trực tiếp (Tệp ZIP)" : "Cập nhật tài nguyên (Tệp ZIP)"}
                                            </h4>

                                            {item.type === "game" && item.originalItem.pendingUpdateSnapshotId ? (
                                              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-450 rounded-lg text-[10px] leading-relaxed">
                                                Phiên bản mới đang chờ duyệt và quét bảo mật. Phiên bản công khai của bạn vẫn đang hoạt động bình thường trên chợ.
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                <p className="text-[11px] text-slate-505 dark:text-slate-400 leading-normal">
                                                  Chọn tệp ZIP phiên bản mới để tải lên. Tệp sẽ được quét virus tự động trước khi kiểm duyệt.
                                                </p>
                                                <label
                                                  htmlFor={`zip-upload-item-${item.id}`}
                                                  className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-studio cursor-pointer disabled:bg-slate-350 disabled:cursor-not-allowed"
                                                >
                                                  <Upload size={12} />
                                                  {item.type === "game" ? "Tải lên file ZIP mới" : "Tải lên file ZIP tài nguyên mới"}
                                                </label>
                                                <input
                                                  type="file"
                                                  id={`zip-upload-item-${item.id}`}
                                                  accept=".zip"
                                                  disabled={zippingId !== null}
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      handleUploadZip(item.id, item.type, file);
                                                    }
                                                  }}
                                                  className="hidden"
                                                />
                                              </div>
                                            )}

                                            {zippingId === item.id && (
                                              <div className="space-y-1.5 mt-2">
                                                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                                                  <span>Đang tải lên...</span>
                                                  <span>{zipProgress}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                  <div
                                                    className="h-full bg-sky-500 transition-all duration-300"
                                                    style={{ width: `${zipProgress}%` }}
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            {zipError && zippingId === item.id && (
                                              <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                                Lỗi: {zipError}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Middle & Right Column: Screenshots & Video */}
                                      <div className="space-y-4 md:col-span-2 flex flex-col justify-between">
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Image size={12} className="text-sky-500" /> {t("dashboard:table.screenshots")}
                                          </h4>
                                          {item.originalItem.screenshots && item.originalItem.screenshots.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                              {item.originalItem.screenshots.map((url: string, index: number) => (
                                                <div
                                                  key={index}
                                                  onClick={() => {
                                                    setActiveScreenshotUrl(url);
                                                    setIsOpenLightbox(true);
                                                  }}
                                                  className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group hover:border-sky-550/55 transition-studio"
                                                >
                                                  <img
                                                    src={url}
                                                    alt={`Screenshot ${index + 1}`}
                                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                  />
                                                  <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Eye size={16} className="text-white" />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-8 text-slate-500 dark:border-slate-800 dark:bg-slate-955/20 dark:text-slate-400">
                                              <Image size={24} className="mb-1 text-slate-350 dark:text-slate-655" />
                                              <span className="text-[10px]">
                                                {t("dashboard:table.noScreenshots")}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Video Gameplay */}
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Video size={12} className="text-sky-500" /> {t("dashboard:table.videoDemo")}
                                          </h4>
                                          {item.originalItem.videoUrl ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-h-56">
                                              <video
                                                src={item.originalItem.videoUrl}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-8 text-slate-500 dark:border-slate-800 dark:bg-slate-955/20 dark:text-slate-400">
                                              <Video size={24} className="mb-1 text-slate-350 dark:text-slate-655" />
                                              <span className="text-[10px]">
                                                {t("dashboard:table.noVideo")}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              className="bg-slate-100/50 p-8 text-center font-medium text-slate-500 dark:bg-slate-955/20 dark:text-slate-400"
                            >
                              {combinedMarketplaceItems.length === 0
                                ? t("dashboard:table.emptyAssets")
                                : t("dashboard:table.emptyAssetsFiltered")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Sales / Products Sold (seller-side) */}
            {activeTab === "sales" && (
              <div className="space-y-5 p-4 sm:p-6">
                <header>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-100">
                    {t("dashboard:workspace.salesTitle")}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("dashboard:workspace.salesSubtitle")}
                  </p>
                </header>
                {isLoadingSales && (
                  <div className="dark-depth-card flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-500 dark:border-slate-850 dark:bg-slate-900">
                    <RefreshCw className="animate-spin" size={18} />{" "}
                    {t("dashboard:table.loadingSales")}
                  </div>
                )}
                {!isLoadingSales && salesError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                    {t("dashboard:table.errorSales", { message: salesError })}
                  </div>
                )}
                {!isLoadingSales && !salesError && (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                          <th className="p-3">
                            {t("dashboard:table.headers.product")}
                          </th>
                          <th className="p-3">
                            {t("dashboard:table.headers.type")}
                          </th>
                          <th className="p-3 text-right">
                            {t("dashboard:table.headers.sold")}
                          </th>
                          <th className="p-3 text-right">
                            {t("dashboard:table.headers.revenue")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                        {(salesStats?.products ?? []).length > 0 ? (
                          (salesStats?.products ?? []).map((product) => (
                            <tr
                              key={`${product.productType}-${product.productId}`}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {product.thumbnailUrl && (
                                    <img
                                      src={product.thumbnailUrl}
                                      alt={product.title}
                                      className="w-8 h-8 rounded object-cover shrink-0"
                                    />
                                  )}
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    {product.title}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${product.productType === "GAME" ? "bg-sky-500/10 text-sky-500" : "bg-purple-500/10 text-purple-500"}`}
                                >
                                  {product.productType === "GAME"
                                    ? t("dashboard:table.game")
                                    : t("dashboard:table.resource")}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono">
                                {product.unitsSold}
                              </td>
                              <td className="p-3 text-right font-mono font-semibold dark:text-amber-400">
                                {formatCurrencyValue(
                                  product.revenue,
                                  locale,
                                  t,
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-8 text-center font-medium text-slate-500 dark:text-slate-400"
                            >
                              {t("dashboard:table.emptySales")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Payment Center */}
            {activeTab === "payment-center" && (
              <div className="space-y-5 p-4 sm:p-6">
                <header>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-100">
                    {t("dashboard:workspace.purchaseTitle")}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("dashboard:workspace.purchaseSubtitle")}
                  </p>
                </header>
                <PaymentDetailPage
                  payments={purchasedPayments}
                  selectedOrderId={selectedPaymentOrderId}
                  setSelectedOrderId={setSelectedPaymentOrderId}
                  isRefreshing={isRefreshingPayments}
                  onBackToMarketplace={() => {
                    setCurrentScreen("marketplace");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onRefreshPayments={onRefreshPayments}
                  onCancelPayment={onCancelPayment}
                  setCurrentScreen={setCurrentScreen}
                  variant="dashboard"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Screenshot Lightbox Modal */}
      {isOpenLightbox && activeScreenshotUrl && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsOpenLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-studio active:scale-95 cursor-pointer"
            onClick={() => setIsOpenLightbox(false)}
          >
            <X size={20} />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] rounded-xl overflow-hidden border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeScreenshotUrl}
              alt={t("dashboard:lightbox.alt")}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Universal Contract Viewer & Signing Modal */}
      {isViewerOpen && selectedContract && (
        <ContractViewerModal
          contract={selectedContract}
          currentUser={currentUser}
          mode={viewerMode}
          onClose={() => setIsViewerOpen(false)}
          onSignSuccess={() => {
            setIsViewerOpen(false);
            fetchMyGames();
            fetchMyContracts();
          }}
          onSignDeveloper={async (sig, rep, addr, tax) => {
            try {
              const res = await contractApi.signByDeveloper(
                selectedContract.id,
                sig,
                rep,
                addr,
                tax,
              );
              return { success: res.success, message: res.message };
            } catch (err: any) {
              return {
                success: false,
                message:
                  err.response?.data?.message ||
                  err.message ||
                  t("dashboard:contracts.signErrorMessage"),
              };
            }
          }}
          onRejectDeveloper={async (reason) => {
            try {
              const res = await contractApi.rejectByDeveloper(
                selectedContract.id,
                reason,
              );
              return { success: res.success, message: res.message };
            } catch (err: any) {
              return {
                success: false,
                message:
                  err.response?.data?.message ||
                  err.message ||
                  t("dashboard:contracts.rejectErrorMessage"),
              };
            }
          }}
        />
      )}

      <EditGameModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={() => {
          fetchMyGames();
          fetchMyMarketplaceItems();
        }}
        item={editingItem}
      />
    </>
  );
};
