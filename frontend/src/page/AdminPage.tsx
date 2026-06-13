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
  UserMinus, 
  UserCheck, 
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Video,
  Image,
  FileText,
  PenTool,
  Gamepad2,
  ShoppingBag
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { User, GameResponse, ContractResponse, MarketplaceItemResponse } from '../types';
import { userApi } from '../api/userApi';
import { gameApi } from '../api/gameApi';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { SignaturePad } from '../components/SignaturePad';
import { ContractViewerModal } from '../components/ContractViewerModal';

interface PendingAsset {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  date: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'developer' | 'customer';
  status: 'active' | 'suspended' | 'inactive' | 'banned';
}

interface AdminPageProps {
  setCurrentScreen: (screen: any) => void;
  currentUser: User | null;
}

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

export const AdminPage: React.FC<AdminPageProps> = ({
  setCurrentScreen,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'moderation' | 'users' | 'logs' | 'settings'>('moderation');
  
  // Real Game Moderation state
  const [pendingGames, setPendingGames] = useState<GameResponse[]>([]);
  const [contracts, setContracts] = useState<ContractResponse[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(null);
  const [isOpenLightbox, setIsOpenLightbox] = useState<boolean>(false);

  // Real Marketplace Moderation state
  const [pendingMarketplaceItems, setPendingMarketplaceItems] = useState<MarketplaceItemResponse[]>([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState<boolean>(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [expandedMarketplaceId, setExpandedMarketplaceId] = useState<string | null>(null);
  const [moderationSubTab, setModerationSubTab] = useState<'games' | 'marketplace'>('games');

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
        const filtered = gamesRes.data.filter((game: GameResponse) => 
          game.status?.toLowerCase() === 'pending' || 
          game.status?.toLowerCase() === 'approved'
        );
        setPendingGames(filtered);
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

  const fetchPendingMarketplaceItems = async () => {
    setIsLoadingMarketplace(true);
    setMarketplaceError(null);
    try {
      const res = await marketplaceApi.getAllMarketplaceItems('pending');
      if (res.success && res.data) {
        setPendingMarketplaceItems(res.data);
      } else {
        setMarketplaceError(res.message || 'Failed to load pending marketplace items');
      }
    } catch (err: any) {
      setMarketplaceError(err.response?.data?.message || err.message || 'Failed to fetch marketplace submissions');
    } finally {
      setIsLoadingMarketplace(false);
    }
  };


  // Mock Users state (initial fallback)
  const [users, setUsers] = useState<AdminUser[]>([
    { id: 'u1', username: 'Cuong78', email: 'admin@godotlaunch.com', fullName: 'Cuong Admin', role: 'admin', status: 'active' },
    { id: 'u2', username: 'NeoArtisans', email: 'neo@artisans.com', fullName: 'Neo Artisans', role: 'developer', status: 'active' },
    { id: 'u3', username: 'LofiDev', email: 'lofi@dev.com', fullName: 'Lofi Dev', role: 'developer', status: 'active' },
    { id: 'u4', username: 'SlyGamer', email: 'sly@gamer.com', fullName: 'Sly Gamer', role: 'customer', status: 'active' },
    { id: 'u5', username: 'SpamBot99', email: 'spam@bot.com', fullName: 'Spam Bot', role: 'customer', status: 'suspended' }
  ]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const response = await userApi.getAllUsers();
      if (response.success && response.data) {
        const mappedUsers: AdminUser[] = response.data.map((u: any) => ({
          id: u.id || '',
          username: u.username || u.email || '',
          email: u.email || '',
          fullName: u.fullName || '',
          role: (u.roleName?.toLowerCase() as any) || 'customer',
          status: u.status === 'active' ? 'active' : u.status === 'banned' ? 'banned' : 'inactive'
        }));
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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'moderation') {
      fetchPendingGamesAndContracts();
      fetchPendingMarketplaceItems();
    }
  }, [activeTab]);

  // Mock settings state
  const [commission, setCommission] = useState(15);
  const [maintenance, setMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState('GodotLaunch Matrix Engine Upgrade is complete!');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Mock System Logs state
  const [logs, setLogs] = useState<string[]>([
    `[11:02:14] [SYSTEM] API Gateway successfully scaled to 3 container node nodes.`,
    `[11:03:02] [DATABASE] Connected to Postgres Cloud cluster - Latency: 4ms.`,
    `[11:04:45] [AUTH] Token issue request approved for user "NeoArtisans" (developer).`,
    `[11:08:12] [BILLING] Payout batch #492 processed successfully: $4,842.20 distributed.`,
    `[11:15:33] [WEBSOCKET] Client handshake completed: 184 concurrent creator connections.`
  ]);

  // Add random logs simulator
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'logs') {
        const services = ['SYSTEM', 'DATABASE', 'AUTH', 'WEBSOCKET', 'ASSETS'];
        const msgs = [
          'Memory compaction run completed. Cleared 284MB.',
          'Database check completed. 0 locks active.',
          'User session heartbeats synchronized.',
          'New asset upload payload signature verified.',
          'Marketplace index rebuild completed in 142ms.'
        ];
        const randomService = services[Math.floor(Math.random() * services.length)];
        const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
        const time = new Date().toTimeString().split(' ')[0];
        setLogs(prev => [`[${time}] [${randomService}] ${randomMsg}`, ...prev.slice(0, 15)]);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [activeTab]);

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
    setLumpSumAmount('');
    setRevenueSplit(70);
    setAdditionalTerms('');
    setIsContractModalOpen(true);
  };

  const handleCreateContractOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;

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
        sellerTaxCode
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

  const handleToggleUserRole = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    const nextRole = userToUpdate.role === 'admin' ? 'developer' : userToUpdate.role === 'developer' ? 'customer' : 'admin';
    
    try {
      const response = await userApi.updateUser(id, {
        fullName: userToUpdate.fullName || userToUpdate.username,
        roleName: nextRole,
        status: userToUpdate.status === 'suspended' ? 'banned' : userToUpdate.status === 'active' ? 'active' : 'inactive'
      });
      if (response.success) {
        setUsers(users.map(u => {
          if (u.id === id) {
            return {
              ...u,
              role: nextRole
            };
          }
          return u;
        }));
      } else {
        alert(response.message || 'Failed to update user role');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    const nextStatus = userToUpdate.status === 'active' ? 'banned' : 'active';

    try {
      const response = await userApi.updateUser(id, {
        fullName: userToUpdate.fullName || userToUpdate.username,
        roleName: userToUpdate.role,
        status: nextStatus
      });
      if (response.success) {
        setUsers(users.map(u => {
          if (u.id === id) {
            return {
              ...u,
              status: nextStatus === 'active' ? 'active' : 'suspended'
            };
          }
          return u;
        }));
      } else {
        alert(response.message || 'Failed to update user status');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This will soft-delete their account.")) {
      return;
    }

    try {
      const response = await userApi.deleteUser(id);
      if (response.success) {
        setUsers(users.filter(u => u.id !== id));
        alert("User soft-deleted successfully.");
      } else {
        alert(response.message || "Failed to delete user");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete user");
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
              const time = new Date().toTimeString().split(' ')[0];
              setLogs(prev => [`[${time}] [SYSTEM] Force manual telemetry diagnostics successfully run.`, ...prev]);
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
            <span className="text-2xl font-display font-bold dark:text-white">{users.length * 280 + 32} users</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+32 today</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-tight">Active sessions: 184 creators online</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <FileCheck size={12} className="text-purple-500" /> Pending Moderation
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">
              {pendingGames.length + pendingMarketplaceItems.length} items
            </span>
            {(pendingGames.length > 0 || pendingMarketplaceItems.length > 0) && (
              <span className="text-[10px] text-amber-500 font-bold font-mono animate-pulse">Action required</span>
            )}
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-tight">
            {pendingGames.length} games / {pendingMarketplaceItems.length} marketplace assets
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
          <FileCheck size={14} /> Moderation Queue ({pendingGames.length + pendingMarketplaceItems.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'users' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Users size={14} /> User Directory
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
            <div className="flex bg-slate-100 dark:bg-slate-955 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800/60 gap-1 mb-4">
              <button
                onClick={() => setModerationSubTab('games')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-205 cursor-pointer ${
                  moderationSubTab === 'games'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Gamepad2 size={14} />
                Game Submissions
                <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md ${
                  moderationSubTab === 'games' ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {pendingGames.length}
                </span>
              </button>
              <button
                onClick={() => setModerationSubTab('marketplace')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-205 cursor-pointer ${
                  moderationSubTab === 'marketplace'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ShoppingBag size={14} />
                Marketplace Submissions
                <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md ${
                  moderationSubTab === 'marketplace' ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400'
                }`}>
                  {pendingMarketplaceItems.length}
                </span>
              </button>
            </div>

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
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                      game.status?.toLowerCase() === 'pending'
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    }`}>
                                      {game.status?.toLowerCase() === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                                    </span>
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
                                  {game.priceProposed === 0 ? 'Free' : `$${game.priceProposed}`}
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
                                  {game.status?.toLowerCase() === 'pending' ? (
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
                                  ) : (
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
                                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-955 font-bold rounded-lg text-[10px] transition-studio cursor-pointer"
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
                                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-[10px] transition-studio cursor-pointer animate-pulse"
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
                                  )}
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
                                        
                                        <div className="space-y-1.5">
                                          <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Mô tả chi tiết</h4>
                                          <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                            {game.description || "Không có mô tả chi tiết từ developer."}
                                          </p>
                                        </div>
                                        
                                        {game.fileUrl ? (
                                          <a 
                                            href={game.fileUrl} 
                                            download 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-amber-450 hover:bg-amber-500 text-slate-955 font-bold rounded-xl text-xs transition-studio active:scale-[0.98]"
                                          >
                                            <Download size={14} /> Download Game Package (ZIP)
                                          </a>
                                            ) : (
                                          <div className="text-center py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                                            Không tìm thấy tệp game ZIP để tải về
                                          </div>
                                        )}
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
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
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
                              <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-955/5 transition-colors ${expandedMarketplaceId === item.id ? 'bg-slate-50/50 dark:bg-slate-955/20' : ''}`}>
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
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                                      Pending
                                    </span>
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
                                  {item.price === 0 ? 'Free' : `$${item.price}`}
                                </td>
                                <td className="p-3 text-center">
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
                                </td>
                              </tr>
                              
                              {/* Expanded row for marketplace item details */}
                              {expandedMarketplaceId === item.id && (
                                <tr>
                                  <td colSpan={6} className="p-6 bg-slate-50/10 dark:bg-slate-955/20 border-t border-b border-slate-200/50 dark:border-slate-800/60">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-700 dark:text-slate-300">
                                      {/* Left Column: Details & Description */}
                                      <div className="space-y-4">
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

                                      {/* Right Column: Specifications & Links */}
                                      <div className="space-y-3.5 bg-white/30 dark:bg-slate-955/10 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
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
        {/* Tab 2: User Directory */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Account Database Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modify credentials, adjust user permissions, or suspend access keys</p>
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                <RefreshCw className="animate-spin" size={18} /> Loading platform users...
              </div>
            ) : usersError ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                Error loading users: {usersError}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                      <th className="p-3">User</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Access Level</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">@{u.username}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-350">{u.email}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            u.role === 'admin' 
                              ? 'bg-amber-450/10 text-amber-500 border-amber-500/20' 
                              : u.role === 'developer'
                              ? 'bg-sky-450/10 text-sky-500 border-sky-500/20'
                              : 'bg-slate-100 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 font-bold ${u.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleUserRole(u.id)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded border border-slate-250 dark:border-slate-800 font-semibold transition-studio cursor-pointer"
                            >
                              Toggle Role
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              className={`p-1 rounded cursor-pointer transition-studio ${
                                u.status === 'active' 
                                  ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100' 
                                  : 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                              }`}
                              title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                            >
                              {u.status === 'active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 rounded cursor-pointer transition-studio bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Real-time Node Telemetry Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Read logs emitted by system clusters and microservices</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live streaming active
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 space-y-1.5 max-h-80 overflow-y-auto shadow-inner leading-relaxed">
              {logs.map((log, idx) => (
                <div key={idx} className="hover:bg-slate-900/50 py-0.5 rounded px-1 transition-colors">
                  <span className="text-slate-500">[{idx + 1}]</span> {log}
                </div>
              ))}
            </div>
          </div>
        )}

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
                    label="Số tiền mua đứt trọn gói (USD)"
                    placeholder="Ví dụ: $10,000"
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

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button"
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer transition-studio"
                  onClick={() => setIsContractModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <Button variant="primary" size="md" type="submit" icon={<FileCheck size={16} />}>
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
