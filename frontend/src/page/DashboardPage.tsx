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
  Boxes,
  ReceiptText,
} from "lucide-react";
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
import { SignaturePad } from "../components/SignaturePad";
import { ContractViewerModal } from "../components/ContractViewerModal";
import { DeveloperDashboardHeader } from "../components/developer-dashboard/DeveloperDashboardHeader";
import { DashboardMetricGrid } from "../components/developer-dashboard/DashboardMetricGrid";
import {
  DashboardSidebar,
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
        colorClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
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

const formatRevenueMetricValue = (
  value: number | undefined,
  locale: string,
  t: (key: string) => string,
) => `${(value ?? 0).toLocaleString(locale)} ${t("dashboard:table.currencyVnd")}`;

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
  const locale = React.useMemo(() => {
    const language = i18n.resolvedLanguage || i18n.language || "vi";
    return language === "vi" ? "vi-VN" : language === "ja" ? "ja-JP" : "en-US";
  }, [i18n.language, i18n.resolvedLanguage]);

  // Tab control: 'my-games' | 'marketplace-items' | 'sales' | 'payment-center'
  const [activeTab, setActiveTab] =
    useState<DashboardWorkspaceId>("my-games");

  // Game & Asset status filters
  const [gameStatusFilter, setGameStatusFilter] = useState<string>("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all");

  // Real Game list state
  const [myGames, setMyGames] = useState<GameResponse[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
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
        alert(t("dashboard:contracts.deleteSuccess"));
        fetchMyMarketplaceItems();
      } else {
        alert(res.message || t("dashboard:contracts.deleteFail"));
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:contracts.deleteError"),
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
        alert(t("dashboard:contracts.signSuccess"));
        setIsSignModalOpen(false);
        fetchMyGames();
        fetchMyContracts();
      } else {
        alert(response.message || t("dashboard:contracts.signErrorMessage"));
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          err.message ||
          t("dashboard:contracts.signError"),
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
    { label: t("dashboard:filters.all"), value: "all" },
    {
      label: t("dashboard:filters.publishedSigned"),
      value: "published_signed",
    },
    { label: t("dashboard:filters.pendingSigning"), value: "pending_signing" },
    { label: t("dashboard:filters.negotiating"), value: "negotiating" },
    { label: t("dashboard:filters.rejected"), value: "rejected" },
    { label: t("dashboard:filters.draft"), value: "draft" },
  ];

  const assetFilterOptions = [
    { label: t("dashboard:filters.all"), value: "all" },
    { label: t("dashboard:filters.active"), value: "active" },
    { label: t("dashboard:filters.pending"), value: "pending" },
    { label: t("dashboard:filters.rejected"), value: "rejected" },
    { label: t("dashboard:filters.removed"), value: "removed" },
  ];

  const filteredGames = myGames
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
      const groupA = (a.publishingType === 'full_acquisition' || a.publishingType === 'co_publishing') ? 'store' : 'marketplace';
      const groupB = (b.publishingType === 'full_acquisition' || b.publishingType === 'co_publishing') ? 'store' : 'marketplace';
      if (groupA !== groupB) {
        return groupA === 'marketplace' ? -1 : 1;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const filteredMarketplaceItems = myMarketplaceItems
    .filter((item) => {
      if (assetStatusFilter === "all") return true;
      return item.status === assetStatusFilter;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const workspaceItems: DashboardWorkspaceItem[] = [
    {
      id: "my-games",
      label: t("dashboard:tabs.publishedGames"),
      count: myGames.length,
      icon: Gamepad2,
    },
    {
      id: "marketplace-items",
      label: t("dashboard:tabs.marketplaceAssets"),
      count: myMarketplaceItems.length,
      icon: Boxes,
    },
    {
      id: "sales",
      label: t("dashboard:tabs.soldOrders"),
      count: salesStats?.totalUnitsSold ?? 0,
      icon: TrendingUp,
    },
    {
      id: "payment-center",
      label: t("dashboard:tabs.purchasedOrders"),
      count: purchasedPayments.length,
      icon: ReceiptText,
    },
  ];

  const dashboardMetrics = [
    {
      id: "revenue",
      label: t("dashboard:stats.revenue"),
      value: formatRevenueMetricValue(salesStats?.totalRevenue, locale, t),
      hint: t("dashboard:stats.revenueHint"),
      icon: WalletCards,
      primary: true,
      loading: isLoadingSales,
    },
    {
      id: "units-sold",
      label: t("dashboard:stats.unitsSold"),
      value: salesStats?.totalUnitsSold ?? 0,
      hint: t("dashboard:stats.unitsSoldHint"),
      icon: ShoppingBag,
      loading: isLoadingSales,
    },
    {
      id: "games",
      label: t("dashboard:stats.publishedGames"),
      value: myGames.length,
      hint: t("dashboard:stats.publishedGamesHint"),
      icon: Gamepad2,
      loading: isLoadingGames,
    },
    {
      id: "assets",
      label: t("dashboard:stats.marketplaceItems"),
      value: myMarketplaceItems.length,
      hint: t("dashboard:stats.marketplaceItemsHint"),
      icon: Boxes,
      loading: isLoadingMarketplace,
    },
  ];

  return (
    <>
      <div className="space-y-7 animate-fade-in py-2">
        <DeveloperDashboardHeader
          title={t("dashboard:overview.title")}
          description={t("dashboard:overview.subtitle")}
          actionLabel={t("dashboard:overview.deployAsset")}
          onAction={() => {
            setCurrentScreen("upload");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        <DashboardMetricGrid metrics={dashboardMetrics} />

        <section
          className="grid min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-slate-800/80 dark:bg-[#101720] dark:shadow-[0_22px_54px_rgba(0,0,0,0.22)] md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[224px_minmax(0,1fr)]"
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
              <div>
                <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-800/80 sm:px-6">
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-slate-950 dark:text-slate-50">
                      {t("dashboard:workspace.gameTitle")}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {t("dashboard:workspace.gameSubtitle")}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-500">
                      {t("dashboard:filters.gameStatus")}
                    </span>
                    <div className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:justify-end">
                      {gameFilterOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setGameStatusFilter(option.value)}
                          aria-pressed={gameStatusFilter === option.value}
                          className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                            gameStatusFilter === option.value
                              ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isLoadingGames ? (
                  <div className="px-5 py-6 sm:px-6" role="status">
                    <span className="sr-only">
                      {t("dashboard:table.loadingGames")}
                    </span>
                    <div className="space-y-3">
                      {[0, 1, 2].map((row) => (
                        <div
                          key={row}
                          className="grid min-h-16 animate-pulse grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-slate-200/70 px-3 dark:border-slate-800/70 sm:grid-cols-[32px_minmax(180px,1.4fr)_minmax(100px,0.8fr)_minmax(120px,1fr)_100px]"
                        >
                          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
                          <div className="space-y-2">
                            <div className="h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-2.5 w-3/5 rounded bg-slate-100 dark:bg-slate-800/70" />
                          </div>
                          <div className="hidden h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800 sm:block" />
                          <div className="hidden h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800 sm:block" />
                          <div className="hidden h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800 sm:block" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : gamesError ? (
                  <div className="m-5 flex flex-col gap-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-5 sm:m-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-rose-500"
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-6 text-rose-700 dark:text-rose-300">
                        {t("dashboard:table.errorGames", {
                          message: gamesError,
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchMyGames()}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-500/25 px-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-rose-300"
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      {t("dashboard:table.retry")}
                    </button>
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="px-6 py-14 sm:py-16">
                    <div className="mx-auto max-w-md text-center">
                      <Gamepad2
                        size={24}
                        strokeWidth={1.7}
                        className="mx-auto text-slate-400 dark:text-slate-600"
                        aria-hidden="true"
                      />
                      <h3 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                        {myGames.length === 0
                          ? t("dashboard:table.emptyGamesTitle")
                          : t("dashboard:table.emptyGamesFilteredTitle")}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {myGames.length === 0
                          ? t("dashboard:table.emptyGames")
                          : t("dashboard:table.emptyGamesFiltered")}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (myGames.length === 0) {
                            setCurrentScreen("upload");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                            return;
                          }
                          setGameStatusFilter("all");
                        }}
                        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                      >
                        {myGames.length === 0
                          ? t("dashboard:overview.deployAsset")
                          : t("dashboard:table.clearFilter")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-[#0c121a] dark:text-slate-500">
                          <th className="h-12 w-14 px-4"></th>
                          <th className="h-12 px-4">
                            {t("dashboard:table.headers.details")}
                          </th>
                          <th className="h-12 px-4">
                            {t("dashboard:table.headers.category")}
                          </th>
                          <th className="h-12 px-4">
                            {t("dashboard:table.headers.publishingType")}
                          </th>
                          <th className="h-12 px-4 text-right">
                            {t("dashboard:table.headers.proposedPrice")}
                          </th>
                          <th className="h-12 px-4 text-right">
                            {t("dashboard:table.headers.status")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/70">
                        {filteredGames.length > 0 ? (
                          filteredGames.map((game) => (
                            <React.Fragment key={game.id}>
                              <tr
                                className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/55 ${expandedGameId === game.id ? "bg-sky-500/[0.035] dark:bg-sky-400/[0.035]" : ""}`}
                              >
                                <td className="w-14 px-4 py-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedGameId(
                                        expandedGameId === game.id
                                          ? null
                                        : game.id,
                                      )
                                    }
                                    aria-expanded={expandedGameId === game.id}
                                    aria-label={
                                      expandedGameId === game.id
                                        ? t(
                                            "dashboard:table.actions.hideDetails",
                                          )
                                        : t(
                                            "dashboard:table.actions.viewDetails",
                                          )
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:hover:bg-slate-800 dark:hover:text-white"
                                    title={
                                      expandedGameId === game.id
                                        ? t(
                                            "dashboard:table.actions.hideDetails",
                                          )
                                        : t(
                                            "dashboard:table.actions.viewDetails",
                                          )
                                    }
                                  >
                                    {expandedGameId === game.id ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    )}
                                  </button>
                                </td>
                                <td className="min-w-60 px-4 py-4">
                                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                                    <span className="min-w-0 truncate">
                                      {game.title}
                                    </span>
                                    <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400">
                                      v{game.version || "1.0.0"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedGameId(
                                          expandedGameId === game.id
                                            ? null
                                          : game.id,
                                        )
                                      }
                                      aria-label={t(
                                        "dashboard:table.actions.quickPreview",
                                      )}
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-sky-500/10 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:hover:text-sky-400"
                                      title={t(
                                        "dashboard:table.actions.quickPreview",
                                      )}
                                    >
                                      <Eye size={15} />
                                    </button>
                                  </div>
                                  <div className="mt-1 max-w-[260px] truncate font-mono text-[11px] text-slate-500 dark:text-slate-500">
                                    ID: {game.id}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                  {game.categoryName ||
                                    t("dashboard:table.unassigned")}
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-block rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                      game.publishingType === "full_acquisition"
                                        ? "bg-amber-450/10 text-amber-500 border-amber-500/20"
                                        : game.publishingType ===
                                            "co_publishing"
                                          ? "bg-sky-450/10 text-sky-500 border-sky-500/20"
                                          : "bg-slate-100 dark:bg-slate-955 text-slate-500 border-slate-205 dark:border-slate-800"
                                    }`}
                                  >
                                    {game.publishingType
                                      ? game.publishingType.toUpperCase()
                                      : t("dashboard:table.marketplaceListing")}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                                  {formatCurrencyValue(
                                    game.priceProposed,
                                    locale,
                                    t,
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex flex-col items-end justify-center gap-2">
                                    {(() => {
                                      const contract = [...contracts]
                                        .reverse()
                                        .find(
                                          (c) =>
                                            c.gameId === game.id &&
                                            c.status !== "cancelled",
                                        );
                                      if (contract) {
                                        const statusInfo =
                                          getContractStatusLabel(
                                            contract.status,
                                            t,
                                          );
                                        return (
                                          <span
                                            className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusInfo.colorClass}`}
                                          >
                                            {statusInfo.text}
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                            game.status?.toLowerCase() ===
                                            "published"
                                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                              : game.status?.toLowerCase() ===
                                                  "pending"
                                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                : game.status?.toLowerCase() ===
                                                    "rejected"
                                                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
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
                                              className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300/80 bg-amber-300 px-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                                            >
                                              <PenTool size={13} />
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
                                              className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:text-emerald-300"
                                            >
                                              <FileText size={13} />
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
                                    className="border-y border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800/80 dark:bg-[#0c121a] sm:p-6"
                                  >
                                    <div className="grid grid-cols-1 gap-8 text-slate-700 dark:text-slate-300 xl:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.6fr)]">
                                      {/* Left Column: Thumbnail, Description, ZIP */}
                                      <div className="space-y-5">
                                        <div>
                                          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <Image size={14} aria-hidden="true" />
                                            {t(
                                              "dashboard:table.coverThumbnail",
                                            )}
                                          </h4>
                                          <div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800/80">
                                            {game.thumbnailUrl ? (
                                              <img
                                                src={game.thumbnailUrl}
                                                alt={game.title}
                                                className="object-cover w-full h-full"
                                              />
                                            ) : (
                                              <div className="flex flex-col items-center justify-center text-slate-500">
                                                <Image
                                                  size={24}
                                                  className="mb-2 text-slate-600"
                                                />
                                                <span className="text-xs">
                                                  {t(
                                                    "dashboard:table.noThumbnail",
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {t(
                                              "dashboard:table.detailedDescription",
                                            )}
                                          </h4>
                                          <p className="max-h-36 overflow-y-auto text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {game.description ||
                                              t(
                                                "dashboard:table.noDescription",
                                              )}
                                          </p>
                                        </div>

                                        {game.fileUrl ? (
                                          <a
                                            href={game.fileUrl}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:text-sky-300"
                                          >
                                            <Download size={14} />{" "}
                                            {t(
                                              "dashboard:table.downloadGameZip",
                                            )}
                                          </a>
                                        ) : (
                                          <div className="rounded-lg border border-slate-200 bg-slate-100/70 px-4 py-2.5 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                                            {t("dashboard:table.noZip")}
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
                                              <div className="space-y-1.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-rose-500">
                                                <span className="flex items-center gap-2 text-xs font-semibold">
                                                  <AlertTriangle size={14} />
                                                  {isDeveloperCancelled
                                                    ? t(
                                                        "dashboard:table.contractCancelled",
                                                      )
                                                    : t(
                                                        "dashboard:table.gameRejected",
                                                      )}
                                                </span>
                                                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
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
                                              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                                <span className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                  <FileCheck
                                                    size={14}
                                                    className="text-sky-500"
                                                  />{" "}
                                                  {t(
                                                    "dashboard:table.publishingContract",
                                                  )}
                                                </span>
                                                <div className="flex items-center justify-between gap-3 text-xs">
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
                                                        className={`font-semibold ${
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
                                                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-amber-300 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
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
                                                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:text-emerald-300"
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
                                      <div className="flex min-w-0 flex-col justify-between gap-6">
                                        <div className="space-y-3">
                                          <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <Image
                                              size={14}
                                              className="text-sky-500"
                                            />{" "}
                                            {t("dashboard:table.screenshots")}
                                          </h4>
                                          {game.screenshots &&
                                          game.screenshots.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                                                    className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-sky-500/50 focus-within:border-sky-500 dark:border-slate-800"
                                                  >
                                                    <img
                                                      src={url}
                                                      alt={`Screenshot ${index + 1}`}
                                                      className="h-full w-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 opacity-0 transition-opacity group-hover:opacity-100">
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
                                            <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400">
                                              <Image
                                                size={20}
                                                className="mb-2 text-slate-400 dark:text-slate-600"
                                              />
                                              <span className="text-xs">
                                                {t(
                                                  "dashboard:table.noScreenshots",
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Video Gameplay */}
                                        <div className="space-y-3">
                                          <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <Video
                                              size={14}
                                              className="text-sky-500"
                                            />{" "}
                                            {t("dashboard:table.videoDemo")}
                                          </h4>
                                          {game.videoUrl ? (
                                            <div className="relative max-h-60 aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800">
                                              <video
                                                src={game.videoUrl}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400">
                                              <Video
                                                size={20}
                                                className="mb-2 text-slate-400 dark:text-slate-600"
                                              />
                                              <span className="text-xs">
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
                            {" "}
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
              <div className="space-y-4">
                {/* Asset Status Filter Chips */}
                <div className="dark-depth-card flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:items-center">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t("dashboard:filters.assetStatus")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {assetFilterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAssetStatusFilter(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                          assetStatusFilter === option.value
                            ? "bg-sky-500/10 text-sky-500 border-sky-500/30 font-semibold"
                            : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingMarketplace ? (
                  <div className="dark-depth-card flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-500 dark:border-slate-855 dark:bg-slate-900">
                    <RefreshCw className="animate-spin" size={18} />{" "}
                    {t("dashboard:table.loadingAssets")}
                  </div>
                ) : marketplaceError ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                    {t("dashboard:table.errorAssets", {
                      message: marketplaceError,
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                          <th className="p-3">
                            {t("dashboard:table.headers.details")}
                          </th>
                          <th className="p-3">
                            {t("dashboard:table.headers.productType")}
                          </th>
                          <th className="p-3">
                            {t("dashboard:table.headers.category")}
                          </th>
                          <th className="p-3">
                            {t("dashboard:table.headers.price")}
                          </th>
                          <th className="p-3 text-center">
                            {t("dashboard:table.headers.status")}
                          </th>
                          <th className="p-3 text-center">
                            {t("dashboard:table.headers.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                        {filteredMarketplaceItems.length > 0 ? (
                          filteredMarketplaceItems.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors"
                            >
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-100">
                                  {item.title}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  ID: {item.id}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border bg-amber-450/10 text-amber-500 border-amber-500/20">
                                  {t("dashboard:table.resourceAsset")}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-350">
                                {item.categoryName ||
                                  t("dashboard:table.unassigned")}
                              </td>
                              <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                {formatCurrencyValue(item.price, locale, t)}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    item.status === "active"
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                      : item.status === "pending"
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                                        : item.status === "rejected"
                                          ? "bg-rose-500/10 text-rose-505 border-rose-500/20"
                                          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                  }`}
                                >
                                  {getMarketplaceStatusLabel(item.status, t)}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() =>
                                    handleDeleteMarketplaceItem(item.id)
                                  }
                                  className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                  title={t(
                                    "dashboard:table.actions.removeProduct",
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="bg-slate-100/50 p-8 text-center font-medium text-slate-500 dark:bg-slate-955/20 dark:text-slate-400"
                            >
                              {myMarketplaceItems.length === 0
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
              <div className="space-y-4">
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
    </>
  );
};
