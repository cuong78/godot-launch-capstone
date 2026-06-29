import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  HardDrive
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { User, GameResponse, ContractResponse, MarketplaceItemResponse, AuditLogResponse, AuditLogFilterParams, AuditActionType, AuditTargetType } from '../types';
import { userApi } from '../api/userApi';
import { gameApi } from '../api/gameApi';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { SignaturePad } from '../components/SignaturePad';
import { ContractViewerModal } from '../components/ContractViewerModal';
import { AdminStoragePanel } from '../components/AdminStoragePanel';
import AdminDisputePanel from '../components/AdminDisputePanel';
import { auditLogApi } from '../api/auditLogApi';
import AiReviewReportCard from '../components/AiReviewReportCard';
import {
  AdminUserManagementPanel,
  AdminUserRecord,
  AdminUserStatus,
  AdminUserUpdateInput,
} from '../components/admin/AdminUserManagementPanel';
import { AdminPaymentVerificationPanel } from '../components/admin/AdminPaymentVerificationPanel';
import { AdminWithdrawalPanel } from '../components/admin/AdminWithdrawalPanel';
import { AdminFileManagementPanel } from '../components/admin/AdminFileManagementPanel';

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

const isSoftDeletedUserEmail = (email: string) => email.includes('_deleted_');

const mapUserStatusToAdminStatus = (status?: string, email?: string): AdminUserStatus => {
  if (status === 'banned') {
    return 'banned';
  }

  if (status === 'inactive') {
    return isSoftDeletedUserEmail(email || '') ? 'inactive' : 'suspended';
  }

  return 'active';
};

const mapApiUserToAdminUser = (user: User): AdminUserRecord => {
  const email = user.email || '';
  const fullName = user.fullName || user.username || email;
  const roleName = user.roleName?.toLowerCase();
  const role: AdminUserRecord['role'] =
    roleName === 'admin' || roleName === 'developer' ? roleName : 'customer';

  return {
    id: user.id || '',
    username: user.username || email.split('@')[0] || email,
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
  if (status === 'suspended') {
    return 'inactive';
  }

  return status;
};

const getContractStatusLabel = (status: string, signedAtSeller?: string | null) => {
  switch (status) {
    case 'signed':
      return { text: 'Hoàn tất', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    case 'negotiating':
      return { text: 'Thương lượng', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    case 're_issued':
      return signedAtSeller
        ? { text: 'Đã ký (Chờ đối ứng)', colorClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' }
        : { text: 'Cấp lại / Chờ ký', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
    case 'cancelled':
      return { text: 'Đã hủy', colorClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    case 'expired':
      return { text: 'Hết hạn', colorClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    case 'pending':
    default:
      return signedAtSeller
        ? { text: 'Đã ký (Chờ đối ứng)', colorClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' }
        : { text: 'Chờ ký', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
  }
};

const AUDIT_ACTIONS = [
  { value: 'user_registered', label: 'User Registered' },
  { value: 'user_login_success', label: 'Login Success' },
  { value: 'user_login_failed', label: 'Login Failed' },
  { value: 'user_logged_out', label: 'Logged Out' },
  { value: 'user_banned', label: 'User Banned' },
  { value: 'user_unbanned', label: 'User Unbanned' },
  { value: 'user_role_changed', label: 'User Role Changed' },
  { value: 'game_submitted', label: 'Game Submitted' },
  { value: 'game_approved', label: 'Game Approved' },
  { value: 'game_rejected', label: 'Game Rejected' },
  { value: 'game_published', label: 'Game Published' },
  { value: 'game_updated', label: 'Game Updated' },
  { value: 'contract_created', label: 'Contract Created' },
  { value: 'contract_signed', label: 'Contract Signed' },
  { value: 'contract_cancelled', label: 'Contract Cancelled' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'post_created', label: 'Post Created' },
  { value: 'comment_created', label: 'Comment Created' },
  { value: 'reaction_created', label: 'Reaction Created' },
  { value: 'chat_message_sent', label: 'Chat Message Sent' }
];

const AUDIT_TARGETS = [
  { value: 'user', label: 'User' },
  { value: 'game', label: 'Game' },
  { value: 'contract', label: 'Contract' },
  { value: 'community_chat', label: 'Community Post/Comment' },
  { value: 'chat_message', label: 'Direct Message' },
  { value: 'ai_report', label: 'AI Report' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'withdrawal', label: 'Withdrawal' }
];

const getActionBadgeClass = (action: string) => {
  if (!action) return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
  const lower = action.toLowerCase();
  if (lower.includes('success') || lower.includes('approved') || lower.includes('signed')) {
    return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
  }
  if (lower.includes('failed') || lower.includes('banned') || lower.includes('rejected') || lower.includes('cancelled') || lower.includes('alert')) {
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  }
  if (lower.includes('submitted') || lower.includes('created') || lower.includes('sent')) {
    return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
  }
  return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
};

export const AdminPage: React.FC<AdminPageProps> = ({
  setCurrentScreen,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'moderation' | 'users' | 'payments' | 'logs' | 'settings' | 'storage' | 'disputes' | 'withdrawal' | 'files'>('moderation');
  
  // Real Game Moderation state
  const [allGames, setAllGames] = useState<GameResponse[]>([]);
  const [pendingGames, setPendingGames] = useState<GameResponse[]>([]);
  const [contracts, setContracts] = useState<ContractResponse[]>([]);
  const pendingGamesCount = allGames.filter(g => g.status?.toLowerCase() === 'pending').length;
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(null);
  const [isOpenLightbox, setIsOpenLightbox] = useState<boolean>(false);

  // Real Marketplace Moderation state
  const [allMarketplaceItems, setAllMarketplaceItems] = useState<MarketplaceItemResponse[]>([]);
  const [pendingMarketplaceItems, setPendingMarketplaceItems] = useState<MarketplaceItemResponse[]>([]);
  const pendingMarketplaceCount = allMarketplaceItems.filter(item => item.status?.toLowerCase() === 'pending').length;
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState<boolean>(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [expandedMarketplaceId, setExpandedMarketplaceId] = useState<string | null>(null);
  const [moderationSubTab, setModerationSubTab] = useState<'games' | 'marketplace'>('games');
  const [gameStatusFilter, setGameStatusFilter] = useState<'pending' | 'approved' | 'published' | 'rejected' | 'all'>('pending');
  const [marketplaceStatusFilter, setMarketplaceStatusFilter] = useState<'pending' | 'active' | 'rejected' | 'removed' | 'all'>('pending');

  // Contract Offer states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameResponse | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<'view' | 'sign-admin'>('view');

  // Form states for creating contract
  const [buyerRepresentative, setBuyerRepresentative] = useState('');
  const [buyerPosition, setBuyerPosition] = useState('Ban quản trị hệ thống / Authorized Representative');
  const [sellerRepresentative, setSellerRepresentative] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerTaxCode, setSellerTaxCode] = useState('');
  const [lumpSumAmount, setLumpSumAmount] = useState('');
  const [revenueSplit, setRevenueSplit] = useState(70);
  const [disputeResolutionClause, setDisputeResolutionClause] = useState(
    'Mọi tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này sẽ được giải quyết trước tiên thông qua thương lượng thân thiện. Nếu không giải quyết được, tranh chấp sẽ được đưa ra giải quyết tại Trọng tài theo quy định.\nAny dispute arising out of or in connection with this contract shall first be resolved through friendly negotiations. If unresolved, it shall be referred to arbitration.'
  );
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [adminSignatureBase64, setAdminSignatureBase64] = useState<string | null>(null);

  const fetchPendingGamesAndContracts = async () => {
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const [gamesRes, contractsRes] = await Promise.all([
        gameApi.getAllGames(),
        contractApi.getAllContracts()
      ]);
      
      if (gamesRes.success && gamesRes.data) {
        setAllGames(gamesRes.data);
      } else {
        setGamesError(gamesRes.message || 'Failed to load pending games');
      }

      if (contractsRes.success && contractsRes.data) {
        setContracts(contractsRes.data);
      }
    } catch (err: any) {
      setGamesError(err.response?.data?.message || err.message || 'Failed to fetch moderation queue');
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    if (gameStatusFilter === 'all') {
      // Show all games except drafts (keep moderation clean)
      setPendingGames(allGames.filter(g => g.status?.toLowerCase() !== 'draft'));
    } else {
      setPendingGames(allGames.filter(g => g.status?.toLowerCase() === gameStatusFilter));
    }
  }, [allGames, gameStatusFilter]);

  const fetchPendingMarketplaceItems = async () => {
    setIsLoadingMarketplace(true);
    setMarketplaceError(null);
    try {
      const res = await marketplaceApi.getAllMarketplaceItems();
      if (res.success && res.data) {
        setAllMarketplaceItems(res.data);
      } else {
        setMarketplaceError(res.message || 'Failed to load marketplace items');
      }
    } catch (err: any) {
      setMarketplaceError(err.response?.data?.message || err.message || 'Failed to fetch marketplace submissions');
    } finally {
      setIsLoadingMarketplace(false);
    }
  };

  useEffect(() => {
    if (marketplaceStatusFilter === 'all') {
      setPendingMarketplaceItems(allMarketplaceItems);
    } else {
      setPendingMarketplaceItems(allMarketplaceItems.filter(item => item.status?.toLowerCase() === marketplaceStatusFilter));
    }
  }, [allMarketplaceItems, marketplaceStatusFilter]);


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
        setUsersError(response.message || 'Failed to load users');
      }
    } catch (err: any) {
      setUsersError(err.response?.data?.message || err.message || 'Failed to fetch users');
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
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterTargetType, setFilterTargetType] = useState<string>('');
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const [searchActorId, setSearchActorId] = useState<string>('');
  const [searchTargetId, setSearchTargetId] = useState<string>('');
  const [searchIpAddress, setSearchIpAddress] = useState<string>('');

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
        ipAddress: searchIpAddress.trim() || undefined
      };
      const res = await auditLogApi.getAuditLogs(params);
      if (res.success && res.data) {
        setAuditLogs(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      } else {
        setLogsError(res.message || 'Failed to load audit logs');
      }
    } catch (err: any) {
      setLogsError(err.response?.data?.message || err.message || 'Failed to fetch audit logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'moderation') {
      fetchPendingGamesAndContracts();
      fetchPendingMarketplaceItems();
    } else if (activeTab === 'logs') {
      fetchAuditLogs();
    }
  }, [activeTab, currentPage, pageSize, filterAction, filterTargetType]);

  const handleApplyTextFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setFilterAction('');
    setFilterTargetType('');
    setSearchActorId('');
    setSearchTargetId('');
    setSearchIpAddress('');
    setCurrentPage(0);
    setTimeout(() => {
      fetchAuditLogs();
    }, 50);
  };

  // Mock settings state
  const [commission, setCommission] = useState(15);
  const [maintenance, setMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState('GodotLaunch Matrix Engine Upgrade is complete!');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const handleApproveGame = async (game: GameResponse) => {
    if (!game.publishingType || game.publishingType === 'marketplace_listing') {
      if (!window.confirm(`Are you sure you want to APPROVE and publish "${game.title}"?`)) {
        return;
      }
      try {
        const res = await gameApi.approveGame(game.id);
        if (res.success) {
          alert(`Game "${game.title}" approved & published successfully!`);
          fetchPendingGamesAndContracts();
        } else {
          alert(res.message || 'Failed to approve game');
        }
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to approve game');
      }
    } else {
      // Contract-based game: Open contract creation modal directly upon approval!
      handleOpenContractModal(game);
    }
  };

  const handleRejectGame = async (id: string, title: string) => {
    const reason = window.prompt(`Enter rejection reason for "${title}":`, "Violated store policies");
    if (reason === null) return; // cancel
    try {
      const res = await gameApi.rejectGame(id, reason || "Violated store policies");
      if (res.success) {
        alert(`Game "${title}" rejected. Creator notified.`);
        fetchPendingGamesAndContracts();
      } else {
        alert(res.message || 'Failed to reject game');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to reject game');
    }
  };

  const handleApproveMarketplaceItem = async (item: MarketplaceItemResponse) => {
    if (!window.confirm(`Are you sure you want to APPROVE and activate the marketplace item "${item.title}"?`)) {
      return;
    }
    try {
      const res = await marketplaceApi.approveMarketplaceItem(item.id);
      if (res.success) {
        alert(`Marketplace item "${item.title}" approved & activated successfully!`);
        fetchPendingMarketplaceItems();
      } else {
        alert(res.message || 'Failed to approve marketplace item');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to approve marketplace item');
    }
  };

  const handleRejectMarketplaceItem = async (id: string, title: string) => {
    const reason = window.prompt(`Enter rejection reason for "${title}":`, "Violated store policies");
    if (reason === null) return; // cancel
    try {
      const res = await marketplaceApi.rejectMarketplaceItem(id, reason || "Violated store policies");
      if (res.success) {
        alert(`Marketplace item "${title}" rejected. Creator notified.`);
        fetchPendingMarketplaceItems();
      } else {
        alert(res.message || 'Failed to reject marketplace item');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to reject marketplace item');
    }
  };

  const handleOpenContractModal = (game: GameResponse) => {
    setSelectedGame(game);
    // Prefill details
    setBuyerRepresentative(currentUser?.fullName || 'Ban quản trị GodotLaunch');
    setBuyerPosition('Authorized Representative');
    setSellerRepresentative(game.creatorFullName || game.creatorName || '');
    setSellerAddress('');
    setSellerTaxCode('');
    setLumpSumAmount(game.priceProposed ? game.priceProposed.toString() : '');
    setRevenueSplit(70);
    setAdditionalTerms('');
    setAdminSignatureBase64(null);
    setIsContractModalOpen(true);
  };

  const handleCreateContractOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;
    if (!adminSignatureBase64) {
      alert('Vui lòng vẽ chữ ký của Admin trước khi gửi hợp đồng.');
      return;
    }

    try {
      const res = await contractApi.createOffer({
        gameId: selectedGame.id,
        contractType: selectedGame.publishingType === 'co_publishing' ? 'co_publishing' : 'full_acquisition',
        revenueSplit: selectedGame.publishingType === 'co_publishing' ? revenueSplit : undefined,
        lumpSumAmount: selectedGame.publishingType === 'full_acquisition' ? lumpSumAmount : undefined,
        disputeResolutionClause,
        additionalTerms: additionalTerms || undefined,
        buyerRepresentative,
        buyerPosition,
        sellerRepresentative,
        sellerAddress,
        sellerTaxCode,
        buyerSignatureBase64: adminSignatureBase64
      });

      if (res.success) {
        alert('Hợp đồng đề xuất đã được tạo thành công và gửi cho Developer!');
        setIsContractModalOpen(false);
        fetchPendingGamesAndContracts();
      } else {
        alert(res.message || 'Lỗi tạo hợp đồng');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi gửi yêu cầu tạo hợp đồng');
    }
  };

  const handleOpenSignModal = (contract: ContractResponse) => {
    setSelectedContract(contract);
    setAdminSignatureBase64(null);
    setIsSignModalOpen(true);
  };

  const handleCountersign = async () => {
    if (!selectedContract || !adminSignatureBase64) return;

    try {
      const res = await contractApi.signByAdmin(selectedContract.id, adminSignatureBase64);
      if (res.success) {
        alert('Đã ký đối ứng thành công! Hợp đồng hoàn tất và game đã được phê duyệt.');
        setIsSignModalOpen(false);
        fetchPendingGamesAndContracts();
      } else {
        alert(res.message || 'Lỗi ký đối ứng hợp đồng');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi thực hiện ký đối ứng');
    }
  };

  const handleAdminUserUpdate = async (input: AdminUserUpdateInput) => {
    const existingUser = users.find((user) => user.id === input.id);
    if (!existingUser) {
      throw new Error('User not found.');
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
        throw new Error(response.message || 'Failed to update user.');
      }

      const updatedUser = mapApiUserToAdminUser(response.data);
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === input.id ? updatedUser : user)),
      );
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to update user.');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 2000);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in py-2">
      
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase flex items-center gap-1.5 font-bold">
            <ShieldAlert size={12} /> SECURED SYSTEM ADMINISTRATION AREA
          </span>
          <h1 className="font-display font-bold text-2xl text-white pt-0.5">Admin Control Matrix</h1>
          <p className="text-xs text-slate-400 mt-1">Configure platform rates, moderate packages, manage user roles, and monitor live nodes</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              alert('Diagnostics run complete. Health metrics healthy.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-studio rounded-lg text-xs font-semibold cursor-pointer active:scale-95"
          >
            <RefreshCw size={13} /> Run Diagnostics
          </button>
        </div>
      </div>

      {/* Admin KPI Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <DollarSign size={12} className="text-sky-500" /> Gross volume sales
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">$14,842.20</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+8.4%</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Net fee earnings: ${(14842.2 * (commission/100)).toFixed(2)} ({commission}%)</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Users size={12} className="text-amber-500" /> Platform accounts
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{users.length} users</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">Live directory</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-tight">Synced from the admin user directory</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <FileCheck size={12} className="text-purple-500" /> Pending Moderation
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">
              {pendingGamesCount + pendingMarketplaceCount} items
            </span>
            {(pendingGamesCount > 0 || pendingMarketplaceCount > 0) && (
              <span className="text-[10px] text-amber-500 font-bold font-mono animate-pulse">Action required</span>
            )}
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-455 leading-tight">
            {pendingGamesCount} games / {pendingMarketplaceCount} marketplace assets
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Activity size={12} className="text-emerald-500" /> Node Infrastructure
          </span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-2xl font-display font-bold dark:text-white">99.98%</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-tight">API nodes healthy (US-West / SG-East)</p>
        </div>

      </div>

      {/* Navigation tabs for Admin screens */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-1.5 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'moderation' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <FileCheck size={14} /> Moderation Queue ({pendingGamesCount + pendingMarketplaceCount})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'users' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Users size={14} /> User Directory
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'payments' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <DollarSign size={14} /> Payments
        </button>
        <button
          onClick={() => setActiveTab('withdrawal')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'withdrawal' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <AlertTriangle size={14} /> Withdrawals
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'logs' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Terminal size={14} /> System Logs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'settings' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Settings size={14} /> Platform Settings
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'storage' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'}`}
        >
          <Database size={14} /> Storage
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'files' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'}`}
        >
          <HardDrive size={14} /> Quản lý File
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'disputes' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <AlertTriangle size={14} /> Disputes
        </button>
      </div>

      {/* Main Admin Tab Content Area */}
      <div className="bg-white/80 dark:bg-slate-900/45 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm min-h-[300px]">
        
        {/* Tab 1: Moderation Queue */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Asset Submission Queue</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review, test, and approve community-uploaded packages before they go public</p>
            </div>

            {/* Moderation Sub-Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800/60 gap-1 mb-4">
              <button
                onClick={() => setModerationSubTab('games')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-205 cursor-pointer ${
                  moderationSubTab === 'games'
                    ? 'bg-amber-400 text-slate-955 shadow-md font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Gamepad2 size={14} />
                Game Submissions
                <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md ${
                  moderationSubTab === 'games' ? 'bg-slate-955 text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {pendingGamesCount}
                </span>
              </button>
              <button
                onClick={() => setModerationSubTab('marketplace')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-205 cursor-pointer ${
                  moderationSubTab === 'marketplace'
                    ? 'bg-amber-400 text-slate-955 shadow-md font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ShoppingBag size={14} />
                Marketplace Submissions
                <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md ${
                  moderationSubTab === 'marketplace' ? 'bg-slate-955 text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400'
                }`}>
                  {pendingMarketplaceCount}
                </span>
              </button>
            </div>

            {moderationSubTab === 'games' && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/40 rounded-xl w-fit mb-4 border border-slate-200/60 dark:border-slate-800/60 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setGameStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    gameStatusFilter === 'pending'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Chờ duyệt ({allGames.filter(g => g.status?.toLowerCase() === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    gameStatusFilter === 'approved'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Đã duyệt ({allGames.filter(g => g.status?.toLowerCase() === 'approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter('published')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    gameStatusFilter === 'published'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Đã xuất bản ({allGames.filter(g => g.status?.toLowerCase() === 'published').length})
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    gameStatusFilter === 'rejected'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Đã từ chối ({allGames.filter(g => g.status?.toLowerCase() === 'rejected').length})
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    gameStatusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Tất cả ({allGames.filter(g => g.status?.toLowerCase() !== 'draft').length})
                </button>
              </div>
            )}

            {moderationSubTab === 'marketplace' && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/40 rounded-xl w-fit mb-4 border border-slate-200/60 dark:border-slate-800/60 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setMarketplaceStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    marketplaceStatusFilter === 'pending'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Chờ duyệt ({allMarketplaceItems.filter(i => i.status?.toLowerCase() === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplaceStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    marketplaceStatusFilter === 'active'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Đang hiển thị ({allMarketplaceItems.filter(i => i.status?.toLowerCase() === 'active').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplaceStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    marketplaceStatusFilter === 'rejected'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Đã từ chối ({allMarketplaceItems.filter(i => i.status?.toLowerCase() === 'rejected').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplaceStatusFilter('removed')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    marketplaceStatusFilter === 'removed'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Đã xóa ({allMarketplaceItems.filter(i => i.status?.toLowerCase() === 'removed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplaceStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    marketplaceStatusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Tất cả ({allMarketplaceItems.length})
                </button>
              </div>
            )}

            {moderationSubTab === 'games' ? (
              <>
                {isLoadingGames ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                    <RefreshCw className="animate-spin" size={18} /> Loading pending submissions...
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
                          <th className="p-3 text-center">Trạng thái HĐ</th>
                          <th className="p-3 text-center">Decisions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                        {pendingGames.length > 0 ? (
                          pendingGames.map(game => (
                            <React.Fragment key={game.id}>
                              <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors ${expandedGameId === game.id ? 'bg-slate-50/50 dark:bg-slate-950/20' : ''}`}>
                                <td className="p-3 w-10 text-center">
                                  <button
                                    onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                    title={expandedGameId === game.id ? "Hide Details" : "Show Details"}
                                  >
                                    {expandedGameId === game.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {game.title}
                                    {(() => {
                                      const s = game.status?.toLowerCase();
                                      switch (s) {
                                        case 'pending':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                                              Chờ duyệt
                                            </span>
                                          );
                                        case 'approved':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                              Đã duyệt
                                            </span>
                                          );
                                        case 'published':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                              Đã xuất bản
                                            </span>
                                          );
                                        case 'rejected':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                              Đã từ chối
                                            </span>
                                          );
                                        case 'draft':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                              Bản nháp
                                            </span>
                                          );
                                        default:
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                              {game.status}
                                            </span>
                                          );
                                      }
                                    })()}
                                    <button
                                      onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                                      className="text-slate-400 hover:text-amber-500 transition-colors"
                                      title="Quick View Content"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-455">by {game.creatorName}</div>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-350">{game.categoryName || 'Unassigned'}</td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                    game.publishingType === 'full_acquisition'
                                      ? 'bg-amber-450/10 text-amber-500 border-amber-500/20'
                                      : game.publishingType === 'co_publishing'
                                      ? 'bg-sky-450/10 text-sky-500 border-sky-500/20'
                                      : 'bg-slate-100 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                                  }`}>
                                    {game.publishingType ? game.publishingType.toUpperCase() : 'MARKETPLACE_LISTING'}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                  {game.priceProposed === 0 ? 'Miễn phí' : `${game.priceProposed.toLocaleString('vi-VN')} đ`}
                                </td>
                                <td className="p-3 text-center">
                                  {(() => {
                                    const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');
                                    if (!contract) {
                                      return (
                                        <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">Chưa tạo</span>
                                      );
                                    }
                                    const statusInfo = getContractStatusLabel(contract.status, contract.signedAtSeller);
                                    return (
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${statusInfo.colorClass}`}>
                                        {statusInfo.text}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="p-3 text-center">
                                  {(() => {
                                    const status = game.status?.toLowerCase();
                                    if (status === 'pending') {
                                      return (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => handleApproveGame(game)}
                                            className="p-1.5 bg-emerald-50 dark:bg-emerald-955/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-lg transition-studio border border-transparent dark:border-emerald-900/30 cursor-pointer"
                                            title="Duyệt game"
                                          >
                                            <Check size={14} />
                                          </button>
                                          <button
                                            onClick={() => handleRejectGame(game.id, game.title)}
                                            className="p-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-studio border border-transparent dark:border-rose-900/30 cursor-pointer"
                                            title="Từ chối game"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      );
                                    } else if (status === 'approved') {
                                      return (
                                        <div className="flex flex-col items-center justify-center gap-1">
                                          {(() => {
                                            const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');
                                            if (!contract) {
                                              return (
                                                <button
                                                  onClick={() => handleOpenContractModal(game)}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-955 font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
                                                >
                                                  <FileText size={12} />
                                                  Soạn Hợp đồng
                                                </button>
                                              );
                                            } else if ((contract.status === 'pending' || contract.status === 're_issued') && !contract.signedAtSeller) {
                                              return (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('view');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-505 bg-amber-500 hover:bg-amber-600 text-slate-955 font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
                                                >
                                                  <Eye size={12} />
                                                  Chờ Dev ký
                                                </button>
                                              );
                                            } else if ((contract.status === 'pending' || contract.status === 're_issued') && contract.signedAtSeller) {
                                              return (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('sign-admin');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-505 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-[10px] transition-studio cursor-pointer animate-pulse"
                                                >
                                                  <PenTool size={12} />
                                                  Ký đối ứng
                                                </button>
                                              );
                                            } else if (contract.status === 'negotiating') {
                                              return (
                                                <button
                                                  onClick={() => handleOpenContractModal(game)}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
                                                >
                                                  <Sliders size={12} />
                                                  Điều chỉnh HĐ
                                                </button>
                                              );
                                            } else {
                                              return (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('view');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
                                                >
                                                  <FileText size={12} />
                                                  Đã hoàn tất
                                                </button>
                                              );
                                            }
                                          })()}
                                        </div>
                                      );
                                    } else if (status === 'published') {
                                      return (
                                        <span className="text-blue-500 dark:text-blue-400 font-bold text-[10px]">Đã xuất bản</span>
                                      );
                                    } else if (status === 'rejected') {
                                      return (
                                        <span className="text-rose-500 dark:text-rose-400 font-bold text-[10px]">Đã từ chối</span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-slate-400 font-bold text-[10px]">-</span>
                                      );
                                    }
                                  })()}
                                </td>
                              </tr>
                              
                              {/* Expanded detail sub-row */}
                              {expandedGameId === game.id && (
                                <tr>
                                  <td colSpan={7} className="p-6 bg-slate-50/10 dark:bg-slate-950/20 border-t border-b border-slate-200/50 dark:border-slate-800/60">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-300">
                                      {/* Left Column: Thumbnail, Description, ZIP */}
                                      <div className="space-y-4">
                                        {(() => {
                                          const activeRejectedContract = [...contracts].reverse().find(c => c.gameId === game.id && (c.status === 'negotiating' || c.status === 'cancelled') && c.rejectionReason);
                                          if (activeRejectedContract) {
                                            const isNegotiating = activeRejectedContract.status === 'negotiating';
                                            return (
                                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs space-y-1">
                                                <span className="font-bold block">
                                                  {isNegotiating ? "Developer từ chối hợp đồng với lý do:" : "Hợp đồng trước đó bị từ chối:"}
                                                </span>
                                                <p className="italic text-[11px] text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-950/30 p-2 rounded border border-rose-500/10 break-words">
                                                  "{activeRejectedContract.rejectionReason}"
                                                </p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                        <div>
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                            <Image size={12} /> Thumbnail
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
                                                <Image size={32} className="mb-2 text-slate-650" />
                                                <span className="text-[10px] font-mono">NO THUMBNAIL</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <FileText size={12} className="text-amber-500" /> Mô tả chi tiết
                                          </h4>
                                          <div className="bg-slate-50/50 dark:bg-slate-955/20 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-inner">
                                            {!game.description ? (
                                              <div className="flex flex-col items-center justify-center py-4 text-slate-400 dark:text-slate-600 italic gap-1">
                                                <FileText size={18} className="stroke-[1.5]" />
                                                <span className="text-xs">Không có mô tả chi tiết từ developer.</span>
                                              </div>
                                            ) : (
                                              <p className="text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap text-slate-600 dark:text-slate-300 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                                {game.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Middle & Right Column: Screenshots & Video */}
                                      <div className="space-y-4 md:col-span-2 flex flex-col justify-between">
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Image size={12} className="text-amber-500" /> Ảnh chụp màn hình (Screenshots)
                                          </h4>
                                          {game.screenshots && game.screenshots.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                              {game.screenshots.map((url, index) => (
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
                                                    alt={`Screenshot ${index + 1}`} 
                                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                  />
                                                  <div className="absolute inset-0 bg-slate-955/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Eye size={16} className="text-white" />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                              <Image size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                              <span className="text-[10px]">Developer không tải lên screenshot nào</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Video Gameplay */}
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Video size={12} className="text-amber-500" /> Video Gameplay Demo
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
                                              <Video size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                              <span className="text-[10px]">Developer không tải lên video gameplay nào</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-6 border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
                                      <AiReviewReportCard gameId={game.id} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium">
                              🎉 Clean slate! No pending submissions to moderate.
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
                    <RefreshCw className="animate-spin" size={18} /> Loading pending marketplace items...
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
                          pendingMarketplaceItems.map(item => (
                            <React.Fragment key={item.id}>
                              <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/5 transition-colors ${expandedMarketplaceId === item.id ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''}`}>
                                <td className="p-3 w-10 text-center">
                                  <button
                                    onClick={() => setExpandedMarketplaceId(expandedMarketplaceId === item.id ? null : item.id)}
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                    title={expandedMarketplaceId === item.id ? "Hide Details" : "Show Details"}
                                  >
                                    {expandedMarketplaceId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {item.title}
                                    {(() => {
                                      const s = item.status?.toLowerCase();
                                      switch (s) {
                                        case 'pending':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                                              Chờ duyệt
                                            </span>
                                          );
                                        case 'active':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                              Đang hiển thị
                                            </span>
                                          );
                                        case 'rejected':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                              Đã từ chối
                                            </span>
                                          );
                                        case 'removed':
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                              Đã xóa
                                            </span>
                                          );
                                        default:
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                              {item.status}
                                            </span>
                                          );
                                      }
                                    })()}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-455">by {item.sellerFullName || item.sellerEmail}</div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                    item.itemType === 'source_code'
                                      ? 'bg-sky-450/10 text-sky-500 border-sky-500/20'
                                      : 'bg-emerald-450/10 text-emerald-500 border-emerald-500/20'
                                  }`}>
                                    {item.itemType === 'source_code' ? 'SOURCE CODE' : 'RESOURCE ASSET'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-355">{item.categoryName || 'Unassigned'}</td>
                                <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                  {item.price === 0 ? 'Miễn phí' : `${item.price.toLocaleString('vi-VN')} đ`}
                                </td>
                                <td className="p-3 text-center">
                                  {(() => {
                                    const s = item.status?.toLowerCase();
                                    if (s === 'pending') {
                                      return (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => handleApproveMarketplaceItem(item)}
                                            className="p-1.5 bg-emerald-50 dark:bg-emerald-955/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-lg transition-studio border border-transparent dark:border-emerald-900/30 cursor-pointer"
                                            title="Approve Asset"
                                          >
                                            <Check size={14} />
                                          </button>
                                          <button
                                            onClick={() => handleRejectMarketplaceItem(item.id, item.title)}
                                            className="p-1.5 bg-rose-50 dark:bg-rose-955/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-studio border border-transparent dark:border-rose-900/30 cursor-pointer"
                                            title="Reject Asset"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      );
                                    } else if (s === 'active') {
                                      return (
                                        <span className="text-emerald-555 dark:text-emerald-400 font-bold text-[10px]">Đã hiển thị</span>
                                      );
                                    } else if (s === 'rejected') {
                                      return (
                                        <span className="text-rose-555 dark:text-rose-400 font-bold text-[10px]">Đã từ chối</span>
                                      );
                                    } else if (s === 'removed') {
                                      return (
                                        <span className="text-slate-400 font-bold text-[10px]">Đã xóa</span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-slate-400 font-bold text-[10px]">-</span>
                                      );
                                    }
                                  })()}
                                </td>
                              </tr>
                              
                              {/* Expanded row for marketplace item details */}
                              {expandedMarketplaceId === item.id && (
                                <tr>
                                  <td colSpan={6} className="p-6 bg-slate-50/10 dark:bg-slate-900/20 border-t border-b border-slate-200/50 dark:border-slate-800/60">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-300">
                                      {/* Left Column: Thumbnail, Description, ZIP */}
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                            <Image size={12} /> Thumbnail
                                          </h4>
                                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 aspect-video bg-slate-900 flex items-center justify-center">
                                            {item.thumbnailUrl ? (
                                              <img 
                                                src={item.thumbnailUrl} 
                                                alt={item.title} 
                                                className="object-cover w-full h-full"
                                              />
                                            ) : (
                                              <div className="flex flex-col items-center justify-center text-slate-500">
                                                <Image size={32} className="mb-2 text-slate-650" />
                                                <span className="text-[10px] font-mono">NO THUMBNAIL</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-1.5">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Item Description</h4>
                                          <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                            {item.description || "No description provided."}
                                          </p>
                                        </div>

                                        {item.fileUrl ? (
                                          <a 
                                            href={item.fileUrl} 
                                            download 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-amber-450 hover:bg-amber-500 text-slate-955 font-bold rounded-xl text-xs transition-studio active:scale-[0.98]"
                                          >
                                            <Download size={14} /> Download Asset Package (ZIP)
                                          </a>
                                        ) : (
                                          <div className="text-center py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                                            No file package uploaded for this asset
                                          </div>
                                        )}
                                      </div>

                                      {/* Middle Column: Screenshots & Video */}
                                      <div className="space-y-4 flex flex-col justify-between">
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Image size={12} className="text-amber-500" /> Screenshots
                                          </h4>
                                          {item.screenshots && item.screenshots.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                              {item.screenshots.map((url, index) => (
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
                                                    alt={`Screenshot ${index + 1}`} 
                                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                  />
                                                  <div className="absolute inset-0 bg-slate-955/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Eye size={16} className="text-white" />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                              <Image size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                              <span className="text-[10px]">No screenshots uploaded</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Video Demo */}
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                            <Video size={12} className="text-amber-500" /> Video Demo
                                          </h4>
                                          {item.videoUrl ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-955 max-h-56">
                                              <video 
                                                src={item.videoUrl} 
                                                controls 
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                              <Video size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                              <span className="text-[10px]">No demo video uploaded</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right Column: Specifications, Creator Details & License info */}
                                      <div className="space-y-4">
                                        <div className="space-y-3.5 bg-white/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5">Technical & Creator Details</h4>
                                          <div className="space-y-2 text-xs">
                                            <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                              <span className="text-slate-500">Creator Name</span>
                                              <span className="font-semibold">{item.sellerFullName || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                              <span className="text-slate-500">Creator Email</span>
                                              <span className="font-mono">{item.sellerEmail}</span>
                                            </div>
                                            {item.itemType === 'source_code' && (
                                              <>
                                                <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                  <span className="text-slate-500">Godot Version</span>
                                                  <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">{item.godotVersion || 'N/A'}</span>
                                                </div>
                                                {item.githubRepoUrl && (
                                                  <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                    <span className="text-slate-500">GitHub Repository</span>
                                                    <a 
                                                      href={item.githubRepoUrl} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      className="font-mono text-sky-500 hover:underline break-all max-w-[200px]"
                                                    >
                                                      {item.githubRepoUrl}
                                                    </a>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                            {item.sourceGameTitle && (
                                              <div className="flex justify-between border-b border-slate-105 dark:border-slate-800/50 pb-1.5">
                                                <span className="text-slate-500">Linked Store Game</span>
                                                <span className="font-semibold text-amber-500">{item.sourceGameTitle}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between pb-0.5">
                                              <span className="text-slate-500">Submitted On</span>
                                              <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-6 border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
                                      <AiReviewReportCard itemId={item.id} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium">
                              🎉 Clean slate! No pending marketplace submissions to moderate.
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
        {activeTab === 'payments' && <AdminPaymentVerificationPanel />}

        {/* Tab 2: User Directory */}
        {activeTab === 'users' && (
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
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Security Audit Logs</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track and monitor security events, administrative decisions, and user authentications</p>
            </div>

            {/* Filter Panel */}
            <form onSubmit={handleApplyTextFilters} className="bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-md p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 space-y-5 shadow-sm transition-studio">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Action Filter */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-bold">Action</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionDropdownOpen(!isActionDropdownOpen);
                      setIsTargetDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-xs text-left outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-slate-800 dark:text-slate-200 transition-studio shadow-sm cursor-pointer"
                  >
                    <span className="truncate">
                      {filterAction ? AUDIT_ACTIONS.find(act => act.value === filterAction)?.label || filterAction : 'All Actions'}
                    </span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isActionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isActionDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-45" onClick={() => setIsActionDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-60 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xl py-1.5 divide-y divide-slate-105 dark:divide-slate-800/40 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterAction('');
                            setCurrentPage(0);
                            setIsActionDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-400 hover:text-slate-950 transition-colors ${!filterAction ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          All Actions
                        </button>
                        {AUDIT_ACTIONS.map(act => (
                          <button
                            key={act.value}
                            type="button"
                            onClick={() => {
                              setFilterAction(act.value);
                              setCurrentPage(0);
                              setIsActionDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-400 hover:text-slate-950 transition-colors ${filterAction === act.value ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
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
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-bold">Target Type</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTargetDropdownOpen(!isTargetDropdownOpen);
                      setIsActionDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-xs text-left outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-slate-800 dark:text-slate-200 transition-studio shadow-sm cursor-pointer"
                  >
                    <span className="truncate">
                      {filterTargetType ? AUDIT_TARGETS.find(t => t.value === filterTargetType)?.label || filterTargetType : 'All Targets'}
                    </span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isTargetDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTargetDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-45" onClick={() => setIsTargetDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-60 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xl py-1.5 divide-y divide-slate-105 dark:divide-slate-800/40 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterTargetType('');
                            setCurrentPage(0);
                            setIsTargetDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-400 hover:text-slate-950 transition-colors ${!filterTargetType ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          All Targets
                        </button>
                        {AUDIT_TARGETS.map(t => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              setFilterTargetType(t.value);
                              setCurrentPage(0);
                              setIsTargetDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-400 hover:text-slate-950 transition-colors ${filterTargetType === t.value ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
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
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-bold">Actor ID (UUID)</label>
                  <input
                    type="text"
                    placeholder="Enter User ID..."
                    value={searchActorId}
                    onChange={(e) => setSearchActorId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-slate-800 dark:text-slate-200 transition-studio placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>

                {/* Target ID Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-bold">Target ID (UUID)</label>
                  <input
                    type="text"
                    placeholder="Enter Target ID..."
                    value={searchTargetId}
                    onChange={(e) => setSearchTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-slate-800 dark:text-slate-200 transition-studio placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>

                {/* IP Address Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-bold">IP Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 127.0.0.1"
                    value={searchIpAddress}
                    onChange={(e) => setSearchIpAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-slate-800 dark:text-slate-200 transition-studio placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-studio active:scale-95 shadow-sm"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 hover:text-black font-bold rounded-xl text-xs shadow-md shadow-amber-400/10 hover:shadow-amber-400/20 transition-studio active:scale-95 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Error or Loader */}
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                <RefreshCw className="animate-spin" size={18} /> Loading audit logs...
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
                        auditLogs.map(log => (
                          <React.Fragment key={log.id}>
                            <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/5 transition-colors ${expandedLogId === log.id ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                  title="View JSON Payload Diff"
                                >
                                  {expandedLogId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </td>
                              <td className="p-3">
                                <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200">
                                  {new Date(log.createdAt).toLocaleString()}
                                </div>
                                <div className="text-[9px] text-slate-400 dark:text-slate-550 font-mono mt-0.5">
                                  IP: {log.ipAddress || 'Unknown'}
                                </div>
                              </td>
                              <td className="p-3">
                                {log.actorEmail ? (
                                  <div className="font-semibold text-slate-850 dark:text-slate-200">
                                    {log.actorEmail}
                                  </div>
                                ) : (
                                  <div className="italic text-slate-450">Anonymous / System</div>
                                )}
                                {log.actorId && (
                                  <div className="font-mono text-[9px] text-slate-450 dark:text-slate-500 mt-0.5" title={log.actorId}>
                                    <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase mr-1 select-none">ID:</span>
                                    <span className="select-all break-all">{log.actorId}</span>
                                  </div>
                                )}
                                <span className="inline-block mt-1 px-1.5 py-0.2 bg-slate-105 dark:bg-slate-950 text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded font-mono">
                                  {log.actorRole ? log.actorRole.toUpperCase() : 'UNKNOWN'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getActionBadgeClass(log.action)}`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-655 dark:text-slate-400">
                                  Type: {log.targetType}
                                </div>
                                {log.targetId && (
                                  <div className="font-mono text-[9px] text-slate-450 dark:text-slate-500 mt-0.5" title={log.targetId}>
                                    <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase mr-1 select-none">Ref ID:</span>
                                    <span className="select-all break-all">{log.targetId}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">
                                {log.note || 'No notes'}
                              </td>
                            </tr>

                            {/* Expanded Data Diff Sub-Row */}
                            {expandedLogId === log.id && (
                              <tr>
                                <td colSpan={6} className="p-4 bg-slate-50/20 dark:bg-slate-900/30 border-t border-b border-slate-200/50 dark:border-slate-800/55">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Old Value (Before)</span>
                                      <pre className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-x-auto text-[10px] text-slate-800 dark:text-slate-300 max-h-48 leading-normal">
                                        {log.oldValue ? (
                                          (() => {
                                            try {
                                              return JSON.stringify(JSON.parse(log.oldValue), null, 2);
                                            } catch (e) {
                                              return log.oldValue;
                                            }
                                          })()
                                        ) : 'NULL'}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">New Value (After)</span>
                                      <pre className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-x-auto text-[10px] text-slate-800 dark:text-slate-300 max-h-48 leading-normal">
                                        {log.newValue ? (
                                          (() => {
                                            try {
                                              return JSON.stringify(JSON.parse(log.newValue), null, 2);
                                            } catch (e) {
                                              return log.newValue;
                                            }
                                          })()
                                        ) : 'NULL'}
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
                          <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium">
                            No audit logs found matching the selected filters.
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
                      Page {currentPage + 1} of {totalPages} ({totalElements} logs)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0 || isLoadingLogs}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold transition-studio disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage >= totalPages - 1 || isLoadingLogs}
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
        {activeTab === 'storage' && <AdminStoragePanel />}
        {activeTab === 'disputes' && <AdminDisputePanel />}
        {activeTab === 'withdrawal' && <AdminWithdrawalPanel />}
        {activeTab === 'files' && <AdminFileManagementPanel />}


        {/* Tab 4: Platform Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Platform Parameters Config</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modify global payout percentages, alert headers, and maintenance statuses</p>
            </div>

            {settingsSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-500 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <Check size={14} /> System variables successfully updated. Node servers reloading...
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Platform Commission rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={(e) => setCommission(parseInt(e.target.value) || 0)}
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
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${maintenance ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenance ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {maintenance ? 'ACTIVE - Site Locked' : 'INACTIVE - Online'}
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
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold">Warning: Maintenance mode is active.</span>
<span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal block mt-0.5">This locks non-admin users out of performing checkouts, uploading files, or sync repos. Use with care.</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="md" type="submit" icon={<Sliders size={16} />}>
                  Save Platform Variable Config
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>


      {/* Contract Creation Modal */}
      {isContractModalOpen && selectedGame && createPortal(
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
                  Nhập các điều khoản phát hành cho trò chơi "{selectedGame.title}"
                </p>
              </div>
            </div>

            {/* Display previous rejection reason if exists */}
            {(() => {
              const activeRejectedContract = [...contracts].reverse().find(c => c.gameId === selectedGame.id && (c.status === 'negotiating' || c.status === 'cancelled') && c.rejectionReason);
              if (activeRejectedContract) {
                const isNegotiating = activeRejectedContract.status === 'negotiating';
                return (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2 text-xs text-rose-600 dark:text-rose-450">
                    <span className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                      <AlertTriangle size={15} /> {isNegotiating ? "Lý do Developer từ chối ký hợp đồng:" : "Hợp đồng trước đó bị Developer từ chối:"}
                    </span>
                    <p className="italic bg-white/70 dark:bg-slate-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/20 text-slate-800 dark:text-slate-200 leading-normal break-words shadow-sm">
                      "{activeRejectedContract.rejectionReason}"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Người đại diện Bên A (Họ và Tên)"
                    value={buyerRepresentative}
                    onChange={(e) => setBuyerRepresentative(e.target.value)}
                    required
                  />
                  <Input
                    label="Chức vụ"
                    value={buyerPosition}
                    onChange={(e) => setBuyerPosition(e.target.value)}
                    required
                  />
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
                
                {selectedGame.publishingType === 'co_publishing' ? (
                  <Input
                    label="Tỷ lệ chia sẻ doanh thu cho Developer (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={revenueSplit}
                    onChange={(e) => setRevenueSplit(parseInt(e.target.value) || 0)}
                    helperText="Ví dụ: 70 có nghĩa là Developer nhận 70% và Platform nhận 30% doanh thu phát hành"
                    required
                  />
                ) : (
                  <Input
                    label="Số tiền mua đứt trọn gói (VNĐ)"
                    placeholder="Ví dụ: 100.000.000đ"
                    value={lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(e.target.value)}
                    helperText="Số tiền thanh toán một lần để mua toàn bộ quyền sở hữu trò chơi"
                    required
                  />
                )}
              </div>

              {/* Điều khoản pháp lý bổ sung */}
              <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="w-1.5 h-3 rounded bg-sky-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                    ĐIỀU KHOẢN PHÁP LÝ & BỔ SUNG
                  </span>
                </div>
                <TextArea
                  label="Điều khoản giải quyết tranh chấp (Dispute Resolution)"
                  value={disputeResolutionClause}
                  onChange={(e) => setDisputeResolutionClause(e.target.value)}
                  rows={8}
                  required
                />

                <TextArea
                  label="Điều khoản bổ sung (Tùy chọn)"
                  placeholder="Nhập thêm các điều khoản cam kết đặc biệt nếu có..."
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Chữ ký của Admin */}
              <div className="p-5 bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="w-1.5 h-3 rounded bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                    CHỮ KÝ CỦA ADMIN <span className="text-rose-500">*</span>
                  </span>
                </div>
                <div className="space-y-2">
                  <SignaturePad
                    onChange={setAdminSignatureBase64}
                    placeholder="Dùng chuột để vẽ chữ ký của bạn..."
                  />
                </div>
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
                  className="cursor-pointer"
                >
                  Gửi đề nghị & Tạo Hợp đồng
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Universal Contract Viewer & Countersigning Modal */}
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
          onSignAdmin={async (sig) => {
            try {
              const res = await contractApi.signByAdmin(selectedContract.id, sig);
              return { success: res.success, message: res.message };
            } catch (err: any) {
              return { success: false, message: err.response?.data?.message || err.message || 'Lỗi ký đối ứng' };
            }
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

    </>
  );
};
