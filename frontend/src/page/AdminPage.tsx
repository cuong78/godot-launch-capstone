import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert,
  Users,
  Check,
  X,
  Settings,
  Terminal,
  Activity,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Video,
  Image,
  FileText,
  PenTool,
  Gamepad2,
  ShoppingBag,
  Database,
  Play,
  LayoutGrid,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "../components/Button";
import { Input, TextArea } from "../components/Input";
import {
  User,
  GameResponse,
  ContractResponse,
  MarketplaceItemResponse,
  PaymentResponse,
  AuditLogResponse,
  AuditLogFilterParams,
  AuditActionType,
  AuditTargetType,
  PlatformSettingsResponse,
  PayoutBalanceResponse,
} from "../types";
import api from "../api/axios";
import { userApi } from "../api/userApi";
import { gameApi } from "../api/gameApi";
import {
  contractApi,
  ContractAiSuggestionResponse,
} from "../api/contractApi";
import { marketplaceApi } from "../api/marketplaceApi";
import { platformSettingsApi } from "../api/platformSettingsApi";
import { walletApi } from "../api/walletApi";
import { paymentApi } from "../api/paymentApi";
import { useToast } from "../hooks/useToast";
import { SignaturePad } from "../components/SignaturePad";
import { ContractViewerModal } from "../components/ContractViewerModal";
import AdminDisputePanel from "../components/admin/AdminDisputePanel";
import AdminAgreementPanel from "../components/admin/AdminAgreementPanel";
import { AdminFileManagementPanel } from "../components/admin/AdminFileManagementPanel";
import { auditLogApi } from "../api/auditLogApi";
import {
  AdminUserManagementPanel,
  AdminUserRecord,
  AdminUserStatus,
  AdminUserUpdateInput,
} from "../components/admin/AdminUserManagementPanel";
import { AdminPaymentVerificationPanel } from "../components/admin/AdminPaymentVerificationPanel";
import { AdminFinanceWalletPanel } from "../components/admin/AdminFinanceWalletPanel";
import { AdminWithdrawalPanel } from "../components/admin/AdminWithdrawalPanel";
import AiReviewReportCard from "../components/admin/AiReviewReportCard";
import ExternalPublishStatusCard from "../components/admin/ExternalPublishStatusCard";
import { AdminMarketplaceActivityChart } from "../components/admin/AdminMarketplaceActivityChart";
import { AdminBannerPanel } from "../components/admin/AdminBannerPanel";
import { AdminContentManagementPanel } from "../components/admin/AdminContentManagementPanel";
import { AdminShell } from "../components/admin/AdminShell";
import {
  AdminSidebarNav,
  AdminSidebarNavItem,
} from "../components/admin/AdminSidebarNav";
import {
  ADMIN_NAVIGATION_EVENT,
  AdminNavigationDetail,
  consumeAdminNavigation,
} from "../utils/adminNavigation";

interface PendingAsset {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  date: string;
}

interface AdminPageProps {
  setCurrentScreen: (screen: any) => void;
  currentUser: User | null;
}

type AdminTabKey =
  | "moderation"
  | "users"
  | "wallet"
  | "payments"
  | "withdrawal"
  | "logs"
  | "settings"
  | "storage"
  | "banners"
  | "disputes"
  | "agreement"
  | "content";

type AdminSectionKey =
  | "overview"
  | "moderation"
  | "finance"
  | "users"
  | "content"
  | "system";

type ModerationStatusFilter =
  | "pending"
  | "approved_published"
  | "rejected"
  | "all";

interface FinanceRefreshState {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  isLoadingPrimary: boolean;
  isLoadingSecondary?: boolean;
}

const ADMIN_SECTION_TABS: Record<
  Exclude<AdminSectionKey, "overview">,
  AdminTabKey[]
> = {
  moderation: ["moderation"],
  finance: ["wallet", "payments", "withdrawal", "disputes"],
  users: ["users"],
  content: ["content"],
  system: ["logs", "settings", "storage", "agreement"],
};

const ADMIN_DEFAULT_TAB_BY_SECTION: Record<
  Exclude<AdminSectionKey, "overview">,
  AdminTabKey
> = {
  moderation: "moderation",
  finance: "wallet",
  users: "users",
  content: "content",
  system: "logs",
};

const SYSTEM_SECTION_TITLE_KEY_BY_TAB: Partial<Record<AdminTabKey, string>> = {
  logs: "sectionTitle.logs",
  settings: "sectionTitle.settings",
  storage: "sectionTitle.storage",
  banners: "sectionTitle.banners",
  disputes: "sectionTitle.disputes",
  agreement: "sectionTitle.agreement",
};

const isSoftDeletedUserEmail = (email: string) => email.includes("_deleted_");

const mapUserStatusToAdminStatus = (
  status?: string,
  email?: string,
): AdminUserStatus => {
  if (status === "banned") {
    return "banned";
  }

  if (status === "inactive") {
    return isSoftDeletedUserEmail(email || "") ? "inactive" : "suspended";
  }

  return "active";
};

const mapApiUserToAdminUser = (user: User): AdminUserRecord => {
  const email = user.email || "";
  const fullName = user.fullName || user.username || email;
  const roleName = user.roleName?.toLowerCase();
  const role: AdminUserRecord["role"] =
    roleName === "admin" || roleName === "developer" ? roleName : "customer";

  return {
    id: user.id || "",
    username: user.username || email.split("@")[0] || email,
    email,
    fullName,
    role,
    status: mapUserStatusToAdminStatus(user.status, email),
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    isSoftDeleted: isSoftDeletedUserEmail(email),
  };
};

const mapAdminStatusToApiStatus = (status: AdminUserStatus) => {
  if (status === "suspended") {
    return "inactive";
  }

  return status;
};

const getContractStatusLabel = (
  status: string,
  t: (key: string) => string,
) => {
  switch (status) {
    case "signed":
      return {
        text: t("status.contract.signed"),
        colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "cancelled":
      return {
        text: t("status.contract.cancelled"),
        colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      };
    case "expired":
      return {
        text: t("status.contract.expired"),
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
    case "pending":
    default:
      return {
        text: t("status.contract.pending"),
        colorClass:
          "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
      };
  }
};

const getAuditActions = (t: (key: string) => string) => [
  { value: "user_registered", label: t("audit.actions.user_registered") },
  { value: "user_login_success", label: t("audit.actions.user_login_success") },
  { value: "user_login_failed", label: t("audit.actions.user_login_failed") },
  { value: "user_logged_out", label: t("audit.actions.user_logged_out") },
  { value: "user_banned", label: t("audit.actions.user_banned") },
  { value: "user_unbanned", label: t("audit.actions.user_unbanned") },
  { value: "user_role_changed", label: t("audit.actions.user_role_changed") },
  { value: "game_submitted", label: t("audit.actions.game_submitted") },
  { value: "game_approved", label: t("audit.actions.game_approved") },
  { value: "game_rejected", label: t("audit.actions.game_rejected") },
  { value: "game_published", label: t("audit.actions.game_published") },
  { value: "game_updated", label: t("audit.actions.game_updated") },
  { value: "contract_created", label: t("audit.actions.contract_created") },
  { value: "contract_signed", label: t("audit.actions.contract_signed") },
  { value: "contract_cancelled", label: t("audit.actions.contract_cancelled") },
  { value: "security_alert", label: t("audit.actions.security_alert") },
  { value: "post_created", label: t("audit.actions.post_created") },
  { value: "comment_created", label: t("audit.actions.comment_created") },
  { value: "reaction_created", label: t("audit.actions.reaction_created") },
  { value: "chat_message_sent", label: t("audit.actions.chat_message_sent") },
];

const getAuditTargets = (t: (key: string) => string) => [
  { value: "user", label: t("audit.targets.user") },
  { value: "game", label: t("audit.targets.game") },
  { value: "contract", label: t("audit.targets.contract") },
  { value: "community_chat", label: t("audit.targets.community_chat") },
  { value: "chat_message", label: t("audit.targets.chat_message") },
  { value: "ai_report", label: t("audit.targets.ai_report") },
  { value: "transaction", label: t("audit.targets.transaction") },
  { value: "withdrawal", label: t("audit.targets.withdrawal") },
];

const getActionBadgeClass = (action: string) => {
  if (!action)
    return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
  const lower = action.toLowerCase();
  if (
    lower.includes("success") ||
    lower.includes("approved") ||
    lower.includes("signed")
  ) {
    return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  }
  if (
    lower.includes("failed") ||
    lower.includes("banned") ||
    lower.includes("rejected") ||
    lower.includes("cancelled") ||
    lower.includes("alert")
  ) {
    return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
  }
  if (
    lower.includes("submitted") ||
    lower.includes("created") ||
    lower.includes("sent")
  ) {
    return "bg-sky-500/10 text-sky-500 border border-sky-500/20";
  }
  return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
};

const resolveLocale = (language?: string | null) => {
  if (!language) {
    return "vi-VN";
  }

  if (language.startsWith("ja")) {
    return "ja-JP";
  }

  if (language.startsWith("en")) {
    return "en-US";
  }

  return "vi-VN";
};

const formatCurrency = (
  value: number | null | undefined,
  currency = "VND",
  locale = "vi-VN",
  fallbackLabel = "N/A",
) => {
  if (value == null || Number.isNaN(value)) {
    return fallbackLabel;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const getAdminPreviewRoleLabel = (
  role: AdminUserRecord["role"],
  t: (key: string) => string,
) => {
  switch (role) {
    case "admin":
      return t("roles.admin");
    case "developer":
      return t("roles.developer");
    case "customer":
    default:
      return t("roles.customer");
  }
};

const getAdminPreviewRoleBadgeClass = (role: AdminUserRecord["role"]) => {
  switch (role) {
    case "admin":
      return "border-amber-500/20 bg-amber-500/10 text-amber-500";
    case "developer":
      return "border-sky-500/20 bg-sky-500/10 text-sky-500";
    case "customer":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400";
  }
};

const getAdminPreviewStatusLabel = (
  status: AdminUserStatus,
  t: (key: string) => string,
) => {
  switch (status) {
    case "active":
      return t("status.user.active");
    case "inactive":
      return t("status.user.inactive");
    case "suspended":
      return t("status.user.suspended");
    case "banned":
      return t("status.user.banned");
    default:
      return status;
  }
};

const getAdminPreviewStatusBadgeClass = (status: AdminUserStatus) => {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
    case "inactive":
      return "border-slate-300 bg-slate-200/70 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400";
    case "suspended":
      return "border-orange-500/20 bg-orange-500/10 text-orange-500";
    case "banned":
      return "border-rose-500/20 bg-rose-500/10 text-rose-500";
    default:
      return "border-slate-300 bg-slate-100 text-slate-600";
  }
};

const getAdminPreviewInitials = (fullName: string, username: string) => {
  const source = fullName.trim() || username.trim() || "GL";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const formatAdminOverviewDate = (
  value: string | undefined,
  fallbackLabel: string,
  locale = "vi-VN",
) => {
  if (!value) {
    return fallbackLabel;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackLabel;
  }

  return parsed.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
};

export const AdminPage: React.FC<AdminPageProps> = ({
  setCurrentScreen,
  currentUser,
}) => {
  const { t, i18n } = useTranslation(["admin"]);
  const { showToast, showConfirm } = useToast();
  const locale = useMemo(
    () => resolveLocale(i18n.resolvedLanguage || i18n.language || "vi"),
    [i18n.language, i18n.resolvedLanguage],
  );
  const auditActions = useMemo(() => getAuditActions(t), [t]);
  const auditTargets = useMemo(() => getAuditTargets(t), [t]);
  const getAuditActionLabel = useCallback(
    (action?: string | null) => {
      if (!action) {
        return t("audit.unknownAction");
      }

      return auditActions.find((item) => item.value === action)?.label || action;
    },
    [auditActions, t],
  );
  const getAuditTargetLabel = useCallback(
    (targetType?: string | null) => {
      if (!targetType) {
        return t("audit.unknownTarget");
      }

      return (
        auditTargets.find((item) => item.value === targetType)?.label ||
        targetType
      );
    },
    [auditTargets, t],
  );
  const moderationStatusFilterOptions = useMemo(
    () => [
      {
        value: "pending" as ModerationStatusFilter,
        label: t("moderationQueue.filters.pending"),
      },
      {
        value: "approved_published" as ModerationStatusFilter,
        label: t("moderationQueue.filters.approvedPublished"),
      },
      {
        value: "rejected" as ModerationStatusFilter,
        label: t("moderationQueue.filters.rejected"),
      },
      {
        value: "all" as ModerationStatusFilter,
        label: t("moderationQueue.filters.all"),
      },
    ],
    [t],
  );
  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => {
    const saved = sessionStorage.getItem("admin_active_tab");
    return (saved as AdminTabKey) || "moderation";
  });
  const [activeSection, setActiveSection] = useState<AdminSectionKey>(() => {
    const saved = sessionStorage.getItem("admin_active_section");
    return (saved as AdminSectionKey) || "overview";
  });

  useEffect(() => {
    sessionStorage.setItem("admin_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem("admin_active_section", activeSection);
  }, [activeSection]);
  const [financeRefreshState, setFinanceRefreshState] =
    useState<FinanceRefreshState | null>(null);
  const [payoutBalance, setPayoutBalance] =
    useState<PayoutBalanceResponse | null>(null);
  const [isLoadingPayoutBalance, setIsLoadingPayoutBalance] = useState(false);
  const [payoutBalanceError, setPayoutBalanceError] = useState<string | null>(
    null,
  );

  // Real Game Moderation state
  const [allGames, setAllGames] = useState<GameResponse[]>([]);
  const [contracts, setContracts] = useState<ContractResponse[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(
    null,
  );
  const [isOpenLightbox, setIsOpenLightbox] = useState<boolean>(false);
  const [playDemoGame, setPlayDemoGame] = useState<GameResponse | null>(null);
  // ID to auto-highlight when navigating from a notification
  const [notificationWithdrawalId, setNotificationWithdrawalId] = useState<string | null>(null);
  const [notificationDisputeId, setNotificationDisputeId] = useState<string | null>(null);

  // Real Marketplace Moderation state
  const [allMarketplaceItems, setAllMarketplaceItems] = useState<
    MarketplaceItemResponse[]
  >([]);
  const [overviewPayments, setOverviewPayments] = useState<PaymentResponse[]>(
    [],
  );
  const [isLoadingMarketplace, setIsLoadingMarketplace] =
    useState<boolean>(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [expandedMarketplaceId, setExpandedMarketplaceId] = useState<
    string | null
  >(null);
  const [marketplaceItemDetails, setMarketplaceItemDetails] = useState<
    Record<string, MarketplaceItemResponse>
  >({});

  const getModerationPublishingLabel = (publishingType?: string) => {
    switch (publishingType) {
      case "full_acquisition":
        return t("fileManagement.publishing.fullAcquisition");
      case "co_publishing":
        return t("fileManagement.publishing.coPublishing");
      case "marketplace_listing":
      default:
        return t("fileManagement.publishing.marketplaceListing");
    }
  };

  const formatModerationPrice = (price?: number | null) => {
    if (price == null) {
      return t("moderationQueue.price.notSet");
    }

    if (price === 0) {
      return t("moderationQueue.price.free");
    }

    return formatCurrency(price, "VND", locale, t("withdrawal.na"));
  };
  const [marketplaceDetailLoadingId, setMarketplaceDetailLoadingId] = useState<
    string | null
  >(null);
  const [moderationSubTab, setModerationSubTab] = useState<
    "games" | "marketplace"
  >("games");

  // Status filter state: 'pending' | 'approved_published' | 'rejected' | 'all'
  const [moderationStatusFilter, setModerationStatusFilter] =
    useState<ModerationStatusFilter>("pending");

  const pendingGames = useMemo(() => {
    return allGames
      .filter((game: GameResponse) => {
        const status = game.status?.toLowerCase();
        if (moderationStatusFilter === "all") {
          return true;
        }
        if (moderationStatusFilter === "pending") {
          return status === "pending" || !!game.pendingUpdateSnapshotId;
        }
        if (moderationStatusFilter === "approved_published") {
          return status === "approved" || status === "published";
        }
        if (moderationStatusFilter === "rejected") {
          return status === "rejected";
        }
        return false;
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [allGames, moderationStatusFilter]);

  const pendingMarketplaceItems = useMemo(() => {
    return allMarketplaceItems
      .filter((item: MarketplaceItemResponse) => {
        const status = item.status?.toLowerCase();
        if (moderationStatusFilter === "all") {
          return true;
        }
        if (moderationStatusFilter === "pending") {
          return status === "pending";
        }
        if (moderationStatusFilter === "approved_published") {
          return status === "active";
        }
        if (moderationStatusFilter === "rejected") {
          return status === "rejected";
        }
        return false;
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [allMarketplaceItems, moderationStatusFilter]);

  const moderationItemsCount =
    pendingGames.length + pendingMarketplaceItems.length;
  const sidebarItems: AdminSidebarNavItem[] = [
    {
      key: "overview",
      label: t("sidebar.overview.label"),
      description: t("sidebar.overview.description"),
      icon: <Activity size={16} />,
    },
    {
      key: "moderation",
      label: t("sidebar.moderation.label"),
      description: t("sidebar.moderation.description"),
      icon: <FileCheck size={16} />,
      badge:
        moderationItemsCount > 0 ? String(moderationItemsCount) : undefined,
    },
    {
      key: "finance",
      label: t("sidebar.finance.label"),
      description: t("sidebar.finance.description"),
      icon: <DollarSign size={16} />,
    },
    {
      key: "users",
      label: t("sidebar.users.label"),
      description: t("sidebar.users.description"),
      icon: <Users size={16} />,
    },
    {
      key: "content",
      label: t("sidebar.content.label"),
      description: t("sidebar.content.description"),
      icon: <LayoutGrid size={16} />,
    },
    {
      key: "system",
      label: t("sidebar.system.label"),
      description: t("sidebar.system.description"),
      icon: <Database size={16} />,
    },
  ];
  const subTabItems: Array<{
    key: AdminTabKey;
    label: string;
    badge?: string;
  }> =
    activeSection === "overview"
      ? []
      : ADMIN_SECTION_TABS[activeSection].map((tabKey) => {
          switch (tabKey) {
            case "moderation":
              return {
                key: tabKey,
                label: t("tabs.queue"),
                badge:
                  moderationItemsCount > 0
                    ? String(moderationItemsCount)
                    : undefined,
              };
            case "payments":
              return { key: tabKey, label: t("tabs.payments") };
            case "wallet":
              return { key: tabKey, label: t("tabs.wallet") };
            case "withdrawal":
              return { key: tabKey, label: t("tabs.withdrawals") };
            case "users":
              return { key: tabKey, label: t("tabs.userDirectory") };
            case "logs":
              return { key: tabKey, label: t("tabs.auditLogs") };
            case "settings":
              return { key: tabKey, label: t("tabs.settings") };
            case "storage":
              return { key: tabKey, label: t("tabs.storage") };
            case "banners":
              return { key: tabKey, label: t("tabs.banners") };
            case "content":
              return { key: tabKey, label: t("tabs.content") };
            case "disputes":
              return { key: tabKey, label: t("tabs.disputes") };
            case "agreement":
              return { key: tabKey, label: t("tabs.agreement") };
            default:
              return { key: tabKey, label: tabKey };
          }
        });
  const systemSectionTitleKey = SYSTEM_SECTION_TITLE_KEY_BY_TAB[activeTab];
  const systemSectionTitle = systemSectionTitleKey
    ? t(systemSectionTitleKey)
    : t("sectionTitle.default");
  const handleSectionSelect = (section: AdminSectionKey) => {
    setActiveSection(section);

    if (section === "overview") {
      return;
    }

    if (!ADMIN_SECTION_TABS[section].includes(activeTab)) {
      setActiveTab(ADMIN_DEFAULT_TAB_BY_SECTION[section]);
    }
  };
  const handleOpenSectionTab = (
    section: Exclude<AdminSectionKey, "overview">,
    tab: AdminTabKey,
  ) => {
    setActiveSection(section);
    setActiveTab(tab);
  };

  const applyAdminNavigation = (detail: AdminNavigationDetail) => {
    setActiveSection(detail.section);

    if (detail.section === "overview") {
      return;
    }

    setActiveTab(detail.tab ?? ADMIN_DEFAULT_TAB_BY_SECTION[detail.section]);

    if (!detail.targetId) return;

    // Handle specific entity types
    switch (detail.targetType) {
      case 'game':
        // NEW_SUBMISSION: navigate to moderation, expand the game row
        setModerationSubTab("games");
        setModerationStatusFilter("all");
        setExpandedGameId(detail.targetId);
        break;
      case 'contract':
        // SELLER_RESPONSE: navigate to moderation, find game by contractId
        setModerationSubTab("games");
        setModerationStatusFilter("all");
        // Find game whose contractId matches
        setExpandedGameId((prev) => {
          const game = contracts?.find(c => c.id === detail.targetId);
          return game ? (game as any).gameId ?? prev : prev;
        });
        break;
      case 'withdrawal':
        // WITHDRAWAL_REQUEST: navigate to finance/withdrawal and highlight request
        setNotificationWithdrawalId(detail.targetId);
        break;
      case 'dispute':
        // PLAGIARISM_ALERT: navigate to finance/disputes and highlight dispute
        setNotificationDisputeId(detail.targetId);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const pendingNavigation = consumeAdminNavigation();
    if (pendingNavigation) {
      applyAdminNavigation(pendingNavigation);
    }

    const handleAdminNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<AdminNavigationDetail>;
      const detail = customEvent.detail;

      if (!detail) {
        return;
      }

      consumeAdminNavigation();
      applyAdminNavigation(detail);
    };

    window.addEventListener(
      ADMIN_NAVIGATION_EVENT,
      handleAdminNavigation as EventListener,
    );

    return () => {
      window.removeEventListener(
        ADMIN_NAVIGATION_EVENT,
        handleAdminNavigation as EventListener,
      );
    };
  }, []);

  // Scroll to highlighted game row once it's visible in the DOM
  useEffect(() => {
    if (!expandedGameId) return;
    const el = document.getElementById(`admin-game-row-${expandedGameId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [expandedGameId, pendingGames]);

  // Contract Offer states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameResponse | null>(null);

  // Rejection modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectItemId, setRejectItemId] = useState<string>("");
  const [rejectItemTitle, setRejectItemTitle] = useState<string>("");
  const [rejectItemType, setRejectItemType] = useState<"game" | "marketplace">(
    "game",
  );
  const [rejectReason, setRejectReason] = useState<string>(
    t("moderationQueue.messages.defaultRejectReason"),
  );
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<ContractResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"view">("view");

  // Form states for creating contract
  const [contractType, setContractType] = useState<
    "full_acquisition" | "co_publishing"
  >("full_acquisition");
  const [buyerRepresentative, setBuyerRepresentative] = useState("");
  const [buyerPosition, setBuyerPosition] = useState(
    t("contract.defaultBuyerPosition"),
  );
  const [sellerRepresentative, setSellerRepresentative] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerTaxCode, setSellerTaxCode] = useState("");
  const [lumpSumAmount, setLumpSumAmount] = useState("");
  const [revenueSplit, setRevenueSplit] = useState(70);
  const [disputeResolutionClause, setDisputeResolutionClause] = useState(
    t("contract.defaultDisputeClause"),
  );
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [adminSignatureBase64, setAdminSignatureBase64] = useState<
    string | null
  >(null);
  const [aiSuggestion, setAiSuggestion] =
    useState<ContractAiSuggestionResponse | null>(null);
  const [isLoadingAiSuggestion, setIsLoadingAiSuggestion] = useState(false);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(
    null,
  );
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    setDownloadingFile(fileUrl);
    try {
      const response = await api.get("/api/admin/storage/files/download", {
        params: { fileUrl, fileType: "source_bundle" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      showToast(t("alerts.downloadFailed"), 'error');
    } finally {
      setDownloadingFile(null);
    }
  };

  const fetchPendingGamesAndContracts = async () => {
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const [gamesRes, contractsRes] = await Promise.all([
        gameApi.getAllGames(),
        contractApi.getAllContracts(),
      ]);

      if (gamesRes.success && gamesRes.data) {
        setAllGames(gamesRes.data);
      } else {
        setGamesError(gamesRes.message || t("errors.loadGames"));
      }

      if (contractsRes.success && contractsRes.data) {
        setContracts(contractsRes.data);
      }
    } catch (err: any) {
      setGamesError(
        err.response?.data?.message ||
          err.message ||
          t("errors.fetchModerationQueue"),
      );
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchPendingMarketplaceItems = async () => {
    setIsLoadingMarketplace(true);
    setMarketplaceError(null);
    try {
      const res = await marketplaceApi.getAllMarketplaceItems();
      if (res.success && res.data) {
        setAllMarketplaceItems(res.data);
      } else {
        setMarketplaceError(res.message || t("errors.loadMarketplaceItems"));
      }
    } catch (err: any) {
      setMarketplaceError(
        err.response?.data?.message ||
          err.message ||
          t("errors.fetchMarketplaceSubmissions"),
      );
    } finally {
      setIsLoadingMarketplace(false);
    }
  };

  const fetchOverviewPayments = useCallback(async () => {
    try {
      const response = await paymentApi.getAdminPayments();
      if (response.success && response.data) {
        setOverviewPayments(response.data);
      }
    } catch (error) {
      console.error("Failed to load overview payments", error);
    }
  }, []);

  const fetchMarketplaceItemDetail = async (itemId: string) => {
    setMarketplaceDetailLoadingId(itemId);
    try {
      const res = await marketplaceApi.getMarketplaceItemById(itemId);
      if (res.success && res.data) {
        setMarketplaceItemDetails((prev) => ({
          ...prev,
          [itemId]: res.data!,
        }));
      }
    } catch (err) {
      console.error("Failed to refresh marketplace item detail", err);
    } finally {
      setMarketplaceDetailLoadingId((current) =>
        current === itemId ? null : current,
      );
    }
  };

  const handleToggleMarketplaceDetail = async (itemId: string) => {
    if (expandedMarketplaceId === itemId) {
      setExpandedMarketplaceId(null);
      return;
    }

    setExpandedMarketplaceId(itemId);
    await fetchMarketplaceItemDetail(itemId);
  };

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const response = await userApi.getAllUsers();
      if (response.success && response.data) {
        const mappedUsers = response.data.map(mapApiUserToAdminUser);
        setUsers(mappedUsers);
      } else {
        setUsersError(response.message || t("errors.loadUsers"));
      }
    } catch (err: any) {
      setUsersError(
        err.response?.data?.message || err.message || t("errors.fetchUsers"),
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Real Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Filters state
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterTargetType, setFilterTargetType] = useState<string>("");
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const [isModerationStatusDropdownOpen, setIsModerationStatusDropdownOpen] = useState(false);
  const [searchActorId, setSearchActorId] = useState<string>("");
  const [searchTargetId, setSearchTargetId] = useState<string>("");
  const [searchIpAddress, setSearchIpAddress] = useState<string>("");

  // Selected Log for detail modal / expanded view
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const params: AuditLogFilterParams = {
        page: currentPage,
        size: pageSize,
        actorId: searchActorId.trim() || undefined,
        action: (filterAction || undefined) as any,
        targetType: (filterTargetType || undefined) as any,
        targetId: searchTargetId.trim() || undefined,
        ipAddress: searchIpAddress.trim() || undefined,
      };
      const res = await auditLogApi.getAuditLogs(params);
      if (res.success && res.data) {
        setAuditLogs(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      } else {
        setLogsError(res.message || t("errors.loadAuditLogs"));
      }
    } catch (err: any) {
      setLogsError(
        err.response?.data?.message ||
          err.message ||
          t("errors.fetchAuditLogs"),
      );
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchPayoutBalance = useCallback(async () => {
    setIsLoadingPayoutBalance(true);
    setPayoutBalanceError(null);
    try {
      const response = await walletApi.getAdminPayoutBalance();
      if (!response.success || !response.data) {
        throw new Error(
          response.message || t("errors.loadPayoutWalletBalance"),
        );
      }

      setPayoutBalance(response.data);
    } catch (err: any) {
      setPayoutBalanceError(
        err.response?.data?.message ||
          err.message ||
          t("errors.loadPayoutWalletBalance"),
      );
    } finally {
      setIsLoadingPayoutBalance(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPlatformSettings();
    fetchPayoutBalance();
    fetchOverviewPayments();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "moderation") {
      fetchPendingGamesAndContracts();
      fetchPendingMarketplaceItems();
    } else if (activeTab === "logs") {
      fetchAuditLogs();
    } else if (activeTab === "settings") {
      fetchPlatformSettings();
    }
  }, [activeTab, currentPage, pageSize, filterAction, filterTargetType]);

  const payoutBalanceDisplay = isLoadingPayoutBalance
    ? t("common.loading")
    : payoutBalance
      ? formatCurrency(
          Number(payoutBalance.balance),
          payoutBalance.currency || "VND",
          locale,
          t("withdrawal.na"),
        )
      : t("withdrawal.na");

  const payoutBalanceCaption = payoutBalanceError
    ? t("overviewCards.payoutWalletError")
    : payoutBalance
      ? t("overviewCards.payoutWalletSynced")
      : t("overviewCards.payoutWalletLoading");

  const handleApplyTextFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setFilterAction("");
    setFilterTargetType("");
    setSearchActorId("");
    setSearchTargetId("");
    setSearchIpAddress("");
    setCurrentPage(0);
    setTimeout(() => {
      fetchAuditLogs();
    }, 50);
  };

  const applyPlatformSettings = (settings: PlatformSettingsResponse) => {
    setCommission(Number(settings.commissionRate) || 0);
    setWithdrawalHoldDays(Number(settings.withdrawalHoldDays) || 0);
    setRefundDeadlineDays(Number(settings.refundDeadlineDays) || 0);
    setDisputeBanThreshold(Number(settings.disputeBanThreshold) || 3);
    setDailyMaintenanceTime(settings.dailyMaintenanceTime || "02:00:00");
    setMaintenance(Boolean(settings.maintenanceMode));
    setAnnouncement(settings.announcementBanner || "");
  };

  const fetchPlatformSettings = async () => {
    setIsLoadingSettings(true);
    setSettingsError(null);
    try {
      const response = await platformSettingsApi.getPlatformSettings();
      if (!response.success || !response.data) {
        throw new Error(response.message || t("errors.loadPlatformSettings"));
      }

      applyPlatformSettings(response.data);
    } catch (err: any) {
      setSettingsError(
        err.response?.data?.message ||
          err.message ||
          t("errors.loadPlatformSettings"),
      );
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Platform settings state
  const [commission, setCommission] = useState(10);
  const [withdrawalHoldDays, setWithdrawalHoldDays] = useState(5);
  const [refundDeadlineDays, setRefundDeadlineDays] = useState(5);
  const [disputeBanThreshold, setDisputeBanThreshold] = useState(3);
  const [dailyMaintenanceTime, setDailyMaintenanceTime] = useState("02:00:00");
  const [maintenance, setMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "GodotLaunch Matrix Engine Upgrade is complete!",
  );
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleApproveGame = (game: GameResponse) => {
    if (!game.publishingType || game.publishingType === "marketplace_listing") {
      showConfirm(
        t("moderationQueue.messages.approveGameConfirm", {
          title: game.title,
        }),
        async () => {
          try {
            const res = await gameApi.approveGame(game.id);
            if (res.success) {
              showToast(
                t("moderationQueue.messages.approveGameSuccess", {
                  title: game.title,
                }),
                'success',
              );
              fetchPendingGamesAndContracts();
            } else {
              showToast(res.message || t("errors.approveGame"), 'error');
            }
          } catch (err: any) {
            showToast(
              err.response?.data?.message ||
              err.message ||
              t("errors.approveGame"),
              'error',
            );
          }
        }
      );
    } else {
      // Contract-based game: Open contract creation modal directly upon approval!
      handleOpenContractModal(game);
    }
  };

  const handleRejectGame = (id: string, title: string) => {
    setRejectItemId(id);
    setRejectItemTitle(title);
    setRejectItemType("game");
    setRejectReason(t("moderationQueue.messages.defaultRejectReason"));
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectReason.trim()) {
      showToast(t("errors.rejectionReasonRequired"), 'warning');
      return;
    }
    setIsSubmittingReject(true);
    try {
      if (rejectItemType === "game") {
        const res = await gameApi.rejectGame(rejectItemId, rejectReason);
        if (res.success) {
          showToast(
            t("moderationQueue.messages.rejectGameSuccess", {
              title: rejectItemTitle,
            }),
            'success',
          );
          setIsRejectModalOpen(false);
          fetchPendingGamesAndContracts();
        } else {
          showToast(res.message || t("errors.rejectGame"), 'error');
        }
      } else {
        const res = await marketplaceApi.rejectMarketplaceItem(
          rejectItemId,
          rejectReason,
        );
        if (res.success) {
          showToast(
            t("moderationQueue.messages.rejectAssetSuccess", {
              title: rejectItemTitle,
            }),
            'success',
          );
          setIsRejectModalOpen(false);
          fetchPendingMarketplaceItems();
        } else {
          showToast(res.message || t("errors.rejectMarketplaceItem"), 'error');
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message ||
          err.message ||
          t("moderationQueue.messages.rejectItemFailed"),
        'error',
      );
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleApproveMarketplaceItem = (
    item: MarketplaceItemResponse,
  ) => {
    showConfirm(
      t("moderationQueue.messages.approveAssetConfirm", {
        title: item.title,
      }),
      async () => {
        try {
          const res = await marketplaceApi.approveMarketplaceItem(item.id);
          if (res.success) {
            showToast(
              t("moderationQueue.messages.approveAssetSuccess", {
                title: item.title,
              }),
              'success',
            );
            fetchPendingMarketplaceItems();
          } else {
            showToast(res.message || t("errors.approveMarketplaceItem"), 'error');
          }
        } catch (err: any) {
          showToast(
            err.response?.data?.message ||
              err.message ||
              t("errors.approveMarketplaceItem"),
            'error',
          );
        }
      }
    );
  };

  const handleRejectMarketplaceItem = (id: string, title: string) => {
    setRejectItemId(id);
    setRejectItemTitle(title);
    setRejectItemType("marketplace");
    setRejectReason(t("moderationQueue.messages.defaultRejectReason"));
    setIsRejectModalOpen(true);
  };

  const handleOpenContractModal = (game: GameResponse) => {
    setSelectedGame(game);
    // Prefill details — loại hợp đồng mặc định theo lựa chọn của developer lúc
    // đăng game, nhưng admin có thể đổi tự do qua dropdown trước khi gửi.
    setContractType(
      game.publishingType === "co_publishing"
        ? "co_publishing"
        : "full_acquisition",
    );
    setBuyerRepresentative(currentUser?.fullName || "Ban quản trị GodotLaunch");
    setBuyerPosition("Authorized Representative");
    setSellerRepresentative(game.creatorFullName || game.creatorName || "");
    setSellerAddress("");
    setSellerTaxCode("");

    // Prefill proposed price if present
    if (game.priceProposed !== undefined && game.priceProposed !== null) {
      if (game.priceProposed === 0) {
        setLumpSumAmount("0 VND");
      } else {
        setLumpSumAmount(game.priceProposed.toLocaleString("vi-VN") + " VND");
      }
    } else {
      setLumpSumAmount("");
    }

    setRevenueSplit(70);
    setAdditionalTerms("");
    setAdminSignatureBase64(null);
    setAiSuggestion(null);
    setAiSuggestionError(null);
    setIsContractModalOpen(true);
  };

  const handleRequestAiSuggestion = async () => {
    if (!selectedGame) return;
    setIsLoadingAiSuggestion(true);
    setAiSuggestionError(null);
    try {
      const res = await contractApi.suggestContractTerms(selectedGame.id);
      if (res.success && res.data) {
        if (res.data.unavailable) {
          setAiSuggestionError(
            res.data.reasoning || t("contractComposer.aiSuggestion.error"),
          );
        } else {
          setAiSuggestion(res.data);
        }
      } else {
        setAiSuggestionError(
          res.message || t("contractComposer.aiSuggestion.error"),
        );
      }
    } catch (err: any) {
      setAiSuggestionError(
        err.response?.data?.message ||
          err.message ||
          t("contractComposer.aiSuggestion.error"),
      );
    } finally {
      setIsLoadingAiSuggestion(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setContractType(aiSuggestion.suggestedContractType);
    if (aiSuggestion.suggestedContractType === "co_publishing") {
      setRevenueSplit(aiSuggestion.suggestedRevenueSplit ?? 70);
    } else if (aiSuggestion.suggestedLumpSumAmount !== undefined) {
      setLumpSumAmount(
        aiSuggestion.suggestedLumpSumAmount.toLocaleString("vi-VN") + " VND",
      );
    }
  };

  const handleCreateContractOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;
    if (!adminSignatureBase64) {
      showToast(t("contractComposer.signatureRequired"), 'warning');
      return;
    }

    try {
      const res = await contractApi.createOffer({
        gameId: selectedGame.id,
        contractType,
        revenueSplit:
          contractType === "co_publishing" ? revenueSplit : undefined,
        lumpSumAmount:
          contractType === "full_acquisition" ? lumpSumAmount : undefined,
        disputeResolutionClause,
        additionalTerms: additionalTerms || undefined,
        buyerRepresentative,
        buyerPosition,
        sellerRepresentative,
        sellerAddress,
        sellerTaxCode,
        buyerSignatureBase64: adminSignatureBase64,
      });

      if (res.success) {
        showToast(t("contractComposer.createSuccess"), 'success');
        setIsContractModalOpen(false);
        fetchPendingGamesAndContracts();
      } else {
        showToast(res.message || t("contractComposer.createError"), 'error');
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message ||
          err.message ||
          t("contractComposer.createRequestError"),
        'error',
      );
    }
  };

  const handleAdminUserUpdate = async (input: AdminUserUpdateInput) => {
    const existingUser = users.find((user) => user.id === input.id);
    if (!existingUser) {
      throw new Error(t("userPanel.userNotFound"));
    }

    try {
      const response = await userApi.updateUser(input.id, {
        fullName: input.fullName,
        email: input.email,
        roleName: input.role,
        status: mapAdminStatusToApiStatus(input.status),
        banReason: input.banReason,
        avatarUrl: existingUser.avatarUrl,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || t("errors.updateUser"));
      }

      const updatedUser = mapApiUserToAdminUser(response.data);
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === input.id ? updatedUser : user)),
      );
    } catch (err: any) {
      throw new Error(
        err.response?.data?.message || err.message || t("errors.updateUser"),
      );
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      const response = await platformSettingsApi.updatePlatformSettings({
        commissionRate: commission,
        withdrawalHoldDays,
        refundDeadlineDays,
        disputeBanThreshold,
        dailyMaintenanceTime,
        maintenanceMode: maintenance,
        announcementBanner: announcement.trim() || null,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || t("errors.updatePlatformSettings"),
        );
      }

      applyPlatformSettings(response.data);
      setSettingsSuccess(true);
      window.setTimeout(() => setSettingsSuccess(false), 2000);
    } catch (err: any) {
      setSettingsError(
        err.response?.data?.message ||
          err.message ||
          t("errors.updatePlatformSettings"),
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <>
      <AdminShell
        sidebar={
          <AdminSidebarNav
            items={sidebarItems}
            activeKey={activeSection}
            onSelect={(key) => handleSectionSelect(key as AdminSectionKey)}
          />
        }
        topbar={null}
      >
        <div className="space-y-5 animate-fade-in py-1">
          {activeSection === "overview" ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200/90 bg-white/96 p-4 shadow-[0_14px_36px_rgba(148,163,184,0.12)] space-y-2.5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-none">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <DollarSign size={12} className="text-sky-500" />{" "}
                    {t("overviewCards.payoutWalletBalance")}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold dark:text-white">
                      {payoutBalanceDisplay}
                    </span>
                    {!isLoadingPayoutBalance &&
                      !payoutBalanceError &&
                      payoutBalance?.currency && (
                        <span className="text-[10px] text-emerald-500 font-bold font-mono">
                          {payoutBalance.currency}
                        </span>
                      )}
                  </div>
                  <p
                    className={`text-[9px] leading-tight ${payoutBalanceError ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    {payoutBalanceCaption}
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200/90 bg-white/96 p-4 shadow-[0_14px_36px_rgba(148,163,184,0.12)] space-y-2.5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-none">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <Users size={12} className="text-amber-500" />{" "}
                    {t("overviewCards.platformAccounts")}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold dark:text-white">
                      {t("overviewCards.userCount", { count: users.length })}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-bold font-mono">
                      {t("overviewCards.liveDirectory")}
                    </span>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/90 bg-white/96 p-4 shadow-[0_14px_36px_rgba(148,163,184,0.12)] space-y-2.5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-none">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <FileCheck size={12} className="text-purple-500" />{" "}
                    {t("moderationPreview.pendingModeration")}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold dark:text-white">
                      {t("overviewCards.moderationItemCount", {
                        count: moderationItemsCount,
                      })}
                    </span>
                    {moderationItemsCount > 0 && (
                      <span className="text-[10px] text-amber-500 font-bold font-mono animate-pulse">
                        {t("overview.actionRequiredBadge")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_336px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <AdminMarketplaceActivityChart
                  games={allGames}
                  marketplaceItems={allMarketplaceItems}
                  payments={overviewPayments}
                />

                <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/45 dark:shadow-none xl:ml-auto xl:w-full">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
                        <ShieldAlert size={16} />
                      </span>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">
                          {t("moderationPreview.title")}
                        </h3>
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500 leading-none">
                          {t("moderationPreview.queueCount", {
                            count: moderationItemsCount,
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenSectionTab("moderation", "moderation")
                      }
                      className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-studio hover:border-amber-400/35 hover:text-amber-600 dark:hover:text-amber-300"
                    >
                      {t("moderationPreview.open")}
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {isLoadingGames || isLoadingMarketplace ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        {t("moderationPreview.loading")}
                      </div>
                    ) : gamesError || marketplaceError ? (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
                        {gamesError || marketplaceError}
                      </div>
                    ) : moderationItemsCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        {t("moderationPreview.empty")}
                      </div>
                    ) : (
                      <>
                        {pendingGames.slice(0, 2).map((game) => (
                          <div
                            key={game.id}
                            className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-3.5 shadow-[0_10px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
                                <Gamepad2 size={16} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                      {game.title}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                      {game.creatorFullName ||
                                        game.creatorName ||
                                        t("moderationPreview.unknownCreator")}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-500">
                                      {t("moderationPreview.gameType")}
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                      {formatAdminOverviewDate(
                                        game.createdAt,
                                        t("moderationPreview.newLabel"),
                                        locale,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {pendingMarketplaceItems.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-3.5 shadow-[0_10px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                                <ShoppingBag size={16} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                      {item.title}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                      {item.sellerFullName ||
                                        item.sellerEmail ||
                                        t("moderationPreview.unknownSeller")}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                                      {t("moderationPreview.assetType")}
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                      {formatAdminOverviewDate(
                                        item.createdAt,
                                        t("moderationPreview.newLabel"),
                                        locale,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_336px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/45 dark:shadow-none">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
                        <Users size={16} />
                      </span>
                      <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        {t("overviewUsers.title")}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSectionTab("users", "users")}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-studio hover:border-sky-400/35 hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {t("overviewUsers.open")}
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {isLoadingUsers ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        {t("overviewUsers.loading")}
                      </div>
                    ) : usersError ? (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
                        {usersError}
                      </div>
                    ) : users.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        {t("overviewUsers.empty")}
                      </div>
                    ) : (
                      users.slice(0, 4).map((user) => {
                        const isCurrentAdmin =
                          (currentUser?.id && currentUser.id === user.id) ||
                          (!!currentUser?.email &&
                            currentUser.email === user.email);

                        return (
                          <div
                            key={user.id}
                            className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-4 shadow-[0_10px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none"
                          >
                            <div className="flex items-start gap-3">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.fullName || user.username}
                                  className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 object-cover dark:border-slate-800"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-200/70 via-white to-amber-100/80 text-xs font-bold text-slate-700 dark:border-slate-800 dark:from-sky-500/10 dark:via-slate-900 dark:to-amber-500/10 dark:text-slate-200">
                                  {getAdminPreviewInitials(
                                    user.fullName,
                                    user.username,
                                  )}
                                </div>
                              )}

                              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                      {user.fullName || user.username}
                                    </div>
                                    {isCurrentAdmin ? (
                                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                                        {t("userPanel.you")}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                    {user.email}
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getAdminPreviewRoleBadgeClass(user.role)}`}
                                  >
                                    {getAdminPreviewRoleLabel(user.role, t)}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getAdminPreviewStatusBadgeClass(user.status)}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {getAdminPreviewStatusLabel(user.status, t)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/45 dark:shadow-none">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {t("overview.platformSnapshot")}
                    </h3>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-4 shadow-[0_10px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {t("overview.commissionRate")}
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                        {commission}%
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {activeSection !== "moderation" &&
              activeSection !== "finance" &&
              activeSection !== "users" &&
              activeSection !== "content" &&
              activeSection !== "system" ? (
                <div className="flex flex-wrap gap-2">
                  {subTabItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={`flex items-center rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-studio ${
                        item.badge
                          ? "min-w-[124px] justify-between gap-3"
                          : "gap-2"
                      } ${
                        activeTab === item.key
                          ? "border-sky-400/35 bg-sky-400/12 text-sky-700 dark:text-sky-200"
                          : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/45 text-slate-600 dark:text-slate-350 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className={item.badge ? "text-left" : ""}>
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-600 dark:text-amber-300">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.14)] backdrop-blur-md min-h-[300px] dark:border-slate-800/60 dark:bg-slate-900/45 dark:shadow-none">
                {activeSection === "finance" ? (
                  <div className="mb-6 space-y-5 border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-[28px]">
                            {activeTab === "disputes" ? t("sectionTitle.disputes") : t("finance.platformWalletTitle")}
                          </h3>
                          <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                            {activeTab === "disputes"
                              ? t("disputePanel.description", { defaultValue: "Quản lý và giải quyết các khiếu nại tranh chấp bản quyền mã nguồn giữa các nhà phát triển." })
                              : t("finance.platformWalletDescription")}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={
                            <RefreshCw
                              size={14}
                              className={
                                financeRefreshState?.isRefreshing ||
                                financeRefreshState?.isLoadingPrimary ||
                                financeRefreshState?.isLoadingSecondary
                                  ? "animate-spin"
                                  : ""
                              }
                            />
                          }
                          onClick={() => financeRefreshState?.refresh()}
                          disabled={!financeRefreshState}
                        >
                          {t("finance.refreshWallet")}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 border-b border-slate-200/70 dark:border-slate-800/70">
                      {subTabItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setFinanceRefreshState(null);
                            setActiveTab(item.key);
                          }}
                          className={`relative -mb-px pb-3 font-display text-lg font-semibold tracking-tight transition-colors ${
                            activeTab === item.key
                              ? "border-b-2 border-emerald-400 text-slate-900 dark:text-white"
                              : "border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeSection === "system" ? (
                  <div className="mb-6 space-y-5 border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
                    <div className="space-y-2">
                      <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-[28px]">
                        {systemSectionTitle}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 border-b border-slate-200/70 dark:border-slate-800/70">
                      {subTabItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveTab(item.key)}
                          className={`relative -mb-px pb-3 font-display text-lg font-semibold tracking-tight transition-colors ${
                            activeTab === item.key
                              ? "border-b-2 border-emerald-400 text-slate-900 dark:text-white"
                              : "border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Tab 1: Moderation Queue */}
                {activeTab === "moderation" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200 sm:text-[22px]">
                        {t("moderationQueue.title")}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("moderation")}
                        className="inline-flex min-w-[108px] items-center justify-between gap-3 rounded-2xl border border-sky-400/35 bg-sky-400/12 px-4 py-2 text-sm font-semibold text-sky-700 transition-studio dark:text-sky-200"
                      >
                        <span>{t("moderationQueue.queueBadge")}</span>
                        {moderationItemsCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-600 dark:text-amber-300">
                            {moderationItemsCount}
                          </span>
                        ) : null}
                      </button>
                    </div>

                    {/* Moderation Sub-Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800/60 gap-1 mb-4">
                      <button
                        onClick={() => setModerationSubTab("games")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-205 cursor-pointer ${
                          moderationSubTab === "games"
                            ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
                        }`}
                      >
                        <Gamepad2 size={14} />
                        {t("moderationQueue.tabs.games")}
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md ${
                            moderationSubTab === "games"
                              ? "bg-slate-950 text-amber-400"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {pendingGames.length}
                        </span>
                      </button>
                      <button
                        onClick={() => setModerationSubTab("marketplace")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-205 cursor-pointer ${
                          moderationSubTab === "marketplace"
                            ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
                        }`}
                      >
                        <ShoppingBag size={14} />
                        {t("moderationQueue.tabs.assets")}
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md ${
                            moderationSubTab === "marketplace"
                              ? "bg-slate-950 text-amber-400"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
                          }`}
                        >
                          {pendingMarketplaceItems.length}
                        </span>
                      </button>
                    </div>

                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        {t("moderationQueue.statusLabel")}
                      </div>

                      <div className="relative w-full sm:w-[260px] z-20">
                        <button
                          type="button"
                          onClick={() => setIsModerationStatusDropdownOpen(!isModerationStatusDropdownOpen)}
                          className="w-full flex justify-between items-center rounded-xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-studio focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-slate-800/70 dark:bg-slate-950/80 dark:text-slate-200 text-left cursor-pointer"
                        >
                          <span>
                            {moderationStatusFilterOptions.find((opt) => opt.value === moderationStatusFilter)?.label}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${
                              isModerationStatusDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isModerationStatusDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-45"
                              onClick={() => setIsModerationStatusDropdownOpen(false)}
                            />
                            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 p-1">
                              {moderationStatusFilterOptions.map((option) => {
                                const active = option.value === moderationStatusFilter;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setModerationStatusFilter(option.value);
                                      setIsModerationStatusDropdownOpen(false);
                                    }}
                                    className={`w-full px-3.5 py-2.5 rounded-lg text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer ${
                                      active
                                        ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold"
                                        : "text-slate-750 dark:text-slate-350"
                                    }`}
                                  >
                                    <span>{option.label}</span>
                                    {active && <Check size={12} className="text-amber-500 font-bold" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {moderationSubTab === "games" ? (
                      <>
                        {isLoadingGames ? (
                          <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                            <RefreshCw className="animate-spin" size={18} />{" "}
                            {t("moderationQueue.loadingGames")}
                          </div>
                        ) : gamesError ? (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                            {t("moderationQueue.errorGames", {
                              error: gamesError,
                            })}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                                  <th className="p-3 w-10"></th>
                                  <th className="p-3">{t("moderationQueue.headers.assetDetails")}</th>
                                  <th className="p-3">{t("moderationQueue.headers.category")}</th>
                                  <th className="p-3">{t("moderationQueue.headers.publishingType")}</th>
                                  <th className="p-3">{t("moderationQueue.headers.proposedPrice")}</th>
                                  <th className="p-3 text-center">
                                    {t("moderationQueue.headers.contractStatus")}
                                  </th>
                                  <th className="p-3 text-center">{t("moderationQueue.headers.decisions")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                                {pendingGames.length > 0 ? (
                                  pendingGames.map((game) => (
                                    <React.Fragment key={game.id}>
                                      <tr
                                        id={`admin-game-row-${game.id}`}
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
                                                ? t("moderationQueue.actions.hideDetails")
                                                : t("moderationQueue.actions.showDetails")
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
                                            <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-800">
                                              v{game.version || "1.0.0"}
                                            </span>
                                            <span
                                              className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                                game.status?.toLowerCase() ===
                                                "pending"
                                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                                                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                              }`}
                                            >
                                              {game.status?.toLowerCase() ===
                                              "pending"
                                                ? t("moderationQueue.status.pendingReview")
                                                : t("moderationQueue.status.approved")}
                                            </span>
                                            <button
                                              onClick={() =>
                                                setExpandedGameId(
                                                  expandedGameId === game.id
                                                    ? null
                                                    : game.id,
                                                )
                                              }
                                              className="text-slate-400 hover:text-amber-500 transition-colors"
                                              title={t("moderationQueue.actions.quickView")}
                                            >
                                              <Eye size={12} />
                                            </button>
                                          </div>
                                          <div className="text-[10px] text-slate-500 dark:text-slate-455">
                                            {t("moderationQueue.by", {
                                              name: game.creatorName,
                                            })}
                                          </div>
                                        </td>
                                        <td className="p-3 text-slate-600 dark:text-slate-350">
                                          {game.categoryName ||
                                            t("moderationQueue.unassigned")}
                                        </td>
                                        <td className="p-3">
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                              game.publishingType ===
                                              "full_acquisition"
                                                ? "bg-amber-450/10 text-amber-500 border-amber-500/20"
                                                : game.publishingType ===
                                                    "co_publishing"
                                                  ? "bg-sky-450/10 text-sky-500 border-sky-500/20"
                                                  : "bg-slate-100 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800"
                                            }`}
                                          >
                                            {getModerationPublishingLabel(
                                              game.publishingType,
                                            )}
                                          </span>
                                        </td>
                                        <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                          {formatModerationPrice(
                                            game.priceProposed,
                                          )}
                                        </td>
                                        <td className="p-3 text-center">
                                          {(() => {
                                            const contract = [...contracts]
                                              .reverse()
                                              .find(
                                                (c) =>
                                                  c.gameId === game.id &&
                                                  c.status !== "cancelled",
                                              );
                                            if (!contract) {
                                              return (
                                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                                  {t("status.contract.notCreated")}
                                                </span>
                                              );
                                            }
                                            const statusInfo =
                                              getContractStatusLabel(
                                                contract.status,
                                                t,
                                              );
                                            return (
                                              <span
                                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${statusInfo.colorClass}`}
                                              >
                                                {statusInfo.text}
                                              </span>
                                            );
                                          })()}
                                        </td>
                                        <td className="p-3 text-center">
                                          {(() => {
                                            const approveRejectButtons = (
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  onClick={() =>
                                                    handleApproveGame(game)
                                                  }
                                                  className="p-1.5 bg-emerald-50 dark:bg-emerald-955/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-lg transition-studio border border-transparent dark:border-emerald-900/30 cursor-pointer"
                                                  title={t("actions.approveGame")}
                                                >
                                                  <Check size={14} />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleRejectGame(
                                                      game.id,
                                                      game.title,
                                                    )
                                                  }
                                                  className="p-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-studio border border-transparent dark:border-rose-900/30 cursor-pointer"
                                                  title={t("actions.rejectGame")}
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            );

                                            if (
                                              game.status?.toLowerCase() ===
                                              "rejected"
                                            ) {
                                              return (
                                                <span className="inline-block px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold font-display">
                                                  {t("moderationQueue.decision.rejected")}
                                                </span>
                                              );
                                            }

                                            if (game.pendingUpdateSnapshotId) {
                                              return approveRejectButtons;
                                            }

                                            if (
                                              game.publishingType ===
                                              "marketplace_listing"
                                            ) {
                                              if (
                                                game.status?.toLowerCase() ===
                                                "pending"
                                              ) {
                                                return approveRejectButtons;
                                              }
                                                return game.status?.toLowerCase() ===
                                                "published" ? (
                                                <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold font-display">
                                                  {t("moderationQueue.decision.live")}
                                                </span>
                                              ) : (
                                                <span className="inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[10px] font-bold font-display">
                                                  {t("moderationQueue.decision.approved")}
                                                </span>
                                              );
                                            }

                                            // full_acquisition / co_publishing — luồng hợp đồng + push Google Play
                                            const contract = [...contracts]
                                              .reverse()
                                              .find(
                                                (c) =>
                                                  c.gameId === game.id &&
                                                  c.status !== "cancelled",
                                              );

                                            if (!contract) {
                                              if (
                                                game.status?.toLowerCase() ===
                                                "pending"
                                              ) {
                                                return approveRejectButtons;
                                              }
                                              return (
                                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                                  —
                                                </span>
                                              );
                                            }

                                            if (contract.status === "pending") {
                                              return (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(
                                                      contract,
                                                    );
                                                    setViewerMode("view");
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
                                                >
                                                  <Eye size={12} />
                                                  {t("moderationQueue.decision.waitingDevSignature")}
                                                </button>
                                              );
                                            }

                                            if (contract.status === "signed") {
                                              if (
                                                game.status?.toLowerCase() ===
                                                "published"
                                              ) {
                                                return (
                                                  <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold font-display">
                                                    {t("moderationQueue.decision.liveGooglePlay")}
                                                  </span>
                                                );
                                              }
                                              return (
                                                <span className="inline-block px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-500 rounded-lg text-[10px] font-bold font-display animate-pulse">
                                                  {t("moderationQueue.decision.waitingBuild")}
                                                </span>
                                              );
                                            }

                                            // cancelled — developer đã từ chối, admin chào lại điều khoản mới
                                            return (
                                              <button
                                                onClick={() =>
                                                  handleOpenContractModal(game)
                                                }
                                                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
                                              >
                                                <Sliders size={12} />
                                                {t("moderationQueue.decision.renegotiateContract")}
                                              </button>
                                            );
                                          })()}
                                        </td>
                                      </tr>

                                      {/* Expanded detail sub-row */}
                                      {expandedGameId === game.id && (
                                        <tr>
                                          <td
                                            colSpan={7}
                                            className="p-6 bg-slate-50/10 dark:bg-slate-950/20 border-t border-b border-slate-200/50 dark:border-slate-800/60"
                                          >
                                            {(() => {
                                              const hasPendingUpdate = !!game.pendingUpdateSnapshotId;
                                              const isTitleChanged = hasPendingUpdate && game.pendingTitle && game.pendingTitle !== game.title;
                                              const isDescChanged = hasPendingUpdate && game.pendingDescription && game.pendingDescription !== game.description;
                                              const isThumbChanged = hasPendingUpdate && game.pendingThumbnailUrl && game.pendingThumbnailUrl !== game.thumbnailUrl;
                                              const isVideoChanged = hasPendingUpdate && game.pendingVideoUrl && game.pendingVideoUrl !== game.videoUrl;

                                              const getScreenshotDiff = () => {
                                                const diff: { url: string; status: "added" | "deleted" | "unchanged" }[] = [];
                                                const liveUrls = game.screenshots || [];
                                                const pendingUrls = game.pendingScreenshots || liveUrls;

                                                liveUrls.forEach((lUrl: string) => {
                                                  const parts = lUrl.split("?")[0].split("/");
                                                  const key = parts[parts.length - 1];
                                                  const isStillPresent = pendingUrls.some((pUrl: string) => {
                                                    const pParts = pUrl.split("?")[0].split("/");
                                                    return pParts[pParts.length - 1] === key;
                                                  });
                                                  if (isStillPresent) {
                                                    diff.push({ url: lUrl, status: "unchanged" });
                                                  } else {
                                                    diff.push({ url: lUrl, status: "deleted" });
                                                  }
                                                });

                                                pendingUrls.forEach((pUrl: string) => {
                                                  const pParts = pUrl.split("?")[0].split("/");
                                                  const key = pParts[pParts.length - 1];
                                                  const wasInLive = liveUrls.some((lUrl: string) => {
                                                    const lParts = lUrl.split("?")[0].split("/");
                                                    return lParts[lParts.length - 1] === key;
                                                  });
                                                  if (!wasInLive) {
                                                    diff.push({ url: pUrl, status: "added" });
                                                  }
                                                });

                                                return diff;
                                              };

                                              const screenshotsDiff = hasPendingUpdate ? getScreenshotDiff() : [];

                                              return (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-300">
                                                  {/* Left Column: Thumbnail, Description, ZIP */}
                                                  <div className="space-y-4">
                                                    {(() => {
                                                      const activeRejectedContract =
                                                        [...contracts]
                                                          .reverse()
                                                          .find(
                                                            (c) =>
                                                              c.gameId ===
                                                                game.id &&
                                                              c.status ===
                                                                "cancelled" &&
                                                              c.rejectionReason,
                                                          );
                                                      if (activeRejectedContract) {
                                                        return (
                                                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs space-y-1">
                                                            <span className="font-bold block">
                                                              {t("moderationQueue.previousRejection")}
                                                            </span>
                                                            <p className="italic text-[11px] text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-955/30 p-2 rounded border border-rose-500/10 break-words">
                                                              "
                                                              {activeRejectedContract.rejectionReason ??
                                                                ""}
                                                              "
                                                            </p>
                                                          </div>
                                                        );
                                                      }
                                                      return null;
                                                    })()}
                                                    <div>
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                                        <Image size={12} />{" "}
                                                        {isThumbChanged ? "So sánh Ảnh bìa (Cũ vs Mới)" : t("moderationQueue.detail.thumbnail")}
                                                      </h4>
                                                      {isThumbChanged ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-900 flex items-center justify-center">
                                                            <img src={game.thumbnailUrl} alt="Old" className="object-cover w-full h-full opacity-60" />
                                                            <div className="absolute top-1 left-1 px-1 py-0.5 bg-slate-950/80 text-[8px] text-white rounded font-mono uppercase font-semibold">Hiện tại</div>
                                                          </div>
                                                          <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-video bg-slate-900 flex items-center justify-center">
                                                            <img src={game.pendingThumbnailUrl} alt="New" className="object-cover w-full h-full" />
                                                            <div className="absolute top-1 left-1 px-1 py-0.5 bg-emerald-500 text-[8px] text-white rounded font-mono uppercase font-bold">Cập nhật</div>
                                                          </div>
                                                        </div>
                                                      ) : (
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
                                                                {t("moderationQueue.detail.noThumbnail")}
                                                              </span>
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>

                                                    {isTitleChanged && (
                                                      <div className="space-y-1 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-xs">
                                                        <span className="font-bold text-[10px] uppercase text-amber-500 block">Thay đổi Tiêu đề</span>
                                                        <div className="text-slate-400 line-through">Cũ: {game.title}</div>
                                                        <div className="text-emerald-500 font-bold">Mới: {game.pendingTitle}</div>
                                                      </div>
                                                    )}

                                                    <div className="space-y-1.5">
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                        {isDescChanged ? "So sánh Mô tả (Cũ vs Mới)" : t("moderationQueue.detail.description")}
                                                      </h4>
                                                      {isDescChanged ? (
                                                        <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed max-h-32 overflow-y-auto">
                                                          <div className="bg-slate-100 dark:bg-slate-955/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-450 line-through">
                                                            {game.description || t("moderationQueue.detail.noDescription")}
                                                          </div>
                                                          <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/25 text-slate-800 dark:text-slate-200">
                                                            {game.pendingDescription}
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                                          {game.description ||
                                                            t("moderationQueue.detail.noDescription")}
                                                        </p>
                                                      )}
                                                    </div>

                                                    <div className="space-y-1.5">
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                        {game.pendingTags && game.pendingTags.length > 0 ? "So sánh Thẻ phân loại (Cũ vs Mới)" : t("moderationQueue.detail.tags")}
                                                      </h4>
                                                      {game.pendingTags && game.pendingTags.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {(() => {
                                                            const oldTags = game.tags || [];
                                                            const newTags = game.pendingTags || [];
                                                            const oldSet = new Set(oldTags);
                                                            const newSet = new Set(newTags);
                                                            const allTags = Array.from(new Set([...oldTags, ...newTags]));

                                                            return allTags.map((tag: string, idx: number) => {
                                                              const inOld = oldSet.has(tag);
                                                              const inNew = newSet.has(tag);

                                                              if (inOld && inNew) {
                                                                return (
                                                                  <span
                                                                    key={idx}
                                                                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                                                                  >
                                                                    {tag}
                                                                  </span>
                                                                );
                                                              }
                                                              if (inOld && !inNew) {
                                                                return (
                                                                  <span
                                                                    key={idx}
                                                                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-rose-500/10 border-rose-500/30 text-rose-500 line-through"
                                                                    title="Thẻ bị xóa"
                                                                  >
                                                                    {tag} (Đã xóa)
                                                                  </span>
                                                                );
                                                              }
                                                              return (
                                                                <span
                                                                  key={idx}
                                                                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                                                  title="Thẻ mới bổ sung"
                                                                >
                                                                  + {tag} (Mới)
                                                                </span>
                                                              );
                                                            });
                                                          })()}
                                                        </div>
                                                      ) : game.tags &&
                                                      game.tags.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {game.tags.map(
                                                            (tag: string, idx: number) => (
                                                              <span
                                                                key={idx}
                                                                className="px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                                                              >
                                                                {tag}
                                                              </span>
                                                            ),
                                                          )}
                                                        </div>
                                                      ) : (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                          {t("moderationQueue.detail.noTags")}
                                                        </p>
                                                      )}
                                                    </div>

                                                    <div className="space-y-1.5">
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                        {t("moderationQueue.detail.githubRepository")}
                                                      </h4>
                                                      {game.githubRepoUrl ? (
                                                        <a
                                                          href={game.githubRepoUrl}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline break-all"
                                                        >
                                                          <FileText
                                                            size={12}
                                                            className="shrink-0"
                                                          />
                                                          {game.githubRepoUrl}
                                                          {game.githubBranch && (
                                                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-450">
                                                              @{game.githubBranch}
                                                            </span>
                                                          )}
                                                        </a>
                                                      ) : (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                          {t("moderationQueue.detail.noRepository")}
                                                        </p>
                                                      )}
                                                    </div>

                                                    {game.fileUrl ? (
                                                      <button
                                                        onClick={() =>
                                                          handleDownloadFile(
                                                            game.fileUrl,
                                                            `${game.title || "game"}-source.zip`,
                                                          )
                                                        }
                                                        disabled={
                                                          downloadingFile ===
                                                          game.fileUrl
                                                        }
                                                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                                      >
                                                        {downloadingFile ===
                                                        game.fileUrl ? (
                                                          <>
                                                            <RefreshCw
                                                              className="animate-spin"
                                                              size={14}
                                                            />{" "}
                                                            {t("actions.downloading")}
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Download size={14} />{" "}
                                                            {t("actions.downloadGamePackage")}
                                                          </>
                                                        )}
                                                      </button>
                                                    ) : (
                                                      <div className="text-center py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                                                        {t("actions.noGamePackageUploaded")}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Middle & Right Column: Screenshots & Video */}
                                                  <div className="space-y-4 md:col-span-2 flex flex-col justify-between">
                                                    {/* Play Game Demo */}
                                                    <div className="space-y-2">
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                        <Play
                                                          size={12}
                                                          className="text-amber-500"
                                                        />{" "}
                                                        {t("playDemo.sectionTitle")}
                                                      </h4>
                                                      {game.webDemoUrl ? (
                                                        <button
                                                          onClick={() =>
                                                            setPlayDemoGame(game)
                                                          }
                                                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                                        >
                                                          <Play
                                                            size={14}
                                                            fill="currentColor"
                                                          />{" "}
                                                          {t("playDemo.launchButton")}
                                                        </button>
                                                      ) : (
                                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-100/50 py-6 text-slate-500 dark:border-slate-800 dark:bg-slate-955/20 dark:text-slate-400">
                                                          <Play
                                                            size={20}
                                                            className="mb-1 text-slate-350 dark:text-slate-650"
                                                          />
                                                          <span className="text-[10px]">
                                                            {t("playDemo.empty")}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Screenshots (Diff or Normal) */}
                                                    {hasPendingUpdate ? (
                                                      <div className="space-y-2">
                                                        <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                          <Image
                                                            size={12}
                                                            className="text-amber-500"
                                                          />{" "}
                                                          So sánh Ảnh chụp màn hình (Screenshots)
                                                        </h4>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                          {screenshotsDiff.map((item, index) => (
                                                            <div
                                                              key={index}
                                                              onClick={() => {
                                                                setActiveScreenshotUrl(item.url);
                                                                setIsOpenLightbox(true);
                                                              }}
                                                              className={`relative aspect-video rounded-lg overflow-hidden border cursor-pointer group transition-studio ${
                                                                item.status === "added"
                                                                  ? "border-emerald-500 shadow-md shadow-emerald-500/10"
                                                                  : item.status === "deleted"
                                                                    ? "border-rose-500 opacity-60 animate-pulse-subtle"
                                                                    : "border-slate-200 dark:border-slate-800 hover:border-amber-400/50"
                                                              }`}
                                                            >
                                                              <img
                                                                src={item.url}
                                                                alt={`Screenshot ${index + 1}`}
                                                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                              />
                                                              {item.status === "added" && (
                                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-[8px] text-white rounded font-mono font-bold uppercase shadow-sm">
                                                                  Thêm mới
                                                                </div>
                                                              )}
                                                              {item.status === "deleted" && (
                                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-rose-600 text-[8px] text-white rounded font-mono font-bold uppercase shadow-sm">
                                                                  Đã xóa
                                                                </div>
                                                              )}
                                                              <div className="absolute inset-0 bg-slate-955/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Eye
                                                                  size={16}
                                                                  className="text-white"
                                                                />
                                                              </div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      game.screenshots && game.screenshots.length > 0 && (
                                                        <div className="space-y-2">
                                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                            <Image
                                                              size={12}
                                                              className="text-amber-500"
                                                            />{" "}
                                                            {t("playDemo.screenshotsTitle")}
                                                          </h4>
                                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                            {game.screenshots.map((url: string, index: number) => (
                                                              <div
                                                                key={index}
                                                                onClick={() => {
                                                                  setActiveScreenshotUrl(url);
                                                                  setIsOpenLightbox(true);
                                                                }}
                                                                className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group hover:border-amber-400/50 transition-studio"
                                                              >
                                                                <img
                                                                  src={url}
                                                                  alt={t("moderationQueue.detail.screenshotAlt", {
                                                                    index: index + 1,
                                                                  })}
                                                                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                                <div className="absolute inset-0 bg-slate-955/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                  <Eye
                                                                    size={16}
                                                                    className="text-white"
                                                                  />
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )
                                                    )}

                                                    {/* Video Gameplay */}
                                                    {hasPendingUpdate && game.pendingVideoUrl ? (
                                                      <div className="space-y-2">
                                                        <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                          <Video
                                                            size={12}
                                                            className="text-amber-500"
                                                          />{" "}
                                                          {isVideoChanged ? "So sánh Video Demo (Cũ vs Mới)" : t("moderationQueue.detail.videoDemo")}
                                                        </h4>
                                                        {game.pendingVideoUrl === "DELETE_VIDEO" ? (
                                                          <div className="relative aspect-video rounded-xl overflow-hidden border border-rose-500 bg-slate-955 max-h-56">
                                                            <video
                                                              src={game.videoUrl}
                                                              controls
                                                              className="w-full h-full object-contain opacity-55"
                                                            />
                                                            <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-rose-200 text-xs font-bold gap-1">
                                                              <Video size={20} className="text-rose-400" />
                                                              Video này sẽ bị gỡ bỏ
                                                            </div>
                                                          </div>
                                                        ) : isVideoChanged ? (
                                                          <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                              <div className="text-[9px] font-mono text-slate-400 uppercase">Hiện tại</div>
                                                              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-40">
                                                                <video src={game.videoUrl} controls className="w-full h-full object-contain opacity-60" />
                                                              </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                              <div className="text-[9px] font-mono text-emerald-500 uppercase font-bold">Cập nhật</div>
                                                              <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-955 max-h-40">
                                                                <video src={game.pendingVideoUrl} controls className="w-full h-full object-contain" />
                                                              </div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-56">
                                                            <video
                                                              src={game.videoUrl}
                                                              controls
                                                              className="w-full h-full object-contain"
                                                            />
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      game.videoUrl && (
                                                        <div className="space-y-2">
                                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                            <Video
                                                              size={12}
                                                              className="text-amber-500"
                                                            />{" "}
                                                            {t("moderationQueue.detail.videoDemo")}
                                                          </h4>
                                                          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-56">
                                                            <video
                                                              src={game.videoUrl}
                                                              controls
                                                              className="w-full h-full object-contain"
                                                            />
                                                          </div>
                                                        </div>
                                                      )
                                                    )}

                                                    {/* AI REVIEW REPORT */}
                                                    <div className="pt-2">
                                                      <AiReviewReportCard
                                                        gameId={game.id}
                                                      />
                                                    </div>

                                                    {/* PUSH GOOGLE PLAY */}
                                                    {game.publishingType !==
                                                      "marketplace_listing" && (
                                                      <div className="pt-2">
                                                        <ExternalPublishStatusCard
                                                          gameId={game.id}
                                                          gameStatus={game.status}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="p-8 text-center font-medium text-slate-500 dark:text-slate-400"
                                    >
                                      {t("moderationQueue.emptyGames")}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {isLoadingMarketplace ? (
                          <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                            <RefreshCw className="animate-spin" size={18} />{" "}
                            {t("moderationQueue.loadingAssets")}
                          </div>
                        ) : marketplaceError ? (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                            {t("moderationQueue.errorAssets", {
                              error: marketplaceError,
                            })}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                                  <th className="p-3 w-10"></th>
                                  <th className="p-3">{t("moderationQueue.headers.assetDetails")}</th>
                                  <th className="p-3">{t("moderationQueue.headers.itemType")}</th>
                                  <th className="p-3">{t("moderationQueue.headers.category")}</th>
                                  <th className="p-3">{t("moderationQueue.headers.proposedPrice")}</th>
                                  <th className="p-3 text-center">{t("moderationQueue.headers.decisions")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                                {pendingMarketplaceItems.length > 0 ? (
                                  pendingMarketplaceItems.map((item) => {
                                    const displayItem =
                                      marketplaceItemDetails[item.id] ?? item;

                                    return (
                                      <React.Fragment key={item.id}>
                                        <tr
                                          className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/5 transition-colors ${expandedMarketplaceId === item.id ? "bg-slate-50/50 dark:bg-slate-900/20" : ""}`}
                                        >
                                          <td className="p-3 w-10 text-center">
                                            <button
                                              onClick={() =>
                                                handleToggleMarketplaceDetail(
                                                  item.id,
                                                )
                                              }
                                              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                              title={
                                                expandedMarketplaceId ===
                                                item.id
                                                  ? t("moderationQueue.actions.hideDetails")
                                                  : t("moderationQueue.actions.showDetails")
                                              }
                                            >
                                              {expandedMarketplaceId ===
                                              item.id ? (
                                                <ChevronUp size={16} />
                                              ) : (
                                                <ChevronDown size={16} />
                                              )}
                                            </button>
                                          </td>
                                          <td className="p-3">
                                            <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                              {item.title}
                                              <span
                                                className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                                  item.status?.toLowerCase() ===
                                                  "pending"
                                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                                                    : item.status?.toLowerCase() ===
                                                        "active"
                                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                }`}
                                              >
                                                {item.status ||
                                                  t("moderationQueue.filters.pending")}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-455">
                                              {t("moderationQueue.by", {
                                                name:
                                                  item.sellerFullName ||
                                                  item.sellerEmail,
                                              })}
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border bg-emerald-450/10 text-emerald-500 border-emerald-500/20">
                                              {t("moderationQueue.assetType")}
                                            </span>
                                          </td>
                                          <td className="p-3 text-slate-600 dark:text-slate-355">
                                            {item.categoryName ||
                                              t("moderationQueue.unassigned")}
                                          </td>
                                          <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                            {formatModerationPrice(item.price)}
                                          </td>
                                          <td className="p-3 text-center">
                                            {item.status?.toLowerCase() ===
                                            "pending" ? (
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  onClick={() =>
                                                    handleApproveMarketplaceItem(
                                                      item,
                                                    )
                                                  }
                                                  className="p-1.5 bg-emerald-50 dark:bg-emerald-955/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-lg transition-studio border border-transparent dark:border-emerald-900/30 cursor-pointer"
                                                  title={t("moderationQueue.actions.approveAsset")}
                                                >
                                                  <Check size={14} />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleRejectMarketplaceItem(
                                                      item.id,
                                                      item.title,
                                                    )
                                                  }
                                                  className="p-1.5 bg-rose-50 dark:bg-rose-955/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-studio border border-transparent dark:border-rose-900/30 cursor-pointer"
                                                  title={t("actions.rejectAsset")}
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                {item.status?.toLowerCase() ===
                                                "active" ? (
                                                  <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold font-display">
                                                    {t("status.asset.active")}
                                                  </span>
                                                ) : (
                                                  <span className="inline-block px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold font-display">
                                                    {t("status.asset.rejected")}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </td>
                                        </tr>

                                        {/* Expanded row for marketplace item details */}
                                        {expandedMarketplaceId === item.id && (
                                          <tr>
                                            <td
                                              colSpan={6}
                                              className="p-6 bg-slate-50/10 dark:bg-slate-900/20 border-t border-b border-slate-200/50 dark:border-slate-800/60"
                                            >
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-300">
                                                {/* Left Column: Thumbnail, Description, ZIP */}
                                                <div className="space-y-4">
                                                  {marketplaceDetailLoadingId ===
                                                    item.id && (
                                                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-500">
                                                      {t("moderationQueue.detail.refreshingMedia")}
                                                    </div>
                                                  )}
                                                   {displayItem.pendingTitle && displayItem.pendingTitle !== displayItem.title && (
                                                     <div className="space-y-1 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-xs">
                                                       <span className="font-bold text-[10px] uppercase text-amber-500 block">Thay đổi Tiêu đề Asset</span>
                                                       <div className="text-slate-400 line-through">Cũ: {displayItem.title}</div>
                                                       <div className="text-emerald-500 font-bold">Mới: {displayItem.pendingTitle}</div>
                                                     </div>
                                                   )}

                                                   <div>
                                                     <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                                       <Image size={12} />{" "}
                                                       {displayItem.pendingThumbnailUrl && displayItem.pendingThumbnailUrl !== displayItem.thumbnailUrl ? "So sánh Ảnh bìa (Cũ vs Mới)" : t("moderationQueue.detail.thumbnail")}
                                                     </h4>
                                                     {displayItem.pendingThumbnailUrl && displayItem.pendingThumbnailUrl !== displayItem.thumbnailUrl ? (
                                                       <div className="grid grid-cols-2 gap-2">
                                                         <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-900 flex items-center justify-center">
                                                           <img src={displayItem.thumbnailUrl} alt="Old" className="object-cover w-full h-full opacity-60" />
                                                           <div className="absolute top-1 left-1 px-1 py-0.5 bg-slate-955/80 text-[8px] text-white rounded font-mono uppercase font-semibold">Hiện tại</div>
                                                         </div>
                                                         <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-video bg-slate-900 flex items-center justify-center">
                                                           <img src={displayItem.pendingThumbnailUrl} alt="New" className="object-cover w-full h-full" />
                                                           <div className="absolute top-1 left-1 px-1 py-0.5 bg-emerald-500 text-[8px] text-white rounded font-mono uppercase font-bold">Cập nhật</div>
                                                         </div>
                                                       </div>
                                                     ) : (
                                                       <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 aspect-video bg-slate-900 flex items-center justify-center">
                                                         {displayItem.thumbnailUrl ? (
                                                           <img
                                                             src={
                                                               displayItem.thumbnailUrl
                                                             }
                                                             alt={
                                                               displayItem.title
                                                             }
                                                             className="object-cover w-full h-full"
                                                           />
                                                         ) : (
                                                           <div className="flex flex-col items-center justify-center text-slate-500">
                                                             <Image
                                                               size={32}
                                                               className="mb-2 text-slate-650"
                                                             />
                                                             <span className="text-[10px] font-mono">
                                                               {t("moderationQueue.detail.noThumbnail")}
                                                             </span>
                                                           </div>
                                                         )}
                                                       </div>
                                                     )}
                                                   </div>

                                                   <div className="space-y-1.5">
                                                     <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                       {displayItem.pendingDescription && displayItem.pendingDescription !== displayItem.description ? "So sánh Mô tả (Cũ vs Mới)" : t("moderationQueue.detail.itemDescription")}
                                                     </h4>
                                                     {displayItem.pendingDescription && displayItem.pendingDescription !== displayItem.description ? (
                                                       <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed max-h-32 overflow-y-auto">
                                                         <div className="bg-slate-100 dark:bg-slate-955/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-450 line-through">
                                                           {displayItem.description || t("moderationQueue.detail.noItemDescription")}
                                                         </div>
                                                         <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/25 text-slate-800 dark:text-slate-200">
                                                           {displayItem.pendingDescription}
                                                         </div>
                                                       </div>
                                                     ) : (
                                                       <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                                         {displayItem.description ||
                                                           t("moderationQueue.detail.noItemDescription")}
                                                       </p>
                                                     )}
                                                   </div>

                                                   <div className="space-y-1.5">
                                                     <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                       {displayItem.pendingTags && displayItem.pendingTags.length > 0 ? "So sánh Thẻ phân loại (Cũ vs Mới)" : t("moderationQueue.detail.tags")}
                                                     </h4>
                                                     {displayItem.pendingTags && displayItem.pendingTags.length > 0 ? (
                                                       <div className="flex flex-wrap gap-1.5">
                                                         {(() => {
                                                           const oldTags = displayItem.tags || [];
                                                           const newTags = displayItem.pendingTags || [];
                                                           const oldSet = new Set(oldTags);
                                                           const newSet = new Set(newTags);
                                                           const allTags = Array.from(new Set([...oldTags, ...newTags]));

                                                           return allTags.map((tag: string, idx: number) => {
                                                             const inOld = oldSet.has(tag);
                                                             const inNew = newSet.has(tag);

                                                             if (inOld && inNew) {
                                                               return (
                                                                 <span key={idx} className="px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                                                   {tag}
                                                                 </span>
                                                               );
                                                             }
                                                             if (inOld && !inNew) {
                                                               return (
                                                                 <span key={idx} className="px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-rose-500/10 border-rose-500/30 text-rose-500 line-through" title="Thẻ bị xóa">
                                                                   {tag} (Đã xóa)
                                                                 </span>
                                                               );
                                                             }
                                                             return (
                                                               <span key={idx} className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400" title="Thẻ mới bổ sung">
                                                                 + {tag} (Mới)
                                                               </span>
                                                             );
                                                           });
                                                         })()}
                                                       </div>
                                                     ) : displayItem.tags && displayItem.tags.length > 0 ? (
                                                       <div className="flex flex-wrap gap-1.5">
                                                         {displayItem.tags.map((tag: string, idx: number) => (
                                                           <span key={idx} className="px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                                             {tag}
                                                           </span>
                                                         ))}
                                                       </div>
                                                     ) : null}
                                                   </div>

                                                  {displayItem.fileUrl ? (
                                                    <button
                                                      onClick={() =>
                                                        handleDownloadFile(
                                                          displayItem.fileUrl,
                                                          `${displayItem.title || "asset"}-package.zip`,
                                                        )
                                                      }
                                                      disabled={
                                                        downloadingFile ===
                                                        displayItem.fileUrl
                                                      }
                                                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                                    >
                                                      {downloadingFile ===
                                                      displayItem.fileUrl ? (
                                                        <>
                                                          <RefreshCw
                                                            className="animate-spin"
                                                            size={14}
                                                          />{" "}
                                                          {t("actions.downloading")}
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Download size={14} />{" "}
                                                          {t("actions.downloadAssetPackage")}
                                                        </>
                                                      )}
                                                    </button>
                                                  ) : (
                                                    <div className="text-center py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                                                      {t("actions.noAssetPackageUploaded")}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Middle Column: Screenshots & Video */}
                                                <div className="space-y-4 flex flex-col">
                                                  {((displayItem.screenshots && displayItem.screenshots.length > 0) || (displayItem.mediaUrls && displayItem.mediaUrls.length > 0)) && (
                                                    <div className="space-y-2">
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                        <Image
                                                          size={12}
                                                          className="text-amber-500"
                                                        />{" "}
                                                        {t("moderationQueue.detail.screenshots")}
                                                      </h4>
                                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {[...(displayItem.screenshots || []), ...(displayItem.mediaUrls || [])].map(
                                                          (url, index) => (
                                                            <div
                                                              key={index}
                                                              onClick={() => {
                                                                setActiveScreenshotUrl(
                                                                  url,
                                                                );
                                                                setIsOpenLightbox(
                                                                  true,
                                                                );
                                                              }}
                                                              className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group hover:border-amber-400/50 transition-studio"
                                                            >
                                                              <img
                                                                src={url}
                                                                alt={t("moderationQueue.detail.screenshotAlt", {
                                                                  index: index + 1,
                                                                })}
                                                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                              />
                                                              <div className="absolute inset-0 bg-slate-955/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Eye
                                                                  size={16}
                                                                  className="text-white"
                                                                />
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Video Demo */}
                                                  {displayItem.videoUrl && (
                                                    <div className="space-y-2">
                                                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                        <Video
                                                          size={12}
                                                          className="text-amber-500"
                                                        />{" "}
                                                        {t("moderationQueue.detail.videoDemo")}
                                                      </h4>
                                                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-56">
                                                        <video
                                                          src={
                                                            displayItem.videoUrl
                                                          }
                                                          controls
                                                          className="w-full h-full object-contain"
                                                        />
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Right Column: Specifications, Creator Details & License info */}
                                                <div className="space-y-4">
                                                  <div className="space-y-3.5 bg-white/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                                                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5">
                                                      {t("moderationQueue.detail.technicalCreatorDetails")}
                                                    </h4>
                                                    <div className="space-y-2 text-xs">
                                                      <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                        <span className="text-slate-500">
                                                          {t("moderationQueue.detail.creatorName")}
                                                        </span>
                                                        <span className="font-semibold">
                                                          {displayItem.sellerFullName ||
                                                            t("withdrawal.na")}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                        <span className="text-slate-500">
                                                          {t("moderationQueue.detail.creatorEmail")}
                                                        </span>
                                                        <span className="font-mono">
                                                          {
                                                            displayItem.sellerEmail
                                                          }
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                        <span className="text-slate-500">
                                                          {t("moderationQueue.detail.version")}
                                                        </span>
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                                          {displayItem.version ||
                                                            t("withdrawal.na")}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between pb-0.5">
                                                        <span className="text-slate-500">
                                                          {t("moderationQueue.detail.submittedOn")}
                                                        </span>
                                                        <span>
                                                          {formatAdminOverviewDate(
                                                            displayItem.createdAt,
                                                            t("withdrawal.na"),
                                                            locale,
                                                          )}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* AI REVIEW REPORT */}
                                                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                                  <AiReviewReportCard
                                                    itemId={item.id}
                                                  />
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="p-8 text-center font-medium text-slate-500 dark:text-slate-400"
                                    >
                                      {t("moderationQueue.emptyAssets")}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {activeTab === "wallet" && (
                  <AdminFinanceWalletPanel
                    payoutBalance={payoutBalance}
                    payoutBalanceError={payoutBalanceError}
                    isLoadingPayoutBalance={isLoadingPayoutBalance}
                    onRefreshPayoutBalance={fetchPayoutBalance}
                    onRefreshStateChange={setFinanceRefreshState}
                  />
                )}
                {activeTab === "payments" && (
                  <AdminPaymentVerificationPanel
                    onRefreshStateChange={setFinanceRefreshState}
                  />
                )}
                {activeTab === "withdrawal" && (
                  <AdminWithdrawalPanel
                    onRefreshStateChange={setFinanceRefreshState}
                    initialHighlightId={notificationWithdrawalId}
                    onHighlightConsumed={() => setNotificationWithdrawalId(null)}
                  />
                )}

                {/* Tab 2: User Directory */}
                {activeTab === "users" && (
                  <AdminUserManagementPanel
                    users={users}
                    isLoading={isLoadingUsers}
                    error={usersError}
                    currentUserEmail={currentUser?.email}
                    onRefresh={fetchUsers}
                    onUpdateUser={handleAdminUserUpdate}
                  />
                )}

                {/* Tab 3: System Logs */}
                {activeTab === "logs" && (
                  <div className="space-y-6">
                    {/* Filter Panel */}
                    <form
                      onSubmit={handleApplyTextFilters}
                      className="bg-slate-50/45 dark:bg-slate-900/25 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/40 p-4 shadow-sm transition-studio"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {/* Action Filter */}
                        <div className="flex flex-col gap-1.5 relative">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            {t("audit.actionLabel")}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsActionDropdownOpen(!isActionDropdownOpen);
                              setIsTargetDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-left text-sm font-medium text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 cursor-pointer"
                          >
                            <span className="truncate">
                              {filterAction
                                ? auditActions.find(
                                    (act) => act.value === filterAction,
                                  )?.label || filterAction
                                : t("audit.allActions")}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`text-slate-500 transition-transform duration-200 ${isActionDropdownOpen ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isActionDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-45"
                                onClick={() => setIsActionDropdownOpen(false)}
                              />
                              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterAction("");
                                    setCurrentPage(0);
                                    setIsActionDropdownOpen(false);
                                  }}
                                  className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 first:rounded-t-xl last:rounded-b-xl ${
                                    !filterAction
                                      ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold"
                                      : "text-slate-750 dark:text-slate-300"
                                  }`}
                                >
                                  {t("audit.allActions")}
                                </button>
                                {auditActions.map((act) => (
                                  <button
                                    key={act.value}
                                    type="button"
                                    onClick={() => {
                                      setFilterAction(act.value);
                                      setCurrentPage(0);
                                      setIsActionDropdownOpen(false);
                                    }}
                                    className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 first:rounded-t-xl last:rounded-b-xl ${
                                      filterAction === act.value
                                        ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold"
                                        : "text-slate-750 dark:text-slate-300"
                                    }`}
                                  >
                                    {act.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Target Type Filter */}
                        <div className="flex flex-col gap-1.5 relative">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            {t("audit.targetTypeLabel")}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsTargetDropdownOpen(!isTargetDropdownOpen);
                              setIsActionDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-left text-sm font-medium text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 cursor-pointer"
                          >
                            <span className="truncate">
                              {filterTargetType
                                ? auditTargets.find(
                                    (t) => t.value === filterTargetType,
                                  )?.label || filterTargetType
                                : t("audit.allTargets")}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`text-slate-500 transition-transform duration-200 ${isTargetDropdownOpen ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isTargetDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-45"
                                onClick={() => setIsTargetDropdownOpen(false)}
                              />
                              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterTargetType("");
                                    setCurrentPage(0);
                                    setIsTargetDropdownOpen(false);
                                  }}
                                  className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 first:rounded-t-xl last:rounded-b-xl ${
                                    !filterTargetType
                                      ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold"
                                      : "text-slate-750 dark:text-slate-300"
                                  }`}
                                >
                                  {t("audit.allTargets")}
                                </button>
                                {auditTargets.map((t) => (
                                  <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => {
                                      setFilterTargetType(t.value);
                                      setCurrentPage(0);
                                      setIsTargetDropdownOpen(false);
                                    }}
                                    className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 first:rounded-t-xl last:rounded-b-xl ${
                                      filterTargetType === t.value
                                        ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold"
                                        : "text-slate-750 dark:text-slate-300"
                                    }`}
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Actor ID Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            {t("audit.filters.actorIdLabel")}
                          </label>
                          <input
                            type="text"
                            placeholder={t("audit.filters.actorIdPlaceholder")}
                            value={searchActorId}
                            onChange={(e) => setSearchActorId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 placeholder-slate-400 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 dark:placeholder-slate-500"
                          />
                        </div>

                        {/* Target ID Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            {t("audit.filters.targetIdLabel")}
                          </label>
                          <input
                            type="text"
                            placeholder={t("audit.filters.targetIdPlaceholder")}
                            value={searchTargetId}
                            onChange={(e) => setSearchTargetId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 placeholder-slate-400 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 dark:placeholder-slate-500"
                          />
                        </div>

                        {/* IP Address Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            {t("audit.filters.ipAddressLabel")}
                          </label>
                          <input
                            type="text"
                            placeholder={t("audit.filters.ipAddressPlaceholder")}
                            value={searchIpAddress}
                            onChange={(e) => setSearchIpAddress(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 placeholder-slate-400 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 dark:placeholder-slate-500"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-studio hover:bg-slate-200 hover:text-slate-900 active:scale-95 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                        >
                          {t("audit.filters.clear")}
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-400/10 transition-studio hover:bg-amber-500 hover:text-black hover:shadow-amber-400/20 active:scale-95 cursor-pointer"
                        >
                          {t("audit.filters.search")}
                        </button>
                      </div>
                    </form>

                    {/* Error or Loader */}
                    {isLoadingLogs ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                        <RefreshCw className="animate-spin" size={18} /> {t("audit.loading")}
                      </div>
                    ) : logsError ? (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                        {t("audit.loadError", { error: logsError })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                                <th className="p-3 w-10"></th>
                                <th className="p-3">{t("audit.headers.timeAndIp")}</th>
                                <th className="p-3">{t("audit.headers.actorInfo")}</th>
                                <th className="p-3">{t("audit.actionLabel")}</th>
                                <th className="p-3">{t("audit.headers.targetReference")}</th>
                                <th className="p-3">{t("audit.headers.noteSummary")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                              {auditLogs && auditLogs.length > 0 ? (
                                auditLogs.map((log) => (
                                  <React.Fragment key={log.id}>
                                    <tr
                                      className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/5 transition-colors ${expandedLogId === log.id ? "bg-slate-50/50 dark:bg-slate-900/10" : ""}`}
                                    >
                                      <td className="p-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedLogId(
                                              expandedLogId === log.id
                                                ? null
                                                : log.id,
                                            )
                                          }
                                          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                          title={t("audit.viewPayloadDiff")}
                                        >
                                          {expandedLogId === log.id ? (
                                            <ChevronUp size={14} />
                                          ) : (
                                            <ChevronDown size={14} />
                                          )}
                                        </button>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200">
                                          {new Date(
                                            log.createdAt,
                                          ).toLocaleString()}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                                          {t("audit.ipValue", {
                                            value:
                                              log.ipAddress || t("audit.unknownValue"),
                                          })}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        {log.actorEmail ? (
                                          <div className="font-semibold text-slate-850 dark:text-slate-200">
                                            {log.actorEmail}
                                          </div>
                                        ) : (
                                          <div className="italic text-slate-450">
                                            {t("audit.anonymousSystem")}
                                          </div>
                                        )}
                                        {log.actorId && (
                                          <div
                                            className="font-mono text-[9px] text-slate-450 dark:text-slate-500 mt-0.5"
                                            title={log.actorId}
                                          >
                                            <span className="mr-1 select-none text-[8px] uppercase text-slate-500 dark:text-slate-400">
                                              {t("audit.actorIdPrefix")}
                                            </span>
                                            <span className="select-all break-all">
                                              {log.actorId}
                                            </span>
                                          </div>
                                        )}
                                        <span className="inline-block mt-1 px-1.5 py-0.2 bg-slate-105 dark:bg-slate-950 text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded font-mono">
                                          {log.actorRole
                                            ? log.actorRole.toUpperCase()
                                            : t("audit.unknownRole")}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getActionBadgeClass(log.action)}`}
                                        >
                                          {getAuditActionLabel(log.action)}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-semibold text-slate-655 dark:text-slate-400">
                                          {t("audit.targetTypeValue", {
                                            value: getAuditTargetLabel(log.targetType),
                                          })}
                                        </div>
                                        {log.targetId && (
                                          <div
                                            className="font-mono text-[9px] text-slate-450 dark:text-slate-500 mt-0.5"
                                            title={log.targetId}
                                          >
                                            <span className="mr-1 select-none text-[8px] uppercase text-slate-500 dark:text-slate-400">
                                              {t("audit.referenceIdPrefix")}
                                            </span>
                                            <span className="select-all break-all">
                                              {log.targetId}
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">
                                        {log.note || t("audit.noNotes")}
                                      </td>
                                    </tr>

                                    {/* Expanded Data Diff Sub-Row */}
                                    {expandedLogId === log.id && (
                                      <tr>
                                        <td
                                          colSpan={6}
                                          className="p-4 bg-slate-50/20 dark:bg-slate-900/30 border-t border-b border-slate-200/50 dark:border-slate-800/55"
                                        >
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                            <div>
                                              <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                                                {t("audit.oldValueLabel")}
                                              </span>
                                              <pre className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-x-auto text-[10px] text-slate-800 dark:text-slate-300 max-h-48 leading-normal">
                                                {log.oldValue
                                                  ? (() => {
                                                      try {
                                                        return JSON.stringify(
                                                          JSON.parse(
                                                            log.oldValue,
                                                          ),
                                                          null,
                                                          2,
                                                        );
                                                      } catch (e) {
                                                        return log.oldValue;
                                                      }
                                                    })()
                                                  : t("audit.nullValue")}
                                              </pre>
                                            </div>
                                            <div>
                                              <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                                                {t("audit.newValueLabel")}
                                              </span>
                                              <pre className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-x-auto text-[10px] text-slate-800 dark:text-slate-300 max-h-48 leading-normal">
                                                {log.newValue
                                                  ? (() => {
                                                      try {
                                                        return JSON.stringify(
                                                          JSON.parse(
                                                            log.newValue,
                                                          ),
                                                          null,
                                                          2,
                                                        );
                                                      } catch (e) {
                                                        return log.newValue;
                                                      }
                                                    })()
                                                  : t("audit.nullValue")}
                                              </pre>
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
                                    className="p-8 text-center font-medium text-slate-500 dark:text-slate-400"
                                  >
                                    {t("audit.empty")}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination footer */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center bg-white dark:bg-slate-900/10 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                            <span className="text-xs text-slate-500 font-mono">
                              {t("audit.pagination.summary", {
                                current: currentPage + 1,
                                total: totalPages,
                                count: totalElements,
                              })}
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.max(0, prev - 1),
                                  )
                                }
                                disabled={currentPage === 0 || isLoadingLogs}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold transition-studio disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {t("audit.pagination.previous")}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(totalPages - 1, prev + 1),
                                  )
                                }
                                disabled={
                                  currentPage >= totalPages - 1 || isLoadingLogs
                                }
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs font-semibold transition-studio disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {t("audit.pagination.next")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 5: Storage Management */}
                {activeTab === "banners" && <AdminBannerPanel />}
                {activeTab === "content" && <AdminContentManagementPanel />}
                {activeTab === "storage" && <AdminFileManagementPanel />}
                {activeTab === "disputes" && (
                  <AdminDisputePanel
                    initialHighlightId={notificationDisputeId}
                    onHighlightConsumed={() => setNotificationDisputeId(null)}
                  />
                )}
                {activeTab === "agreement" && <AdminAgreementPanel />}

                {/* Tab 4: Platform Settings */}
                {activeTab === "settings" && (
                  <div className="space-y-4">
                    {settingsSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-500 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                        <Check size={14} /> {t("settingsPanel.saveSuccess")}
                      </div>
                    )}

                    {settingsError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-500 text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle size={14} /> {settingsError}
                      </div>
                    )}

                    {isLoadingSettings && (
                      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                        <RefreshCw size={14} className="animate-spin" />{" "}
                        {t("settingsPanel.loading")}
                      </div>
                    )}

                    <form
                      onSubmit={handleSaveSettings}
                      className="space-y-4 max-w-xl"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={t("settingsPanel.commissionLabel")}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={commission}
                          onChange={(e) =>
                            setCommission(parseFloat(e.target.value) || 0)
                          }
                          helperText={t("settingsPanel.commissionHelper")}
                          required
                        />

                        <Input
                          label={t("settingsPanel.withdrawalHoldDaysLabel")}
                          type="number"
                          min="0"
                          max="30"
                          step="1"
                          value={withdrawalHoldDays}
                          onChange={(e) =>
                            setWithdrawalHoldDays(parseInt(e.target.value, 10) || 0)
                          }
                          helperText={t("settingsPanel.withdrawalHoldDaysHelper")}
                          required
                        />

                        <Input
                          label={t("settingsPanel.refundDeadlineDaysLabel")}
                          type="number"
                          min="1"
                          max="30"
                          step="1"
                          value={refundDeadlineDays}
                          onChange={(e) =>
                            setRefundDeadlineDays(parseInt(e.target.value, 10) || 0)
                          }
                          helperText={t("settingsPanel.refundDeadlineDaysHelper")}
                          required
                        />

                        <Input
                          label={t("settingsPanel.disputeBanThresholdLabel")}
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                          value={disputeBanThreshold}
                          onChange={(e) =>
                            setDisputeBanThreshold(parseInt(e.target.value, 10) || 1)
                          }
                          helperText={t("settingsPanel.disputeBanThresholdHelper")}
                          required
                        />

                        <Input
                          label={t("settingsPanel.dailyMaintenanceTimeLabel")}
                          type="time"
                          step={1}
                          value={dailyMaintenanceTime}
                          onChange={(e) =>
                            setDailyMaintenanceTime(e.target.value || "02:00:00")
                          }
                          helperText={t("settingsPanel.dailyMaintenanceTimeHelper")}
                          required
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          variant="primary"
                          size="md"
                          type="submit"
                          icon={<Sliders size={16} />}
                          disabled={isSavingSettings || isLoadingSettings}
                        >
                          {isSavingSettings
                            ? t("settingsPanel.saving")
                            : t("settingsPanel.save")}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </AdminShell>

      {/* Contract Creation Modal */}
      {isContractModalOpen &&
        selectedGame &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-center items-start bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-2xl my-8 space-y-6 relative overflow-hidden">
              <button
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-studio cursor-pointer"
                onClick={() => setIsContractModalOpen(false)}
                aria-label={t("dialog.close")}
                title={t("dialog.close")}
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="p-3 bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 rounded-2xl shadow-md shadow-amber-500/20">
                  <PenTool size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-600 dark:text-amber-450 uppercase font-bold px-2 py-0.5 bg-amber-500/10 rounded">
                    {t("contractComposer.badge")}
                  </span>
                  <h2 className="font-display font-bold text-xl text-slate-800 dark:text-white mt-1">
                    {t("contractComposer.title")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("contractComposer.description", {
                      title: selectedGame.title,
                    })}
                  </p>
                </div>
              </div>

              {/* Display previous rejection reason if exists */}
              {(() => {
                const activeRejectedContract = [...contracts]
                  .reverse()
                  .find(
                    (c) =>
                      c.gameId === selectedGame.id &&
                      c.status === "cancelled" &&
                      c.rejectionReason,
                  );
                if (activeRejectedContract) {
                  return (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2 text-xs text-rose-600 dark:text-rose-450">
                      <span className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                        <AlertTriangle size={15} />{" "}
                        {t("contractComposer.previousRejectionTitle")}
                      </span>
                      <p className="italic bg-white/70 dark:bg-slate-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/20 text-slate-800 dark:text-slate-200 leading-normal break-words shadow-sm">
                        "{activeRejectedContract.rejectionReason ?? ""}"
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <form onSubmit={handleCreateContractOffer} className="space-y-5">
                {/* Điều khoản tài chính */}
                <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-3 rounded bg-amber-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                        {t("contractComposer.financialTermsTitle")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestAiSuggestion}
                      disabled={isLoadingAiSuggestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-[11px] transition-studio disabled:opacity-50 cursor-pointer"
                    >
                      {isLoadingAiSuggestion ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      {t("contractComposer.aiSuggestion.button")}
                    </button>
                  </div>

                  {aiSuggestionError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                      {aiSuggestionError}
                    </div>
                  )}

                  {aiSuggestion && (
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2.5 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide font-mono">
                        <Sparkles size={13} />
                        {t("contractComposer.aiSuggestion.resultTitle")}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-normal">
                        {aiSuggestion.reasoning}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold">
                          {aiSuggestion.suggestedContractType === "co_publishing"
                            ? t("contractComposer.contractTypeCoPublishing")
                            : t("contractComposer.contractTypeFullAcquisition")}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                          {aiSuggestion.suggestedContractType === "co_publishing"
                            ? `${aiSuggestion.suggestedRevenueSplit ?? 0}%`
                            : formatCurrency(
                                aiSuggestion.suggestedLumpSumAmount ?? 0,
                                "VND",
                                locale,
                                t("withdrawal.na"),
                              )}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyAiSuggestion}
                        className="w-full py-2 px-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-[11px] transition-studio cursor-pointer"
                      >
                        {t("contractComposer.aiSuggestion.apply")}
                      </button>
                    </div>
                  )}

                  {selectedGame.priceProposed !== undefined &&
                    selectedGame.priceProposed !== null && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl flex flex-col gap-0.5 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {t("contractComposer.proposedPriceLabel")}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200 text-sm">
                          {selectedGame.priceProposed === 0
                            ? t("contractComposer.freePrice")
                            : formatCurrency(
                                selectedGame.priceProposed,
                                "VND",
                                locale,
                                t("withdrawal.na"),
                              )}
                        </strong>
                      </div>
                    )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t("contractComposer.contractTypeLabel")}
                    </label>
                    <select
                      value={contractType}
                      onChange={(e) =>
                        setContractType(
                          e.target.value as "full_acquisition" | "co_publishing",
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-amber-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="full_acquisition">
                        {t("contractComposer.contractTypeFullAcquisition")}
                      </option>
                      <option value="co_publishing">
                        {t("contractComposer.contractTypeCoPublishing")}
                      </option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {t("contractComposer.contractTypeHelper")}
                    </p>
                  </div>

                  {contractType === "co_publishing" ? (
                    <Input
                      label={t("contractComposer.revenueSplitLabel")}
                      type="number"
                      min="0"
                      max="100"
                      value={revenueSplit}
                      onChange={(e) =>
                        setRevenueSplit(parseInt(e.target.value) || 0)
                      }
                      helperText={t("contractComposer.revenueSplitHelper")}
                      required
                    />
                  ) : (
                    <Input
                      label={t("contractComposer.lumpSumLabel")}
                      placeholder={t("contractComposer.lumpSumPlaceholder")}
                      value={lumpSumAmount}
                      onChange={(e) => setLumpSumAmount(e.target.value)}
                      helperText={t("contractComposer.lumpSumHelper")}
                      required
                    />
                  )}
                </div>

                {/* Chữ ký Bên A — bắt buộc ngay lúc soạn hợp đồng */}
                <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="w-1.5 h-3 rounded bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                      {t("contractComposer.signatureTitle")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("contractComposer.signatureHelp")}
                  </p>
                  <SignaturePad
                    onChange={setAdminSignatureBase64}
                    placeholder={t("contractComposer.signaturePlaceholder")}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer transition-studio"
                    onClick={() => setIsContractModalOpen(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    icon={<FileCheck size={16} />}
                    disabled={!adminSignatureBase64}
                  >
                    {t("contractComposer.submit")}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Universal Contract Viewer Modal (admin xem hợp đồng — ký ngay lúc tạo offer) */}
      {isViewerOpen && selectedContract && (
        <ContractViewerModal
          contract={selectedContract}
          currentUser={currentUser}
          mode={viewerMode}
          onClose={() => setIsViewerOpen(false)}
          onSignSuccess={() => {
            setIsViewerOpen(false);
            fetchPendingGamesAndContracts();
          }}
        />
      )}

      {/* Screenshot Lightbox Modal */}
      {isOpenLightbox && activeScreenshotUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsOpenLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-slate-900 border border-slate-800 text-slate-500 hover:text-white rounded-lg transition-studio active:scale-95 cursor-pointer"
            onClick={() => setIsOpenLightbox(false)}
            aria-label={t("dialog.close")}
            title={t("dialog.close")}
          >
            <X size={20} />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] rounded-xl overflow-hidden border border-slate-850 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeScreenshotUrl}
              alt={t("lightbox.enlargedScreenshotAlt")}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Play Game Demo Modal — fullscreen để admin có đủ không gian chơi thử trước khi duyệt game */}
      {playDemoGame && playDemoGame.webDemoUrl && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
          onClick={() => setPlayDemoGame(null)}
        >
          <div className="w-full max-w-6xl flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-white truncate">
              {t("playDemo.title", { title: playDemoGame.title })}
            </h3>
            <button
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-studio active:scale-95 cursor-pointer shrink-0"
              onClick={() => setPlayDemoGame(null)}
              aria-label={t("dialog.close")}
              title={t("dialog.close")}
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="relative w-full max-w-6xl aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={playDemoGame.webDemoUrl}
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              allow="autoplay; fullscreen; gamepad; cross-origin-isolated"
              className="w-full h-full border-none"
              title={t("playDemo.title", { title: playDemoGame.title })}
            />
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {isRejectModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-scale-up">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {t("modals.rejectionTitle")}
                </h3>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-studio active:scale-95"
                  aria-label={t("dialog.close")}
                  title={t("dialog.close")}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("modals.itemDetails")}
                </span>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-850">
                  {rejectItemTitle}
                </h4>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("modals.rejectionReasonLabel")}
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("modals.rejectionReasonPlaceholder")}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-450 dark:placeholder:text-slate-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs transition-studio"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReject || !rejectReason.trim()}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-studio active:scale-95"
                  onClick={handleConfirmRejection}
                >
                  {isSubmittingReject
                    ? t("modals.rejecting")
                    : t("modals.rejectSubmission")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
