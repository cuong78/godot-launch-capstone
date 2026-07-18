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
import { contractApi } from "../api/contractApi";
import { marketplaceApi } from "../api/marketplaceApi";
import { platformSettingsApi } from "../api/platformSettingsApi";
import { walletApi } from "../api/walletApi";
import { paymentApi } from "../api/paymentApi";
import { SignaturePad } from "../components/SignaturePad";
import { ContractViewerModal } from "../components/ContractViewerModal";
import AdminDisputePanel from "../components/admin/AdminDisputePanel";
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
  | "disputes";

type AdminSectionKey =
  | "overview"
  | "moderation"
  | "finance"
  | "users"
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
  finance: ["wallet", "payments", "withdrawal"],
  users: ["users"],
  system: ["logs", "settings", "storage", "disputes"],
};

const ADMIN_DEFAULT_TAB_BY_SECTION: Record<
  Exclude<AdminSectionKey, "overview">,
  AdminTabKey
> = {
  moderation: "moderation",
  finance: "wallet",
  users: "users",
  system: "logs",
};

const SYSTEM_SECTION_TITLE_KEY_BY_TAB: Partial<Record<AdminTabKey, string>> = {
  logs: "sectionTitle.logs",
  settings: "sectionTitle.settings",
  storage: "sectionTitle.storage",
  disputes: "sectionTitle.disputes",
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

const getContractStatusLabel = (status: string) => {
  switch (status) {
    case "signed":
      return {
        text: "Đã ký",
        colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "cancelled":
      return {
        text: "Đã hủy / Chờ chào lại",
        colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      };
    case "expired":
      return {
        text: "Hết hạn",
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
    case "pending":
    default:
      return {
        text: "Chờ Developer ký",
        colorClass:
          "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
      };
  }
};

const AUDIT_ACTIONS = [
  { value: "user_registered", label: "User Registered" },
  { value: "user_login_success", label: "Login Success" },
  { value: "user_login_failed", label: "Login Failed" },
  { value: "user_logged_out", label: "Logged Out" },
  { value: "user_banned", label: "User Banned" },
  { value: "user_unbanned", label: "User Unbanned" },
  { value: "user_role_changed", label: "User Role Changed" },
  { value: "game_submitted", label: "Game Submitted" },
  { value: "game_approved", label: "Game Approved" },
  { value: "game_rejected", label: "Game Rejected" },
  { value: "game_published", label: "Game Published" },
  { value: "game_updated", label: "Game Updated" },
  { value: "contract_created", label: "Contract Created" },
  { value: "contract_signed", label: "Contract Signed" },
  { value: "contract_cancelled", label: "Contract Cancelled" },
  { value: "security_alert", label: "Security Alert" },
  { value: "post_created", label: "Post Created" },
  { value: "comment_created", label: "Comment Created" },
  { value: "reaction_created", label: "Reaction Created" },
  { value: "chat_message_sent", label: "Chat Message Sent" },
];

const AUDIT_TARGETS = [
  { value: "user", label: "User" },
  { value: "game", label: "Game" },
  { value: "contract", label: "Contract" },
  { value: "community_chat", label: "Community Post/Comment" },
  { value: "chat_message", label: "Direct Message" },
  { value: "ai_report", label: "AI Report" },
  { value: "transaction", label: "Transaction" },
  { value: "withdrawal", label: "Withdrawal" },
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

const formatCurrency = (value?: number | null, currency = "VND") => {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const getAdminPreviewRoleLabel = (role: AdminUserRecord["role"]) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "developer":
      return "Developer";
    case "customer":
    default:
      return "Customer";
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

const getAdminPreviewStatusLabel = (status: AdminUserStatus) => {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "suspended":
      return "Suspended";
    case "banned":
      return "Banned";
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

const formatAdminOverviewDate = (value?: string) => {
  if (!value) {
    return "New";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "New";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const moderationStatusFilterOptions: Array<{
  value: ModerationStatusFilter;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "approved_published", label: "Approved / Published" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All Submissions" },
];

export const AdminPage: React.FC<AdminPageProps> = ({
  setCurrentScreen,
  currentUser,
}) => {
  const { t } = useTranslation(["admin"]);
  const [activeTab, setActiveTab] = useState<AdminTabKey>("moderation");
  const [activeSection, setActiveSection] =
    useState<AdminSectionKey>("overview");
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
          return status === "pending";
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
            case "disputes":
              return { key: tabKey, label: t("tabs.disputes") };
            default:
              return { key: tabKey, label: tabKey };
          }
        });
  const adminDisplayName =
    currentUser?.fullName ||
    currentUser?.username ||
    currentUser?.email ||
    "Admin operator";
  const systemSectionTitleKey = SYSTEM_SECTION_TITLE_KEY_BY_TAB[activeTab];
  const systemSectionTitle = systemSectionTitleKey
    ? t(systemSectionTitleKey)
    : t("sectionTitle.default");
  const adminIdentity = currentUser?.email || "admin@godotlaunch.com";
  const adminInitial = adminDisplayName.trim().charAt(0).toUpperCase() || "A";
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
    "Violated store policies",
  );
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<ContractResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"view">("view");

  // Form states for creating contract
  const [buyerRepresentative, setBuyerRepresentative] = useState("");
  const [buyerPosition, setBuyerPosition] = useState(
    "Ban quản trị hệ thống / Authorized Representative",
  );
  const [sellerRepresentative, setSellerRepresentative] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerTaxCode, setSellerTaxCode] = useState("");
  const [lumpSumAmount, setLumpSumAmount] = useState("");
  const [revenueSplit, setRevenueSplit] = useState(70);
  const [disputeResolutionClause, setDisputeResolutionClause] = useState(
    "Mọi tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này sẽ được giải quyết trước tiên thông qua thương lượng thân thiện. Nếu không giải quyết được, tranh chấp sẽ được đưa ra giải quyết tại Trọng tài theo quy định.\nAny dispute arising out of or in connection with this contract shall first be resolved through friendly negotiations. If unresolved, it shall be referred to arbitration.",
  );
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [adminSignatureBase64, setAdminSignatureBase64] = useState<
    string | null
  >(null);
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
      alert("Không thể tải xuống tệp. Vui lòng kiểm tra lại!");
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
        setGamesError(gamesRes.message || "Failed to load games");
      }

      if (contractsRes.success && contractsRes.data) {
        setContracts(contractsRes.data);
      }
    } catch (err: any) {
      setGamesError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch moderation queue",
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
        setMarketplaceError(res.message || "Failed to load marketplace items");
      }
    } catch (err: any) {
      setMarketplaceError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch marketplace submissions",
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
        setUsersError(response.message || "Failed to load users");
      }
    } catch (err: any) {
      setUsersError(
        err.response?.data?.message || err.message || "Failed to fetch users",
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
        setLogsError(res.message || "Failed to load audit logs");
      }
    } catch (err: any) {
      setLogsError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch audit logs",
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
          response.message || "Failed to load payout wallet balance",
        );
      }

      setPayoutBalance(response.data);
    } catch (err: any) {
      setPayoutBalanceError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load payout wallet balance",
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
    ? "Loading..."
    : payoutBalance
      ? formatCurrency(
          Number(payoutBalance.balance),
          payoutBalance.currency || "VND",
        )
      : "N/A";

  const payoutBalanceCaption = payoutBalanceError
    ? payoutBalanceError
    : payoutBalance
      ? "Synced from the PayOS payout account."
      : "Loading payout wallet balance...";

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
    setMaintenance(Boolean(settings.maintenanceMode));
    setAnnouncement(settings.announcementBanner || "");
  };

  const fetchPlatformSettings = async () => {
    setIsLoadingSettings(true);
    setSettingsError(null);
    try {
      const response = await platformSettingsApi.getPlatformSettings();
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load platform settings");
      }

      applyPlatformSettings(response.data);
    } catch (err: any) {
      setSettingsError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load platform settings",
      );
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Platform settings state
  const [commission, setCommission] = useState(10);
  const [maintenance, setMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "GodotLaunch Matrix Engine Upgrade is complete!",
  );
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleApproveGame = async (game: GameResponse) => {
    if (!game.publishingType || game.publishingType === "marketplace_listing") {
      if (
        !window.confirm(
          `Are you sure you want to APPROVE and publish "${game.title}"?`,
        )
      ) {
        return;
      }
      try {
        const res = await gameApi.approveGame(game.id);
        if (res.success) {
          alert(`Game "${game.title}" approved & published successfully!`);
          fetchPendingGamesAndContracts();
        } else {
          alert(res.message || "Failed to approve game");
        }
      } catch (err: any) {
        alert(
          err.response?.data?.message ||
            err.message ||
            "Failed to approve game",
        );
      }
    } else {
      // Contract-based game: Open contract creation modal directly upon approval!
      handleOpenContractModal(game);
    }
  };

  const handleRejectGame = (id: string, title: string) => {
    setRejectItemId(id);
    setRejectItemTitle(title);
    setRejectItemType("game");
    setRejectReason("Violated store policies");
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setIsSubmittingReject(true);
    try {
      if (rejectItemType === "game") {
        const res = await gameApi.rejectGame(rejectItemId, rejectReason);
        if (res.success) {
          alert(`Game "${rejectItemTitle}" rejected. Creator notified.`);
          setIsRejectModalOpen(false);
          fetchPendingGamesAndContracts();
        } else {
          alert(res.message || "Failed to reject game");
        }
      } else {
        const res = await marketplaceApi.rejectMarketplaceItem(
          rejectItemId,
          rejectReason,
        );
        if (res.success) {
          alert(
            `Marketplace item "${rejectItemTitle}" rejected. Creator notified.`,
          );
          setIsRejectModalOpen(false);
          fetchPendingMarketplaceItems();
        } else {
          alert(res.message || "Failed to reject marketplace item");
        }
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message || err.message || "Failed to reject item",
      );
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleApproveMarketplaceItem = async (
    item: MarketplaceItemResponse,
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to APPROVE and activate the marketplace item "${item.title}"?`,
      )
    ) {
      return;
    }
    try {
      const res = await marketplaceApi.approveMarketplaceItem(item.id);
      if (res.success) {
        alert(
          `Marketplace item "${item.title}" approved & activated successfully!`,
        );
        fetchPendingMarketplaceItems();
      } else {
        alert(res.message || "Failed to approve marketplace item");
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to approve marketplace item",
      );
    }
  };

  const handleRejectMarketplaceItem = (id: string, title: string) => {
    setRejectItemId(id);
    setRejectItemTitle(title);
    setRejectItemType("marketplace");
    setRejectReason("Violated store policies");
    setIsRejectModalOpen(true);
  };

  const handleOpenContractModal = (game: GameResponse) => {
    setSelectedGame(game);
    // Prefill details
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
    setIsContractModalOpen(true);
  };

  const handleCreateContractOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;
    if (!adminSignatureBase64) {
      alert("Vui lòng ký tên (Bên A) trước khi gửi hợp đồng.");
      return;
    }

    try {
      const res = await contractApi.createOffer({
        gameId: selectedGame.id,
        contractType:
          selectedGame.publishingType === "co_publishing"
            ? "co_publishing"
            : "full_acquisition",
        revenueSplit:
          selectedGame.publishingType === "co_publishing"
            ? revenueSplit
            : undefined,
        lumpSumAmount:
          selectedGame.publishingType === "full_acquisition"
            ? lumpSumAmount
            : undefined,
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
        alert("Hợp đồng đề xuất đã được tạo thành công và gửi cho Developer!");
        setIsContractModalOpen(false);
        fetchPendingGamesAndContracts();
      } else {
        alert(res.message || "Lỗi tạo hợp đồng");
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Lỗi gửi yêu cầu tạo hợp đồng",
      );
    }
  };

  const handleAdminUserUpdate = async (input: AdminUserUpdateInput) => {
    const existingUser = users.find((user) => user.id === input.id);
    if (!existingUser) {
      throw new Error("User not found.");
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
        throw new Error(response.message || "Failed to update user.");
      }

      const updatedUser = mapApiUserToAdminUser(response.data);
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === input.id ? updatedUser : user)),
      );
    } catch (err: any) {
      throw new Error(
        err.response?.data?.message || err.message || "Failed to update user.",
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
        maintenanceMode: maintenance,
        announcementBanner: announcement.trim() || null,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to update platform settings",
        );
      }

      applyPlatformSettings(response.data);
      setSettingsSuccess(true);
      window.setTimeout(() => setSettingsSuccess(false), 2000);
    } catch (err: any) {
      setSettingsError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update platform settings",
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
            title="Admin Control Center"
            subtitle="Moderation, finance, user, and system operations in one controlled surface."
            items={sidebarItems}
            activeKey={activeSection}
            onSelect={(key) => handleSectionSelect(key as AdminSectionKey)}
            footer={
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 dark:border-slate-800 dark:bg-slate-900/80">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={adminDisplayName}
                    className="h-11 w-11 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-sm font-bold text-sky-100">
                    {adminInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {adminDisplayName}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {adminIdentity}
                  </div>
                </div>
              </div>
            }
          />
        }
        topbar={null}
      >
        <div className="space-y-5 animate-fade-in py-1">
          {activeSection === "overview" ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-slate-200/90 bg-white/96 p-4 shadow-[0_14px_36px_rgba(148,163,184,0.12)] space-y-2.5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-none">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <DollarSign size={12} className="text-sky-500" /> Payout
                    wallet balance
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
                    <Users size={12} className="text-amber-500" /> Platform
                    accounts
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold dark:text-white">
                      {users.length} users
                    </span>
                    <span className="text-[10px] text-emerald-500 font-bold font-mono">
                      Live directory
                    </span>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/90 bg-white/96 p-4 shadow-[0_14px_36px_rgba(148,163,184,0.12)] space-y-2.5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-none">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <FileCheck size={12} className="text-purple-500" /> Pending
                    Moderation
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold dark:text-white">
                      {moderationItemsCount} items
                    </span>
                    {moderationItemsCount > 0 && (
                      <span className="text-[10px] text-amber-500 font-bold font-mono animate-pulse">
                        Action required
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/90 bg-white/96 p-4 shadow-[0_14px_36px_rgba(148,163,184,0.12)] space-y-2.5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-none">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <Activity size={12} className="text-emerald-500" /> Node
                    Infrastructure
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-2xl font-display font-bold dark:text-white">
                      99.98%
                    </span>
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
                          Moderation Preview
                        </h3>
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500 leading-none">
                          {moderationItemsCount} queue
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
                      Open
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {isLoadingGames || isLoadingMarketplace ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        Loading moderation snapshot...
                      </div>
                    ) : gamesError || marketplaceError ? (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
                        {gamesError || marketplaceError}
                      </div>
                    ) : moderationItemsCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        No pending game or asset submissions right now.
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
                                        "Unknown creator"}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-500">
                                      Game
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                      {formatAdminOverviewDate(game.createdAt)}
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
                                        "Unknown seller"}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                                      Asset
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                      {formatAdminOverviewDate(item.createdAt)}
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
                        User Ops
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSectionTab("users", "users")}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-studio hover:border-sky-400/35 hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      Open
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {isLoadingUsers ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        Loading user directory...
                      </div>
                    ) : usersError ? (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
                        {usersError}
                      </div>
                    ) : users.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                        No indexed accounts right now.
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
                                        You
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
                                    {getAdminPreviewRoleLabel(user.role)}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getAdminPreviewStatusBadgeClass(user.status)}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {getAdminPreviewStatusLabel(user.status)}
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
                      Platform Snapshot
                    </h3>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-4 shadow-[0_10px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Commission rate
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                        {commission}%
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-4 shadow-[0_10px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Announcement banner
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {announcement?.trim() ||
                          "No active announcement banner."}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 ${
                        maintenance
                          ? "border-amber-400/25 bg-amber-400/10"
                          : "border-emerald-400/20 bg-emerald-400/10"
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Maintenance mode
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {maintenance
                          ? "Enabled for platform protection."
                          : "Disabled. Storefront flows remain open."}
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
                            Platform Wallet
                          </h3>
                          <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                            Monitor the admin commission ledger and PayOS payout
                            account without entering the creator wallet flow.
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
                          Refresh Wallet
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
                        Game & Asset Moderation Queue
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("moderation")}
                        className="inline-flex min-w-[108px] items-center justify-between gap-3 rounded-2xl border border-sky-400/35 bg-sky-400/12 px-4 py-2 text-sm font-semibold text-sky-700 transition-studio dark:text-sky-200"
                      >
                        <span>Queue</span>
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
                        Game Submissions
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
                        Asset Submissions
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
                        Queue Status
                      </div>

                      <label className="relative block w-full sm:w-[260px]">
                        <select
                          value={moderationStatusFilter}
                          onChange={(event) =>
                            setModerationStatusFilter(
                              event.target.value as ModerationStatusFilter,
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200/70 bg-white/90 px-4 py-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition-studio focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-slate-800/70 dark:bg-slate-950/80 dark:text-slate-200"
                        >
                          {moderationStatusFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </label>
                    </div>

                    {moderationSubTab === "games" ? (
                      <>
                        {isLoadingGames ? (
                          <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                            <RefreshCw className="animate-spin" size={18} />{" "}
                            Loading pending submissions...
                          </div>
                        ) : gamesError ? (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                            Error loading submissions: {gamesError}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                                  <th className="p-3 w-10"></th>
                                  <th className="p-3">Asset Details</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3">Publishing Type</th>
                                  <th className="p-3">Proposed Price</th>
                                  <th className="p-3 text-center">
                                    Trạng thái HĐ
                                  </th>
                                  <th className="p-3 text-center">Decisions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                                {pendingGames.length > 0 ? (
                                  pendingGames.map((game) => (
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
                                                ? "Hide Details"
                                                : "Show Details"
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
                                                ? "Chờ duyệt"
                                                : "Đã duyệt"}
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
                                              title="Quick View Content"
                                            >
                                              <Eye size={12} />
                                            </button>
                                          </div>
                                          <div className="text-[10px] text-slate-500 dark:text-slate-455">
                                            by {game.creatorName}
                                          </div>
                                        </td>
                                        <td className="p-3 text-slate-600 dark:text-slate-350">
                                          {game.categoryName || "Unassigned"}
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
                                            {game.publishingType
                                              ? game.publishingType.toUpperCase()
                                              : "MARKETPLACE_LISTING"}
                                          </span>
                                        </td>
                                        <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                          {game.priceProposed == null
                                            ? "Chưa có giá"
                                            : game.priceProposed === 0
                                              ? "Miễn phí"
                                              : `${game.priceProposed.toLocaleString("vi-VN")} đ`}
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
                                                <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">
                                                  Chưa tạo
                                                </span>
                                              );
                                            }
                                            const statusInfo =
                                              getContractStatusLabel(
                                                contract.status,
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
                                                  title="Duyệt game"
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
                                                  title="Từ chối game"
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
                                                  Rejected
                                                </span>
                                              );
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
                                                  Live
                                                </span>
                                              ) : (
                                                <span className="inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[10px] font-bold font-display">
                                                  Approved
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
                                                <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">
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
                                                  Chờ Dev ký
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
                                                    Live trên Google Play
                                                  </span>
                                                );
                                              }
                                              return (
                                                <span className="inline-block px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-500 rounded-lg text-[10px] font-bold font-display animate-pulse">
                                                  Chờ Upload Build
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
                                                Chào lại HĐ
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
                                                          Developer từ chối hợp
                                                          đồng với lý do:
                                                        </span>
                                                        <p className="italic text-[11px] text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-950/30 p-2 rounded border border-rose-500/10 break-words">
                                                          "
                                                          {
                                                            activeRejectedContract.rejectionReason ??
                                                            ""
                                                          }
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
                                                    Thumbnail
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
                                                          NO THUMBNAIL
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                    Mô tả chi tiết
                                                  </h4>
                                                  <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                                    {game.description ||
                                                      "Không có mô tả chi tiết từ developer."}
                                                  </p>
                                                </div>

                                                <div className="space-y-1.5">
                                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                    Tags
                                                  </h4>
                                                  {game.tags &&
                                                  game.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {game.tags.map(
                                                        (tag, idx) => (
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
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-600">
                                                      Không có tags nào được
                                                      chọn
                                                    </p>
                                                  )}
                                                </div>

                                                <div className="space-y-1.5">
                                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                    GitHub Repository
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
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-600">
                                                      Không có repo
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
                                                        Downloading...
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Download size={14} />{" "}
                                                        Download Game Package
                                                        (ZIP)
                                                      </>
                                                    )}
                                                  </button>
                                                ) : (
                                                  <div className="text-center py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                                                    Không tìm thấy tệp game ZIP
                                                    để tải về
                                                  </div>
                                                )}
                                              </div>

                                              {/* Middle & Right Column: Screenshots & Video */}
                                              <div className="space-y-4 md:col-span-2 flex flex-col justify-between">
                                                {/* Play Game Demo: mở modal toàn màn hình để admin chơi thử trực tiếp trước khi duyệt */}
                                                <div className="space-y-2">
                                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                    <Play
                                                      size={12}
                                                      className="text-amber-500"
                                                    />{" "}
                                                    Play Game Demo
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
                                                      Chơi thử Demo (Fullscreen)
                                                    </button>
                                                  ) : (
                                                    <div className="flex flex-col items-center justify-center py-6 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                                      <Play
                                                        size={20}
                                                        className="mb-1 text-slate-350 dark:text-slate-650"
                                                      />
                                                      <span className="text-[10px]">
                                                        Developer chưa tải lên
                                                        web demo nào
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="space-y-2">
                                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                    <Image
                                                      size={12}
                                                      className="text-amber-500"
                                                    />{" "}
                                                    Ảnh chụp màn hình
                                                    (Screenshots)
                                                  </h4>
                                                  {game.screenshots &&
                                                  game.screenshots.length >
                                                    0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                      {game.screenshots.map(
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
                                                              alt={`Screenshot ${index + 1}`}
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
                                                  ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                                      <Image
                                                        size={24}
                                                        className="mb-1 text-slate-350 dark:text-slate-650"
                                                      />
                                                      <span className="text-[10px]">
                                                        Developer không tải lên
                                                        screenshot nào
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Video Gameplay */}
                                                <div className="space-y-2">
                                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                    <Video
                                                      size={12}
                                                      className="text-amber-500"
                                                    />{" "}
                                                    Video Gameplay Demo
                                                  </h4>
                                                  {game.videoUrl ? (
                                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-56">
                                                      <video
                                                        src={game.videoUrl}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                                      <Video
                                                        size={24}
                                                        className="mb-1 text-slate-350 dark:text-slate-650"
                                                      />
                                                      <span className="text-[10px]">
                                                        Developer không tải lên
                                                        video gameplay nào
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* AI REVIEW REPORT */}
                                                <div className="pt-2">
                                                  <AiReviewReportCard
                                                    gameId={game.id}
                                                  />
                                                </div>

                                                {/* PUSH GOOGLE PLAY (chỉ game full_acquisition/co_publishing đã ký hợp đồng) */}
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
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium"
                                    >
                                      🎉 Clean slate! No pending submissions to
                                      moderate.
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
                            Loading pending marketplace items...
                          </div>
                        ) : marketplaceError ? (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                            Error loading marketplace items: {marketplaceError}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                                  <th className="p-3 w-10"></th>
                                  <th className="p-3">Asset Details</th>
                                  <th className="p-3">Item Type</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3">Proposed Price</th>
                                  <th className="p-3 text-center">Decisions</th>
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
                                                  ? "Hide Details"
                                                  : "Show Details"
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
                                                {item.status || "Pending"}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-455">
                                              by{" "}
                                              {item.sellerFullName ||
                                                item.sellerEmail}
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border bg-emerald-450/10 text-emerald-500 border-emerald-500/20">
                                              RESOURCE ASSET
                                            </span>
                                          </td>
                                          <td className="p-3 text-slate-600 dark:text-slate-355">
                                            {item.categoryName || "Unassigned"}
                                          </td>
                                          <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                            {item.price === 0
                                              ? "Miễn phí"
                                              : `${item.price.toLocaleString("vi-VN")} đ`}
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
                                                  title="Approve Asset"
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
                                                  title="Reject Asset"
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                {item.status?.toLowerCase() ===
                                                "active" ? (
                                                  <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold font-display">
                                                    Active
                                                  </span>
                                                ) : (
                                                  <span className="inline-block px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold font-display">
                                                    Rejected
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
                                                      Refreshing latest media...
                                                    </div>
                                                  )}
                                                  <div>
                                                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                                      <Image size={12} />{" "}
                                                      Thumbnail
                                                    </h4>
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
                                                            NO THUMBNAIL
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="space-y-1.5">
                                                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                                                      Item Description
                                                    </h4>
                                                    <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                                      {displayItem.description ||
                                                        "No description provided."}
                                                    </p>
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
                                                          Downloading...
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Download size={14} />{" "}
                                                          Download Asset Package
                                                          (ZIP)
                                                        </>
                                                      )}
                                                    </button>
                                                  ) : (
                                                    <div className="text-center py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                                                      No file package uploaded
                                                      for this asset
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Middle Column: Screenshots & Video */}
                                                <div className="space-y-4 flex flex-col justify-between">
                                                  <div className="space-y-2">
                                                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                      <Image
                                                        size={12}
                                                        className="text-amber-500"
                                                      />{" "}
                                                      Screenshots
                                                    </h4>
                                                    {displayItem.screenshots &&
                                                    displayItem.screenshots
                                                      .length > 0 ? (
                                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {displayItem.screenshots.map(
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
                                                                alt={`Screenshot ${index + 1}`}
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
                                                    ) : (
                                                      <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                                        <Image
                                                          size={24}
                                                          className="mb-1 text-slate-350 dark:text-slate-650"
                                                        />
                                                        <span className="text-[10px]">
                                                          No screenshots
                                                          uploaded
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Video Demo */}
                                                  <div className="space-y-2">
                                                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                      <Video
                                                        size={12}
                                                        className="text-amber-500"
                                                      />{" "}
                                                      Video Demo
                                                    </h4>
                                                    {displayItem.videoUrl ? (
                                                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-56">
                                                        <video
                                                          src={
                                                            displayItem.videoUrl
                                                          }
                                                          controls
                                                          className="w-full h-full object-contain"
                                                        />
                                                      </div>
                                                    ) : (
                                                      <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                                        <Video
                                                          size={24}
                                                          className="mb-1 text-slate-350 dark:text-slate-650"
                                                        />
                                                        <span className="text-[10px]">
                                                          No demo video uploaded
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Right Column: Specifications, Creator Details & License info */}
                                                <div className="space-y-4">
                                                  <div className="space-y-3.5 bg-white/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                                                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5">
                                                      Technical & Creator
                                                      Details
                                                    </h4>
                                                    <div className="space-y-2 text-xs">
                                                      <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                        <span className="text-slate-500">
                                                          Creator Name
                                                        </span>
                                                        <span className="font-semibold">
                                                          {displayItem.sellerFullName ||
                                                            "N/A"}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                        <span className="text-slate-500">
                                                          Creator Email
                                                        </span>
                                                        <span className="font-mono">
                                                          {
                                                            displayItem.sellerEmail
                                                          }
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                        <span className="text-slate-500">
                                                          Version
                                                        </span>
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                                          {displayItem.version ||
                                                            "N/A"}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between pb-0.5">
                                                        <span className="text-slate-500">
                                                          Submitted On
                                                        </span>
                                                        <span>
                                                          {displayItem.createdAt
                                                            ? new Date(
                                                                displayItem.createdAt,
                                                              ).toLocaleDateString()
                                                            : "N/A"}
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
                                      className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium"
                                    >
                                      🎉 Clean slate! No pending marketplace
                                      submissions to moderate.
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
                            Action
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
                                ? AUDIT_ACTIONS.find(
                                    (act) => act.value === filterAction,
                                  )?.label || filterAction
                                : "All Actions"}
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
                              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200/80 bg-white/95 py-1.5 shadow-xl backdrop-blur-md divide-y divide-slate-105 animate-fade-in dark:divide-slate-800/40 dark:border-slate-800/80 dark:bg-slate-900/95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterAction("");
                                    setCurrentPage(0);
                                    setIsActionDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-amber-400 hover:text-slate-950 ${!filterAction ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold" : "text-slate-700 dark:text-slate-300"}`}
                                >
                                  All Actions
                                </button>
                                {AUDIT_ACTIONS.map((act) => (
                                  <button
                                    key={act.value}
                                    type="button"
                                    onClick={() => {
                                      setFilterAction(act.value);
                                      setCurrentPage(0);
                                      setIsActionDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-amber-400 hover:text-slate-950 ${filterAction === act.value ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold" : "text-slate-700 dark:text-slate-300"}`}
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
                            Target Type
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
                                ? AUDIT_TARGETS.find(
                                    (t) => t.value === filterTargetType,
                                  )?.label || filterTargetType
                                : "All Targets"}
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
                              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200/80 bg-white/95 py-1.5 shadow-xl backdrop-blur-md divide-y divide-slate-105 animate-fade-in dark:divide-slate-800/40 dark:border-slate-800/80 dark:bg-slate-900/95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterTargetType("");
                                    setCurrentPage(0);
                                    setIsTargetDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-amber-400 hover:text-slate-950 ${!filterTargetType ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold" : "text-slate-700 dark:text-slate-300"}`}
                                >
                                  All Targets
                                </button>
                                {AUDIT_TARGETS.map((t) => (
                                  <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => {
                                      setFilterTargetType(t.value);
                                      setCurrentPage(0);
                                      setIsTargetDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-amber-400 hover:text-slate-950 ${filterTargetType === t.value ? "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold" : "text-slate-700 dark:text-slate-300"}`}
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
                            Actor ID (UUID)
                          </label>
                          <input
                            type="text"
                            placeholder="Enter User ID..."
                            value={searchActorId}
                            onChange={(e) => setSearchActorId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 placeholder-slate-400 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 dark:placeholder-slate-500"
                          />
                        </div>

                        {/* Target ID Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            Target ID (UUID)
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Target ID..."
                            value={searchTargetId}
                            onChange={(e) => setSearchTargetId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm text-slate-800 outline-none transition-studio shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 placeholder-slate-400 dark:border-slate-800/60 dark:bg-slate-900/65 dark:text-slate-200 dark:placeholder-slate-500"
                          />
                        </div>

                        {/* IP Address Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 font-bold">
                            IP Address
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 127.0.0.1"
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
                          Clear Filters
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-400/10 transition-studio hover:bg-amber-500 hover:text-black hover:shadow-amber-400/20 active:scale-95 cursor-pointer"
                        >
                          Search
                        </button>
                      </div>
                    </form>

                    {/* Error or Loader */}
                    {isLoadingLogs ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                        <RefreshCw className="animate-spin" size={18} /> Loading
                        audit logs...
                      </div>
                    ) : logsError ? (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                        Error loading audit logs: {logsError}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                                <th className="p-3 w-10"></th>
                                <th className="p-3">Time & IP</th>
                                <th className="p-3">Actor Info</th>
                                <th className="p-3">Action Type</th>
                                <th className="p-3">Target Reference</th>
                                <th className="p-3">Note / Summary</th>
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
                                          title="View JSON Payload Diff"
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
                                        <div className="text-[9px] text-slate-400 dark:text-slate-550 font-mono mt-0.5">
                                          IP: {log.ipAddress || "Unknown"}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        {log.actorEmail ? (
                                          <div className="font-semibold text-slate-850 dark:text-slate-200">
                                            {log.actorEmail}
                                          </div>
                                        ) : (
                                          <div className="italic text-slate-450">
                                            Anonymous / System
                                          </div>
                                        )}
                                        {log.actorId && (
                                          <div
                                            className="font-mono text-[9px] text-slate-450 dark:text-slate-500 mt-0.5"
                                            title={log.actorId}
                                          >
                                            <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase mr-1 select-none">
                                              ID:
                                            </span>
                                            <span className="select-all break-all">
                                              {log.actorId}
                                            </span>
                                          </div>
                                        )}
                                        <span className="inline-block mt-1 px-1.5 py-0.2 bg-slate-105 dark:bg-slate-950 text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded font-mono">
                                          {log.actorRole
                                            ? log.actorRole.toUpperCase()
                                            : "UNKNOWN"}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getActionBadgeClass(log.action)}`}
                                        >
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-semibold text-slate-655 dark:text-slate-400">
                                          Type: {log.targetType}
                                        </div>
                                        {log.targetId && (
                                          <div
                                            className="font-mono text-[9px] text-slate-450 dark:text-slate-500 mt-0.5"
                                            title={log.targetId}
                                          >
                                            <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase mr-1 select-none">
                                              Ref ID:
                                            </span>
                                            <span className="select-all break-all">
                                              {log.targetId}
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">
                                        {log.note || "No notes"}
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
                                                Old Value (Before)
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
                                                  : "NULL"}
                                              </pre>
                                            </div>
                                            <div>
                                              <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                                                New Value (After)
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
                                                  : "NULL"}
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
                                    className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium"
                                  >
                                    No audit logs found matching the selected
                                    filters.
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
                              Page {currentPage + 1} of {totalPages} (
                              {totalElements} logs)
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
                                Previous
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
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 5: Storage Management */}
                {activeTab === "storage" && <AdminFileManagementPanel />}
                {activeTab === "disputes" && <AdminDisputePanel />}

                {/* Tab 4: Platform Settings */}
                {activeTab === "settings" && (
                  <div className="space-y-4">
                    {settingsSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-500 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                        <Check size={14} /> System variables successfully
                        updated. Node servers reloading...
                      </div>
                    )}

                    {settingsError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-500 text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle size={14} /> {settingsError}
                      </div>
                    )}

                    {isLoadingSettings && (
                      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                        <RefreshCw size={14} className="animate-spin" /> Loading
                        platform settings...
                      </div>
                    )}

                    <form
                      onSubmit={handleSaveSettings}
                      className="space-y-4 max-w-xl"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Platform Commission rate (%)"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={commission}
                          onChange={(e) =>
                            setCommission(parseFloat(e.target.value) || 0)
                          }
                          helperText="Percentage kept by the platform from each marketplace transaction"
                          required
                        />

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                            System Maintenance Status
                          </label>
                          <div className="flex items-center gap-3 pt-1.5">
                            <button
                              type="button"
                              onClick={() => setMaintenance(!maintenance)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${maintenance ? "bg-amber-400" : "bg-slate-200 dark:bg-slate-800"}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenance ? "translate-x-5" : "translate-x-0"}`}
                              />
                            </button>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              {maintenance
                                ? "ACTIVE - Site Locked"
                                : "INACTIVE - Online"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Input
                        label="Site-Wide Alert Header Banner Text"
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        placeholder="Leave blank to disable banner"
                        helperText="Banner text displayed at the top of all user screens"
                      />

                      {maintenance && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-500 text-xs font-semibold flex items-start gap-2">
                          <AlertTriangle
                            size={16}
                            className="shrink-0 mt-0.5"
                          />
                          <div>
                            <span className="block font-bold">
                              Warning: Maintenance mode is active.
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal block mt-0.5">
                              This locks non-admin users out of performing
                              checkouts, uploading files, or sync repos. Use
                              with care.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <Button
                          variant="primary"
                          size="md"
                          type="submit"
                          icon={<Sliders size={16} />}
                          disabled={isSavingSettings || isLoadingSettings}
                        >
                          {isSavingSettings
                            ? "Saving Platform Config..."
                            : "Save Platform Variable Config"}
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
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="p-3 bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 rounded-2xl shadow-md shadow-amber-500/20">
                  <PenTool size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-600 dark:text-amber-450 uppercase font-bold px-2 py-0.5 bg-amber-500/10 rounded">
                    HỢP ĐỒNG PHÁT HÀNH
                  </span>
                  <h2 className="font-display font-bold text-xl text-slate-800 dark:text-white mt-1">
                    Soạn thảo Hợp đồng Phát hành
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Nhập các điều khoản phát hành cho trò chơi "
                    {selectedGame.title}"
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
                        <AlertTriangle size={15} /> Lý do Developer từ chối ký
                        hợp đồng:
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
                {/* Bên A: Platform */}
                <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="w-1.5 h-3 rounded bg-sky-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                      BÊN A: BAN QUẢN TRỊ GODOTLAUNCH
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        Người đại diện Bên A:
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {buyerRepresentative || "Ban quản trị GodotLaunch"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        Chức vụ:
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {buyerPosition ||
                          "Ban quản trị hệ thống / Authorized Representative"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Điều khoản tài chính */}
                <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="w-1.5 h-3 rounded bg-amber-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                      ĐIỀU KHOẢN TÀI CHÍNH
                    </span>
                  </div>

                  {selectedGame.priceProposed !== undefined &&
                    selectedGame.priceProposed !== null && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl flex flex-col gap-0.5 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Giá đề xuất từ Developer:
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200 text-sm">
                          {selectedGame.priceProposed === 0
                            ? "Miễn phí / Free"
                            : `${selectedGame.priceProposed.toLocaleString("vi-VN")} VND`}
                        </strong>
                      </div>
                    )}

                  {(() => {
                    const activeRejectedContract = [...contracts]
                      .reverse()
                      .find(
                        (c) =>
                          c.gameId === selectedGame.id &&
                          c.status === "cancelled" &&
                          c.rejectionReason,
                      );
                    const isNegotiating =
                      activeRejectedContract?.rejectionReason?.startsWith(
                        "[THƯƠNG LƯỢNG]",
                      ) ?? false;

                    if (selectedGame.publishingType === "co_publishing") {
                      return (
                        <Input
                          label="Tỷ lệ chia sẻ doanh thu cho Developer (%)"
                          type="number"
                          min="0"
                          max="100"
                          value={revenueSplit}
                          onChange={(e) =>
                            setRevenueSplit(parseInt(e.target.value) || 0)
                          }
                          helperText="Ví dụ: 70 có nghĩa là Developer nhận 70% và Platform nhận 30% doanh thu phát hành"
                          required
                        />
                      );
                    } else {
                      const hasProposedPrice =
                        selectedGame.priceProposed !== undefined &&
                        selectedGame.priceProposed !== null;
                      if (!hasProposedPrice || isNegotiating) {
                        return (
                          <Input
                            label="Số tiền mua đứt trọn gói (VNĐ)"
                            placeholder="Ví dụ: 100.000.000"
                            value={lumpSumAmount}
                            onChange={(e) => setLumpSumAmount(e.target.value)}
                            helperText={
                              isNegotiating
                                ? "Đang trong tiến trình thương lượng lại giá"
                                : "Số tiền thanh toán một lần để mua toàn bộ quyền sở hữu trò chơi"
                            }
                            required
                          />
                        );
                      }
                      return null;
                    }
                  })()}
                </div>

                {/* Điều khoản pháp lý bổ sung */}
                <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="w-1.5 h-3 rounded bg-sky-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                      ĐIỀU KHOẢN PHÁP LÝ & BỔ SUNG
                    </span>
                  </div>
                  <div className="text-xs space-y-3">
                    <div>
                      <span className="text-slate-500 block mb-1">
                        Điều khoản giải quyết tranh chấp:
                      </span>
                      <p className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-250 dark:border-slate-800/80 whitespace-pre-line text-slate-700 dark:text-slate-350 leading-relaxed">
                        {disputeResolutionClause ||
                          "Mọi tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này sẽ được giải quyết trước tiên thông qua thương lượng thân thiện. Nếu không giải quyết được, tranh chấp sẽ được đưa ra giải quyết tại Trọng tài theo quy định.\nAny dispute arising out of or in connection with this contract shall first be resolved through friendly negotiations. If unresolved, it shall be referred to arbitration."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chữ ký Bên A — bắt buộc ngay lúc soạn hợp đồng */}
                <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="w-1.5 h-3 rounded bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                      CHỮ KÝ ĐẠI DIỆN BÊN A (BAN QUẢN TRỊ)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Admin phải ký ngay khi gửi hợp đồng cho Developer.
                  </p>
                  <SignaturePad
                    onChange={setAdminSignatureBase64}
                    placeholder="Dùng chuột để vẽ chữ ký đại diện Bên A..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer transition-studio"
                    onClick={() => setIsContractModalOpen(false)}
                  >
                    Hủy bỏ
                  </button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    icon={<FileCheck size={16} />}
                    disabled={!adminSignatureBase64}
                  >
                    Gửi đề nghị & Tạo Hợp đồng
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
          >
            <X size={20} />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] rounded-xl overflow-hidden border border-slate-850 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeScreenshotUrl}
              alt="Enlarged screenshot"
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
              {playDemoGame.title} — Play Demo
            </h3>
            <button
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-studio active:scale-95 cursor-pointer shrink-0"
              onClick={() => setPlayDemoGame(null)}
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
              title={`${playDemoGame.title} Play Demo`}
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
                  Rejection Reason
                </h3>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-studio active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Item Details
                </span>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-850">
                  {rejectItemTitle}
                </h4>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please enter a detailed rejection reason..."
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
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReject || !rejectReason.trim()}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-studio active:scale-95"
                  onClick={handleConfirmRejection}
                >
                  {isSubmittingReject ? "Rejecting..." : "Reject Submission"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
