import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Check, 
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
  DollarSign
} from 'lucide-react';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { Input } from '../components/Input';
import { Asset, Project, User, GameResponse, ContractResponse, MarketplaceItemResponse, WalletResponse, TransactionResponse, WithdrawalRequestResponse } from '../types';
import { gameApi } from '../api/gameApi';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { walletApi } from '../api/walletApi';
import { SignaturePad } from '../components/SignaturePad';
import { ContractViewerModal } from '../components/ContractViewerModal';

interface DashboardPageProps {
  currentUser: User | null;
  financeStats: {
    totalRevenue: number;
    activePlayers: number;
    listedCount: number;
  };
  assets: Asset[];
  projectRepositories: Project[];
  setCurrentScreen: (screen: any) => void;
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

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  financeStats,
  assets,
  projectRepositories,
  setCurrentScreen
}) => {
  // Tab control: 'my-games' | 'marketplace-items' | 'git-repos' | 'wallet'
  const [activeTab, setActiveTab] = useState<'my-games' | 'marketplace-items' | 'git-repos' | 'wallet'>('my-games');

  // Wallet states
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [totalPagesTxn, setTotalPagesTxn] = useState<number>(0);
  const [currentTxnPage, setCurrentTxnPage] = useState<number>(0);
  const [isLoadingTxns, setIsLoadingTxns] = useState<boolean>(false);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestResponse[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState<boolean>(false);

  // Form states for creating a withdrawal request
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState<boolean>(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null);

  // Inner tab for Wallet section: 'transactions' | 'withdrawals'
  const [walletSubTab, setWalletSubTab] = useState<'transactions' | 'withdrawals'>('transactions');

  // Real Game list state
  const [myGames, setMyGames] = useState<GameResponse[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(null);

  // Real Marketplace Items state
  const [myMarketplaceItems, setMyMarketplaceItems] = useState<MarketplaceItemResponse[]>([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState<boolean>(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [isOpenLightbox, setIsOpenLightbox] = useState<boolean>(false);

  // Contract integration states
  const [contracts, setContracts] = useState<ContractResponse[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState<boolean>(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [selectedContract, setSelectedContract] = useState<ContractResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewerMode, setViewerMode] = useState<'view' | 'sign-developer'>('view');

  // Form fields for Developer Signature
  const [sellerRepresentative, setSellerRepresentative] = useState<string>('');
  const [sellerAddress, setSellerAddress] = useState<string>('');
  const [sellerTaxCode, setSellerTaxCode] = useState<string>('');
  const [developerSignatureBase64, setDeveloperSignatureBase64] = useState<string | null>(null);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState<boolean>(false);

  const fetchMyGames = async () => {
    if (!currentUser?.email) return;
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const response = await gameApi.getAllGames();
      if (response.success && response.data) {
        // Filter by creatorName matching current user's email
        const filtered = response.data.filter(
          (game) => game.creatorName?.toLowerCase() === currentUser.email.toLowerCase()
        );
        setMyGames(filtered);
      } else {
        setGamesError(response.message || 'Failed to load your games');
      }
    } catch (err: any) {
      setGamesError(err.response?.data?.message || err.message || 'Failed to fetch your games');
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchMyMarketplaceItems = async () => {
    if (!currentUser?.email) return;
    setIsLoadingMarketplace(true);
    setMarketplaceError(null);
    try {
      const response = await marketplaceApi.getMyMarketplaceItems();
      if (response.success && response.data) {
        setMyMarketplaceItems(response.data);
      } else {
        setMarketplaceError(response.message || 'Failed to load your marketplace items');
      }
    } catch (err: any) {
      setMarketplaceError(err.response?.data?.message || err.message || 'Failed to fetch your marketplace items');
    } finally {
      setIsLoadingMarketplace(false);
    }
  };

  const handleDeleteMarketplaceItem = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn gỡ sản phẩm này khỏi Creator Marketplace?")) {
      return;
    }
    try {
      const res = await marketplaceApi.deleteMarketplaceItem(id);
      if (res.success) {
        alert("Đã gỡ sản phẩm thành công!");
        fetchMyMarketplaceItems();
      } else {
        alert(res.message || "Không thể gỡ sản phẩm");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi gỡ sản phẩm");
    }
  };

  const fetchMyContracts = async () => {
    if (!currentUser?.email) return;
    setIsLoadingContracts(true);
    try {
      const response = await contractApi.getMyContracts();
      if (response.success && response.data) {
        setContracts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch contracts', err);
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const handleOpenSignModal = (contract: ContractResponse) => {
    setSelectedContract(contract);
    // Prefill details with developer's full name, not email
    setSellerRepresentative(currentUser?.fullName || '');
    setSellerAddress(contract.sellerAddress || '');
    setSellerTaxCode(contract.sellerTaxCode || '');
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
        sellerTaxCode
      );
      if (response.success) {
        alert('Ký hợp đồng thành công! Đang chờ Admin ký đối ứng để hoàn tất.');
        setIsSignModalOpen(false);
        fetchMyGames();
        fetchMyContracts();
      } else {
        alert(response.message || 'Lỗi ký hợp đồng');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi thực hiện ký hợp đồng');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const fetchWalletData = async () => {
    setIsLoadingWallet(true);
    try {
      const res = await walletApi.getMyWallet();
      if (res.success && res.data) {
        setWallet(res.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải thông tin ví:', err);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const fetchTransactions = async (page = 0) => {
    setIsLoadingTxns(true);
    try {
      const res = await walletApi.getMyTransactions(page, 10);
      if (res.success && res.data) {
        setTransactions(res.data.content);
        setTotalPagesTxn(res.data.totalPages);
        setCurrentTxnPage(res.data.number);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải lịch sử giao dịch:', err);
    } finally {
      setIsLoadingTxns(false);
    }
  };

  const fetchWithdrawals = async () => {
    setIsLoadingWithdrawals(true);
    try {
      const res = await walletApi.getMyWithdrawals();
      if (res.success && res.data) {
        setWithdrawals(res.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách rút tiền:', err);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError(null);
    setWithdrawalSuccess(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 10000) {
      setWithdrawalError('Số tiền rút tối thiểu là 10,000 VND.');
      return;
    }
    if (!bankName.trim()) {
      setWithdrawalError('Vui lòng nhập tên ngân hàng.');
      return;
    }
    if (!bankAccount.trim()) {
      setWithdrawalError('Vui lòng nhập số tài khoản.');
      return;
    }
    if (!accountHolder.trim()) {
      setWithdrawalError('Vui lòng nhập tên chủ tài khoản.');
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const res = await walletApi.createWithdrawal({
        amount: amountNum,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        accountHolder: accountHolder.trim(),
      });
      if (res.success) {
        setWithdrawalSuccess(`Yêu cầu rút tiền trị giá ${formatVND(amountNum)} đã được gửi thành công và đang chờ xét duyệt.`);
        setWithdrawAmount('');
        fetchWalletData();
        fetchTransactions(0);
        fetchWithdrawals();
      } else {
        setWithdrawalError(res.message || 'Lỗi khi tạo yêu cầu rút tiền');
      }
    } catch (err: any) {
      setWithdrawalError(err.response?.data?.message || err.message || 'Lỗi hệ thống khi rút tiền');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const formatVND = (value?: number | string) => {
    if (value === undefined || value === null) return '0 VND';
    const num = typeof value === 'number' ? value : parseFloat(value.toString());
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num).replace('₫', 'VND');
  };

  useEffect(() => {
    if (activeTab === 'wallet' && currentUser) {
      fetchWalletData();
      fetchTransactions(0);
      fetchWithdrawals();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    fetchMyGames();
    fetchMyMarketplaceItems();
    fetchMyContracts();
  }, [currentUser]);

  return (
    <>
      <div className="space-y-6 animate-fade-in py-2">
      
      {/* Top overview row with developer metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">OFFICIAL DEVROOM CONTROL PANEL</span>
          <h1 className="font-display font-bold text-2xl text-white pt-0.5">Welcome Back, Indie Creator</h1>
          <p className="text-xs text-slate-400 mt-1">Check recent downloads, live dashboard trends, and community logs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCurrentScreen('upload')}>
            Deploy Asset
          </Button>
          <button
            onClick={() => alert('Dev profile synchronizer complete!')}
            className="p-2 bg-slate-800 border border-slate-750 text-slate-350 hover:text-white transition-studio rounded-lg text-xs font-semibold cursor-pointer"
          >
            Sync Repository
          </button>
        </div>
      </div>

      {/* Quick counters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Gross Sales Revenue</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">${financeStats.totalRevenue.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+12%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: '68%' }}></div>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Updates whenever you successfully checkout additional assets</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Active Players Sandbox</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-2xl font-display font-bold dark:text-white">{financeStats.activePlayers} users</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Synchronized live with Godot Multiplayer sockets</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Cloud Storage Allocated</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">74.2%</span>
            <span className="text-[10px] text-slate-400">of 10GB</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: '74.2%' }}></div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Listed Asset Packages</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{assets.length} items</span>
            <span className="text-[10px] text-slate-400 font-bold">active status</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Includes native community bundles</p>
        </div>

      </div>

      {/* Split row: Reusable DataTable and Sidebar developer logs list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Switchable tabs for Real Games vs Mock Git Repos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab headers */}
          <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-1.5 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('my-games')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'my-games' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <Gamepad2 size={14} /> Game Phát Hành ({myGames.length})
            </button>
            <button
              onClick={() => setActiveTab('marketplace-items')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'marketplace-items' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <ShoppingBag size={14} /> Tài Nguyên Chợ ({myMarketplaceItems.length})
            </button>
            <button
              onClick={() => setActiveTab('git-repos')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'git-repos' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <Calendar size={14} /> Dự án Git (Mock) ({projectRepositories.length})
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'wallet' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <DollarSign size={14} /> Ví & Rút Tiền
            </button>
          </div>

          {/* Tab 1: Developer's Real Uploaded Games */}
          {activeTab === 'my-games' && (
            <div className="space-y-4">
              {isLoadingGames ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <RefreshCw className="animate-spin" size={18} /> Đang tải danh sách game...
                </div>
              ) : gamesError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                  Lỗi tải danh sách game: {gamesError}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Thông tin chi tiết</th>
                        <th className="p-3">Thể loại</th>
                        <th className="p-3">Loại phát hành</th>
                        <th className="p-3">Giá đề xuất</th>
                        <th className="p-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                      {myGames.length > 0 ? (
                        myGames.map(game => (
                          <React.Fragment key={game.id}>
                            <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors ${expandedGameId === game.id ? 'bg-slate-50/50 dark:bg-slate-950/20' : ''}`}>
                              <td className="p-3 w-10 text-center">
                                <button
                                  onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                  title={expandedGameId === game.id ? "Ẩn Chi Tiết" : "Xem Chi Tiết"}
                                >
                                  {expandedGameId === game.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  {game.title}
                                  <button
                                    onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                                    className="text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                                    title="Xem nhanh nội dung"
                                  >
                                    <Eye size={12} />
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {game.id}</div>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-350">{game.categoryName || 'Chưa phân loại'}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                  game.publishingType === 'full_acquisition'
                                    ? 'bg-amber-450/10 text-amber-500 border-amber-500/20'
                                    : game.publishingType === 'co_publishing'
                                    ? 'bg-sky-450/10 text-sky-500 border-sky-500/20'
                                    : 'bg-slate-100 dark:bg-slate-950 text-slate-500 border-slate-205 dark:border-slate-800'
                                }`}>
                                  {game.publishingType ? game.publishingType.toUpperCase() : 'MARKETPLACE_LISTING'}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                {game.priceProposed === 0 ? 'Miễn phí' : `$${game.priceProposed}`}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1.5 justify-center">
                                  {(() => {
                                    const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');
                                    if (contract) {
                                      const statusInfo = getContractStatusLabel(contract.status, contract.signedAtSeller);
                                      return (
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.colorClass}`}>
                                          {statusInfo.text}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        game.status?.toLowerCase() === 'published'
                                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                          : game.status?.toLowerCase() === 'pending'
                                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                                          : game.status?.toLowerCase() === 'rejected'
                                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                          : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                      }`}>
                                        {game.status}
                                      </span>
                                    );
                                  })()}
                                    {(() => {
                                      const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');
                                      if (contract) {
                                        if ((contract.status === 'pending' || contract.status === 're_issued') && !contract.signedAtSeller) {
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedContract(contract);
                                                setViewerMode('sign-developer');
                                                setIsViewerOpen(true);
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-550 text-slate-950 font-bold rounded text-[10px] transition-studio cursor-pointer animate-pulse whitespace-nowrap shadow-sm"
                                            >
                                              <PenTool size={10} />
                                              Ký Hợp đồng
                                            </button>
                                          );
                                        } else if ((contract.status === 'pending' || contract.status === 're_issued') && contract.signedAtSeller) {
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedContract(contract);
                                                setViewerMode('view');
                                                setIsViewerOpen(true);
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded text-[10px] transition-studio cursor-pointer whitespace-nowrap shadow-sm"
                                            >
                                              <Eye size={10} />
                                              Đã ký
                                            </button>
                                          );
                                        } else if (contract.status === 'signed') {
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedContract(contract);
                                                setViewerMode('view');
                                                setIsViewerOpen(true);
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-450 text-white font-bold rounded text-[10px] transition-studio cursor-pointer whitespace-nowrap shadow-sm"
                                            >
                                              <FileText size={10} />
                                              Chi tiết
                                            </button>
                                          );
                                        } else if (contract.status === 'negotiating') {
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
                                <td colSpan={6} className="p-6 bg-slate-50/10 dark:bg-slate-950/20 border-t border-b border-slate-200/50 dark:border-slate-800/60">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700 dark:text-slate-300">
                                    {/* Left Column: Thumbnail, Description, ZIP */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                                          <Image size={12} /> Ảnh bìa (Thumbnail)
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
                                          {game.description || "Không có mô tả chi tiết."}
                                        </p>
                                      </div>
                                      
                                      {game.fileUrl ? (
                                        <a 
                                          href={game.fileUrl} 
                                          download 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-studio active:scale-[0.98] cursor-pointer"
                                        >
                                          <Download size={14} /> Tải về tệp game ZIP
                                        </a>
                                      ) : (
                                        <div className="text-center py-2.5 px-4 bg-slate-550/10 border border-slate-500/20 text-slate-550 rounded-xl text-xs font-semibold">
                                          Chưa có tệp game ZIP được tải lên
                                        </div>
                                      )}

                                      {/* Alert box for rejected games */}
                                      {game.status?.toLowerCase() === 'rejected' && (
                                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 space-y-1">
                                          <span className="font-bold flex items-center gap-1.5 text-xs"><AlertTriangle size={14} /> Game bị từ chối phê duyệt</span>
                                          <p className="text-[10px] leading-normal text-slate-500 dark:text-slate-400">Vui lòng kiểm tra địa chỉ email liên kết tài khoản của bạn để biết lý do từ chối chi tiết và các phản hồi từ ban quản trị hệ thống.</p>
                                        </div>
                                      )}

                                      {/* Contract Status Card for Co-publishing or Full Acquisition */}
                                      {(() => {
                                        const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');
                                        if (contract) {
                                          return (
                                            <div className="p-4 bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                                              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                <FileCheck size={12} className="text-sky-500" /> Hợp đồng phát hành
                                              </span>
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">Trạng thái:</span>
                                                {(() => {
                                                  const statusInfo = getContractStatusLabel(contract.status, contract.signedAtSeller);
                                                  return (
                                                    <span className={`font-bold uppercase tracking-wider ${
                                                      contract.status === 'signed' ? 'text-emerald-500' :
                                                      contract.status === 'negotiating' ? 'text-rose-500' :
                                                      'text-amber-500'
                                                    }`}>
                                                      {statusInfo.text}
                                                    </span>
                                                  );
                                                })()}
                                              </div>
                                              {((contract.status === 'pending' || contract.status === 're_issued') && !contract.signedAtSeller) && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('sign-developer');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-amber-400 hover:bg-amber-550 text-slate-950 font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                >
                                                  <PenTool size={14} /> Ký hợp đồng điện tử
                                                </button>
                                              )}
                                              {((contract.status === 'pending' || contract.status === 're_issued') && contract.signedAtSeller) && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('view');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-sky-550 hover:bg-sky-600 text-white font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                >
                                                  <Eye size={14} /> Xem chi tiết hợp đồng đã ký
                                                </button>
                                              )}
                                              {contract.status === 'negotiating' && null}
                                              {contract.status === 'signed' && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('view');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-450 text-white font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                >
                                                  <FileText size={14} /> Xem & Tải hợp đồng
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
                                          <Image size={12} className="text-sky-500" /> Ảnh chụp màn hình (Screenshots)
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
                                          <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                            <Image size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                            <span className="text-[10px]">Chưa có ảnh chụp màn hình nào</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Video Gameplay */}
                                      <div className="space-y-2">
                                        <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                          <Video size={12} className="text-sky-500" /> Video Gameplay Demo
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
                                          <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                            <Video size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                            <span className="text-[10px]">Chưa có video gameplay nào</span>
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
                          <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium bg-slate-100/50 dark:bg-slate-950/20">
                            Bạn chưa đăng tải game hoặc tài nguyên nào. Nhấn "Deploy Asset" ở trên để bắt đầu!
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
          {activeTab === 'marketplace-items' && (
            <div className="space-y-4">
              {isLoadingMarketplace ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <RefreshCw className="animate-spin" size={18} /> Đang tải danh sách tài nguyên...
                </div>
              ) : marketplaceError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                  Lỗi tải danh sách tài nguyên: {marketplaceError}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                        <th className="p-3">Thông tin chi tiết</th>
                        <th className="p-3">Loại sản phẩm</th>
                        <th className="p-3">Phân loại</th>
                        <th className="p-3">Giá bán</th>
                        <th className="p-3 text-center">Trạng thái</th>
                        <th className="p-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                      {myMarketplaceItems.length > 0 ? (
                        myMarketplaceItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {item.id}</div>
                            </td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border bg-amber-450/10 text-amber-500 border-amber-500/20">
                                {item.itemType === 'source_code' ? 'SOURCE CODE' : 'RESOURCE ASSET'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-350">{item.categoryName || 'Chưa phân loại'}</td>
                            <td className="p-3 font-mono font-semibold dark:text-amber-400">
                              {item.price === 0 ? 'Miễn phí' : `$${item.price}`}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                item.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : item.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                                  : item.status === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-505 border-rose-500/20'
                                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              }`}>
                                {item.status === 'active' ? 'Đang bán' :
                                 item.status === 'pending' ? 'Chờ duyệt' :
                                 item.status === 'rejected' ? 'Bị từ chối' : 'Gỡ bỏ'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteMarketplaceItem(item.id)}
                                className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                title="Gỡ sản phẩm"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium bg-slate-100/50 dark:bg-slate-950/20">
                            Bạn chưa đăng bán sản phẩm nào trên Creator Marketplace. Nhấn "Deploy Asset" ở trên để bắt đầu!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Reusable Mock Projects list */}
          {activeTab === 'git-repos' && (
            <DataTable 
              data={projectRepositories} 
              onSelectRow={(row) => alert(`Opening advanced configuration options for project: ${row.projectName}. Running on engine ${row.engine}.`)} 
            />
          )}

          {/* Tab 4: Wallet & Withdrawals */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              {/* Wallet Balance Card */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="space-y-1.5 text-white">
                  <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">DEVELOPER WALLET</span>
                  <h3 className="text-3xl font-display font-black text-white pt-0.5">
                    {isLoadingWallet ? (
                      <span className="flex items-center gap-2 text-slate-500 text-lg">
                        <RefreshCw className="animate-spin" size={20} /> Đang tải...
                      </span>
                    ) : (
                      formatVND(wallet?.balance)
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">Đơn vị tiền tệ: {wallet?.currency || 'VND'}</p>
                </div>
                
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 max-w-xs font-medium">
                  <p>• Doanh thu bán sản phẩm sẽ được tự động cộng trực tiếp vào ví sau khi đã trừ 10% phí nền tảng.</p>
                  <p>• Số tiền rút tối thiểu: 10.000 VND.</p>
                </div>
              </div>

              {/* Submit a Withdrawal Request */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-xs">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-1">
                    <DollarSign size={15} className="text-sky-500" /> Tạo yêu cầu rút tiền
                  </h3>
                  <p className="text-[10px] text-slate-400">Chuyển doanh thu tích lũy của bạn về tài khoản ngân hàng cá nhân</p>
                </div>

                <form onSubmit={handleCreateWithdrawal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Số tiền muốn rút (VND)</label>
                    <Input 
                      type="number"
                      placeholder="VD: 50000"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={isSubmittingWithdrawal}
                      className="w-full text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Tên Ngân hàng</label>
                    <Input 
                      type="text"
                      placeholder="VD: Techcombank, Vietcombank..."
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={isSubmittingWithdrawal}
                      className="w-full text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Số tài khoản</label>
                    <Input 
                      type="text"
                      placeholder="VD: 190352..."
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      disabled={isSubmittingWithdrawal}
                      className="w-full text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Tên chủ tài khoản</label>
                    <Input 
                      type="text"
                      placeholder="VD: NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      disabled={isSubmittingWithdrawal}
                      className="w-full text-xs uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 flex flex-col gap-2">
                    {withdrawalError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle size={14} /> {withdrawalError}
                      </div>
                    )}
                    {withdrawalSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <Check size={14} /> {withdrawalSuccess}
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-full sm:w-auto self-start"
                      disabled={isSubmittingWithdrawal}
                    >
                      {isSubmittingWithdrawal ? (
                        <span className="flex items-center gap-2 justify-center">
                          <RefreshCw className="animate-spin" size={14} /> Đang xử lý...
                        </span>
                      ) : (
                        'Gửi yêu cầu rút tiền'
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Wallet Ledger and Log Sub Tabs */}
              <div className="space-y-4">
                {/* Sub Tab Headers */}
                <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-1">
                  <button
                    onClick={() => setWalletSubTab('transactions')}
                    className={`pb-2 px-3 text-[11px] font-semibold border-b-2 transition-studio cursor-pointer ${walletSubTab === 'transactions' ? 'border-sky-500 text-sky-500 font-bold' : 'border-transparent text-slate-500'}`}
                  >
                    Lịch sử Giao dịch
                  </button>
                  <button
                    onClick={() => setWalletSubTab('withdrawals')}
                    className={`pb-2 px-3 text-[11px] font-semibold border-b-2 transition-studio cursor-pointer ${walletSubTab === 'withdrawals' ? 'border-sky-500 text-sky-500 font-bold' : 'border-transparent text-slate-500'}`}
                  >
                    Yêu cầu Rút tiền ({withdrawals.length})
                  </button>
                </div>

                {/* Sub Tab 1: Transaction list */}
                {walletSubTab === 'transactions' && (
                  <div className="space-y-4">
                    {isLoadingTxns ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                        <RefreshCw className="animate-spin" size={14} /> Đang tải lịch sử giao dịch...
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-mono">
                              <th className="p-3">Ngày tạo</th>
                              <th className="p-3">Loại</th>
                              <th className="p-3">Số tiền</th>
                              <th className="p-3">Phí hệ thống</th>
                              <th className="p-3">Thực nhận/Thực trừ</th>
                              <th className="p-3">Chi tiết</th>
                              <th className="p-3 text-center">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-medium">
                            {transactions.length > 0 ? (
                              transactions.map((txn) => (
                                <tr key={txn.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors">
                                  <td className="p-3 text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                                    {new Date(txn.createdAt).toLocaleString('vi-VN')}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                      txn.type === 'revenue_share' ? 'bg-emerald-500/10 text-emerald-500' :
                                      txn.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-500' :
                                      txn.type === 'refund' ? 'bg-sky-500/10 text-sky-500' : 'bg-slate-550/10 text-slate-500'
                                    }`}>
                                      {txn.type === 'revenue_share' ? 'DOANH THU' :
                                       txn.type === 'withdrawal' ? 'RÚT TIỀN' :
                                       txn.type === 'refund' ? 'HOÀN TIỀN' : txn.type}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                                    {formatVND(txn.amount)}
                                  </td>
                                  <td className="p-3 font-mono text-slate-400 dark:text-slate-500 text-[11px]">
                                    {txn.platformCommission > 0 ? formatVND(txn.platformCommission) : '—'}
                                  </td>
                                  <td className={`p-3 font-mono font-bold ${
                                    txn.type === 'withdrawal' ? 'text-rose-500' : 'text-emerald-500'
                                  }`}>
                                    {txn.type === 'withdrawal' ? '-' : '+'}{formatVND(txn.netAmount)}
                                  </td>
                                  <td className="p-3 text-slate-550 dark:text-slate-400 text-[11px]">
                                    {txn.referenceId || 'Giao dịch hệ thống'}
                                    {txn.gameTitle && <span className="block text-[9px] text-slate-400 font-sans">Sản phẩm: {txn.gameTitle}</span>}
                                    {txn.relatedUserFullName && <span className="block text-[9px] text-slate-400 font-sans">Khách hàng: {txn.relatedUserFullName}</span>}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                      txn.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                      txn.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                                      txn.status === 'refunded' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                      'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    }`}>
                                      {txn.status === 'completed' ? 'Thành công' :
                                       txn.status === 'pending' ? 'Đang xử lý' :
                                       txn.status === 'refunded' ? 'Đã hoàn tiền' : 'Thất bại'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="p-6 text-center text-slate-400 dark:text-slate-650 bg-slate-50/50 dark:bg-slate-950/20">
                                  Chưa có lịch sử giao dịch nào được ghi nhận.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Pagination control */}
                    {totalPagesTxn > 1 && (
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          disabled={currentTxnPage === 0}
                          onClick={(e) => { e.preventDefault(); fetchTransactions(currentTxnPage - 1); }}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-350 disabled:opacity-50 cursor-pointer"
                        >
                          Trang trước
                        </button>
                        <span className="py-1.5 px-1 font-mono text-slate-400">
                          {currentTxnPage + 1} / {totalPagesTxn}
                        </span>
                        <button
                          disabled={currentTxnPage === totalPagesTxn - 1}
                          onClick={(e) => { e.preventDefault(); fetchTransactions(currentTxnPage + 1); }}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-350 disabled:opacity-50 cursor-pointer"
                        >
                          Trang sau
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Tab 2: Withdrawal requests list */}
                {walletSubTab === 'withdrawals' && (
                  <div className="space-y-4">
                    {isLoadingWithdrawals ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                        <RefreshCw className="animate-spin" size={14} /> Đang tải lịch sử rút tiền...
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-mono">
                              <th className="p-3">Ngày tạo</th>
                              <th className="p-3">Số tiền</th>
                              <th className="p-3">Thông tin nhận tiền</th>
                              <th className="p-3 text-center">Trạng thái</th>
                              <th className="p-3">Phản hồi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-medium">
                            {withdrawals.length > 0 ? (
                              withdrawals.map((wr) => (
                                <tr key={wr.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors">
                                  <td className="p-3 text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                                    {new Date(wr.createdAt).toLocaleString('vi-VN')}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {formatVND(wr.amount)}
                                  </td>
                                  <td className="p-3 text-[11px] space-y-0.5 text-slate-550 dark:text-slate-350 font-medium">
                                    <div>Ngân hàng: <span className="font-semibold text-slate-850 dark:text-slate-250">{wr.bankName}</span></div>
                                    <div>Số tài khoản: <span className="font-semibold font-mono text-slate-850 dark:text-slate-250">{wr.bankAccount}</span></div>
                                    <div>Chủ tài khoản: <span className="font-semibold text-slate-850 dark:text-slate-250 uppercase">{wr.accountHolder}</span></div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                      wr.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                      wr.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                                      wr.status === 'approved' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                      'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    }`}>
                                      {wr.status === 'completed' ? 'Hoàn thành' :
                                       wr.status === 'pending' ? 'Chờ duyệt' :
                                       wr.status === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[11px] text-slate-500 dark:text-slate-400">
                                    {wr.status === 'rejected' && wr.rejectReason && (
                                      <div className="text-rose-500">
                                        <span className="font-semibold">Lý do từ chối:</span> {wr.rejectReason}
                                      </div>
                                    )}
                                    {wr.status === 'completed' && wr.reviewedByFullName && (
                                      <div>
                                        Duyệt bởi: <span className="font-semibold">{wr.reviewedByFullName}</span>
                                        {wr.reviewedAt && <span className="block text-[9px] text-slate-400 font-mono">{new Date(wr.reviewedAt).toLocaleDateString('vi-VN')}</span>}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-650 bg-slate-50/50 dark:bg-slate-950/20">
                                  Chưa có yêu cầu rút tiền nào được tạo.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Upcoming release tasks and support widgets */}
        <div className="space-y-6">
          
          {/* Release Schedule logging checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xs">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-1">
              <Calendar size={15} className="text-amber-500" /> Release Schedule Tracker
            </h3>

            <div className="space-y-2.5">
              {[
                { text: 'Deploy Void Knight rigging updates', done: true },
                { text: 'Configure multi-sampling on Ocean Shader', done: false },
                { text: 'Compress retro WAV anthology tracks', done: false },
                { text: 'Test custom tile coordinates mapping grids', done: false }
              ].map((task, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-350 font-medium">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-none ${task.done ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold' : 'border-slate-300 dark:border-slate-800'}`}>
                     {task.done && <Check size={11} />}
                  </div>
                  <span className={task.done ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{task.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Discord CTA server link */}
          <div className="bg-sky-500/5 dark:bg-sky-950/10 border border-sky-450 dark:border-sky-800 p-5 rounded-2xl space-y-3.5">
            <h4 className="font-display font-bold text-sm text-sky-600 dark:text-sky-400">Join Discord Creator Sockets</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Chat direct dev issues with 14,000+ top Godot enthusiasts. Exchange tiles sets coordinates, lighting math formulas, and shader loops with ease.
            </p>
            <button
              onClick={() => alert('Simulated Discord redirect! In production, this launches server invitation flow.')}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 hover:shadow-md text-white font-display text-xs font-bold rounded-lg transition-studio text-center cursor-pointer"
            >
              Join Creator Group Chat
            </button>
          </div>

        </div>

      </div>
    </div>

    {/* Screenshot Lightbox Modal */}
      {isOpenLightbox && activeScreenshotUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in"
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
              alt="Enlarged screenshot" 
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
              const res = await contractApi.signByDeveloper(selectedContract.id, sig, rep, addr, tax);
              return { success: res.success, message: res.message };
            } catch (err: any) {
              return { success: false, message: err.response?.data?.message || err.message || 'Lỗi ký hợp đồng' };
            }
          }}
          onRejectDeveloper={async (reason) => {
            try {
              const res = await contractApi.rejectByDeveloper(selectedContract.id, reason);
              return { success: res.success, message: res.message };
            } catch (err: any) {
              return { success: false, message: err.response?.data?.message || err.message || 'Lỗi từ chối hợp đồng' };
            }
          }}
        />
      )}

    </>
  );
};
