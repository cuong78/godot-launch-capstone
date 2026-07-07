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
  WalletCards,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { Input } from '../components/Input';
import { Project, User, GameResponse, ContractResponse, MarketplaceItemResponse, PaymentResponse, DeveloperSalesStatsResponse } from '../types';
import { gameApi } from '../api/gameApi';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { walletApi } from '../api/walletApi';
import { SignaturePad } from '../components/SignaturePad';
import { ContractViewerModal } from '../components/ContractViewerModal';
import { PurchasedInventoryPanel } from '../components/PurchasedInventoryPanel';
import { PaymentDetailPage } from './PaymentDetailPage';

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

const getContractStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'signed':
      return { text: 'Signed', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    case 'pending':
      return { text: 'Awaiting Your Sign', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
    case 'cancelled':
      return { text: 'Cancelled / Awaiting Re-offer', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    case 'expired':
      return { text: 'Expired', colorClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    default:
      return { text: status || 'Unknown', colorClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
  }
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
  setCurrentScreen
}) => {
  // Tab control: 'my-games' | 'marketplace-items' | 'sales' | 'git-repos' | 'payment-center'
  const [activeTab, setActiveTab] = useState<'my-games' | 'marketplace-items' | 'sales' | 'git-repos' | 'payment-center'>('my-games');

  // Game & Asset status filters
  const [gameStatusFilter, setGameStatusFilter] = useState<string>('all');
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>('all');

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

  // Real Sales Stats state (units sold + revenue as seller)
  const [salesStats, setSalesStats] = useState<DeveloperSalesStatsResponse | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState<boolean>(false);
  const [salesError, setSalesError] = useState<string | null>(null);

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
  const dashboardWorkspaceRef = React.useRef<HTMLDivElement | null>(null);

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
    if (!window.confirm("Are you sure you want to remove this product from the Creator Marketplace?")) {
      return;
    }
    try {
      const res = await marketplaceApi.deleteMarketplaceItem(id);
      if (res.success) {
        alert("Product successfully removed!");
        fetchMyMarketplaceItems();
      } else {
        alert(res.message || "Failed to remove product");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Error removing product");
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

  const fetchSalesStats = async () => {
    if (!currentUser?.email) return;
    setIsLoadingSales(true);
    setSalesError(null);
    try {
      const response = await walletApi.getDeveloperSalesStats();
      if (response.success && response.data) {
        setSalesStats(response.data);
      } else {
        setSalesError(response.message || 'Failed to load sales statistics');
      }
    } catch (err: any) {
      setSalesError(err.response?.data?.message || err.message || 'Failed to fetch sales statistics');
    } finally {
      setIsLoadingSales(false);
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
        alert('Contract signed successfully! The contract is complete and the game is now approved for publishing.');
        setIsSignModalOpen(false);
        fetchMyGames();
        fetchMyContracts();
      } else {
        alert(response.message || 'Error signing contract');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error performing contract signing');
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
    { label: 'All', value: 'all' },
    { label: 'Published / Completed', value: 'published_signed' },
    { label: 'Awaiting Sign / Pending', value: 'pending_signing' },
    { label: 'Cancelled / Awaiting Re-offer', value: 'negotiating' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Draft', value: 'draft' }
  ];

  const assetFilterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Removed', value: 'removed' }
  ];

  const filteredGames = myGames
    .filter(game => {
      if (gameStatusFilter === 'all') return true;

      const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');

      if (gameStatusFilter === 'published_signed') {
        if (contract) return contract.status === 'signed';
        return game.status?.toLowerCase() === 'published';
      }

      if (gameStatusFilter === 'pending_signing') {
        if (contract) return contract.status === 'pending';
        return game.status?.toLowerCase() === 'pending';
      }

      if (gameStatusFilter === 'negotiating') {
        const latestContract = [...contracts].reverse().find(c => c.gameId === game.id);
        return latestContract?.status === 'cancelled';
      }

      if (gameStatusFilter === 'rejected') {
        return game.status?.toLowerCase() === 'rejected';
      }

      if (gameStatusFilter === 'draft') {
        return game.status?.toLowerCase() === 'draft';
      }

      return true;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const filteredMarketplaceItems = myMarketplaceItems
    .filter(item => {
      if (assetStatusFilter === 'all') return true;
      return item.status === assetStatusFilter;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

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
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Tổng Doanh Thu (Thực Nhận)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+12%</span>
            <span className="text-2xl font-display font-bold dark:text-white">{(salesStats?.totalRevenue ?? 0).toLocaleString('vi-VN')} đ</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Doanh thu sau khi trừ hoa hồng nền tảng</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Sản Phẩm Đã Bán</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{salesStats?.totalUnitsSold ?? 0}</span>
            <span className="text-[10px] text-slate-400 font-bold">đơn hàng</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Tổng lượt game và tài nguyên khách hàng đã mua</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Game Đã Phát Hành</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{myGames.length} game</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Tổng số game đã đăng tải lên hệ thống</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Tài Nguyên Đang Bán</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{myMarketplaceItems.length} items</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Sản phẩm hiện có trên Creator Marketplace</p>
        </div>

      </div>

      {/* Split row: Reusable DataTable and Sidebar developer logs list */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3" ref={dashboardWorkspaceRef}>
        
        {/* Left Column: Switchable tabs for Real Games vs Mock Git Repos */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Tab headers */}
          <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-1.5 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('my-games')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'my-games' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <Gamepad2 size={14} /> Published Games ({myGames.length})
            </button>
            <button
              onClick={() => setActiveTab('marketplace-items')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'marketplace-items' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <ShoppingBag size={14} /> Marketplace Assets ({myMarketplaceItems.length})
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'sales' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <TrendingUp size={14} /> Đơn Hàng Đã Bán ({salesStats?.totalUnitsSold ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('git-repos')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'git-repos' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <Calendar size={14} /> Git Projects (Mock) ({projectRepositories.length})
            </button>
            <button
              onClick={() => setActiveTab('payment-center')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'payment-center' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <WalletCards size={14} /> Đơn Hàng Đã Mua ({purchasedPayments.length})
            </button>
          </div>

          {/* Tab 1: Developer's Real Uploaded Games */}
          {activeTab === 'my-games' && (
            <div className="space-y-4">
              {/* Game Status Filter Chips */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Game Status:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {gameFilterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setGameStatusFilter(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                        gameStatusFilter === option.value
                          ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 font-semibold'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingGames ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <RefreshCw className="animate-spin" size={18} /> Loading games...
                </div>
              ) : gamesError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                  Error loading games: {gamesError}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Details</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Publishing Type</th>
                        <th className="p-3">Proposed Price</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                      {filteredGames.length > 0 ? (
                        filteredGames.map(game => (
                          <React.Fragment key={game.id}>
                            <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors ${expandedGameId === game.id ? 'bg-slate-50/50 dark:bg-slate-950/20' : ''}`}>
                              <td className="p-3 w-10 text-center">
                                <button
                                  onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-studio cursor-pointer"
                                  title={expandedGameId === game.id ? "Hide Details" : "View Details"}
                                >
                                  {expandedGameId === game.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  {game.title}
                                  <span className="text-[9px] font-mono bg-slate-105 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-550 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700/80">
                                    v{game.version || "1.0.0"}
                                  </span>
                                  <button
                                    onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                                    className="text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                                    title="Quick Preview"
                                  >
                                    <Eye size={12} />
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {game.id}</div>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-350">{game.categoryName || 'Unassigned'}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                  game.publishingType === 'full_acquisition'
                                    ? 'bg-amber-450/10 text-amber-500 border-amber-500/20'
                                    : game.publishingType === 'co_publishing'
                                    ? 'bg-sky-450/10 text-sky-500 border-sky-500/20'
                                    : 'bg-slate-100 dark:bg-slate-955 text-slate-500 border-slate-205 dark:border-slate-800'
                                }`}>
                                  {game.publishingType ? game.publishingType.toUpperCase() : 'MARKETPLACE_LISTING'}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-semibold dark:text-amber-400">
                                {game.priceProposed === 0 ? 'Free' : `${game.priceProposed.toLocaleString('vi-VN')} VND`}
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
                                        if (contract.status === 'pending') {
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
                                              Sign Contract
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
                                          <Image size={12} /> Cover Thumbnail
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
                                        <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Detailed Description</h4>
                                        <p className="text-xs leading-relaxed max-h-32 overflow-y-auto bg-white/40 dark:bg-slate-955/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                          {game.description || "No detailed description provided."}
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
                                          <Download size={14} /> Download Game ZIP
                                        </a>
                                      ) : (
                                        <div className="text-center py-2.5 px-4 bg-slate-550/10 border border-slate-500/20 text-slate-550 rounded-xl text-xs font-semibold">
                                          No Game ZIP package uploaded yet
                                        </div>
                                      )}

                                      {/* Alert box for rejected games */}
                                      {game.status?.toLowerCase() === 'rejected' && (() => {
                                         const latestContract = [...contracts].reverse().find(c => c.gameId === game.id);
                                         const isDeveloperCancelled = latestContract && latestContract.rejectionReason?.startsWith('[HỦY HỢP ĐỒNG]');
                                         return (
                                           <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 space-y-1">
                                             <span className="font-bold flex items-center gap-1.5 text-xs">
                                               <AlertTriangle size={14} />
                                               {isDeveloperCancelled ? 'Contract cancelled by developer' : 'Game rejected by administrators'}
                                             </span>
                                             <p className="text-[10px] leading-normal text-slate-500 dark:text-slate-400">
                                               {isDeveloperCancelled
                                                 ? 'You cancelled/withdrew this contract offer. If this was a mistake, please contact administration or submit a new proposal.'
                                                 : 'Please check your registered email address for details on rejection reason and administrative feedback.'}
                                             </p>
                                           </div>
                                         );
                                       })()}

                                      {/* Contract Status Card for Co-publishing or Full Acquisition */}
                                      {(() => {
                                        const contract = [...contracts].reverse().find(c => c.gameId === game.id && c.status !== 'cancelled');
                                        if (contract) {
                                          return (
                                            <div className="p-4 bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                                              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                                <FileCheck size={12} className="text-sky-500" /> Publishing Contract
                                              </span>
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">Status:</span>
                                                {(() => {
                                                  const statusInfo = getContractStatusLabel(contract.status);
                                                  return (
                                                    <span className={`font-bold uppercase tracking-wider ${
                                                      contract.status === 'signed' ? 'text-emerald-500' :
                                                      contract.status === 'cancelled' ? 'text-rose-500' :
                                                      'text-amber-500'
                                                    }`}>
                                                      {statusInfo.text}
                                                    </span>
                                                  );
                                                })()}
                                              </div>
                                              {contract.status === 'pending' && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('sign-developer');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-amber-400 hover:bg-amber-550 text-slate-950 font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                >
                                                  <PenTool size={14} /> Sign Electronic Contract
                                                </button>
                                              )}
                                              {contract.status === 'signed' && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedContract(contract);
                                                    setViewerMode('view');
                                                    setIsViewerOpen(true);
                                                  }}
                                                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-450 text-white font-bold rounded-lg text-xs transition-studio cursor-pointer"
                                                >
                                                  <FileText size={14} /> View & Download Contract
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
                                          <Image size={12} className="text-sky-500" /> Screenshots
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
                                          <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                            <Image size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                            <span className="text-[10px]">No screenshots uploaded yet</span>
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
                                          <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-slate-100/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                            <Video size={24} className="mb-1 text-slate-350 dark:text-slate-650" />
                                            <span className="text-[10px]">No gameplay video uploaded yet</span>
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
                        <tr>                          <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium bg-slate-100/50 dark:bg-slate-950/20">
                            {myGames.length === 0
                              ? 'You have not uploaded any games or assets yet. Click "Deploy Asset" above to get started!'
                              : 'No games found with the selected status.'}
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
              {/* Asset Status Filter Chips */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Asset Status:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {assetFilterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setAssetStatusFilter(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                        assetStatusFilter === option.value
                          ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 font-semibold'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingMarketplace ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-xl">
                  <RefreshCw className="animate-spin" size={18} /> Loading marketplace assets...
                </div>
              ) : marketplaceError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                  Error loading assets: {marketplaceError}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                        <th className="p-3">Details</th>
                        <th className="p-3">Product Type</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Price</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                      {filteredMarketplaceItems.length > 0 ? (
                        filteredMarketplaceItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {item.id}</div>
                            </td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border bg-amber-450/10 text-amber-500 border-amber-500/20">
                                RESOURCE ASSET
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-350">{item.categoryName || 'Unassigned'}</td>
                            <td className="p-3 font-mono font-semibold dark:text-amber-400">
                              {item.price === 0 ? 'Free' : `${item.price.toLocaleString('vi-VN')} VND`}
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
                                {item.status === 'active' ? 'Active' :
                                 item.status === 'pending' ? 'Pending' :
                                 item.status === 'rejected' ? 'Rejected' : 'Removed'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteMarketplaceItem(item.id)}
                                className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                title="Remove Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium bg-slate-100/50 dark:bg-slate-955/20">
                            {myMarketplaceItems.length === 0
                              ? 'You have not listed any assets on the Creator Marketplace yet. Click "Deploy Asset" above to get started!'
                              : 'No assets found with the selected status.'}
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
          {activeTab === 'sales' && (
            <div className="space-y-4">
              {isLoadingSales && (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <RefreshCw className="animate-spin" size={18} /> Đang tải dữ liệu doanh số...
                </div>
              )}
              {!isLoadingSales && salesError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                  Lỗi tải dữ liệu doanh số: {salesError}
                </div>
              )}
              {!isLoadingSales && !salesError && (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                        <th className="p-3">Sản phẩm</th>
                        <th className="p-3">Loại</th>
                        <th className="p-3 text-right">Đã bán</th>
                        <th className="p-3 text-right">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                      {(salesStats?.products ?? []).length > 0 ? (
                        (salesStats?.products ?? []).map(product => (
                          <tr key={`${product.productType}-${product.productId}`} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {product.thumbnailUrl && (
                                  <img src={product.thumbnailUrl} alt={product.title} className="w-8 h-8 rounded object-cover shrink-0" />
                                )}
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{product.title}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${product.productType === 'GAME' ? 'bg-sky-500/10 text-sky-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                {product.productType === 'GAME' ? 'Game' : 'Tài nguyên'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono">{product.unitsSold}</td>
                            <td className="p-3 text-right font-mono font-semibold dark:text-amber-400">{product.revenue.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium">
                            Bạn chưa bán được sản phẩm nào.
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

          {/* Tab 4: Payment Center */}
          {activeTab === 'payment-center' && (
            <PaymentDetailPage
              payments={purchasedPayments}
              selectedOrderId={selectedPaymentOrderId}
              setSelectedOrderId={setSelectedPaymentOrderId}
              isRefreshing={isRefreshingPayments}
              onBackToMarketplace={() => {
                setCurrentScreen('marketplace');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onRefreshPayments={onRefreshPayments}
              onCancelPayment={onCancelPayment}
              setCurrentScreen={setCurrentScreen}
              variant="dashboard"
            />
          )}

        </div>

        {/* Right Column: Support widgets */}
        <div className="space-y-6">
          <PurchasedInventoryPanel
            payments={purchasedPayments}
            onOpenPaymentCenter={() => {
              setActiveTab('payment-center');
              dashboardWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          
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
              return { success: false, message: err.response?.data?.message || err.message || 'Error signing contract' };
            }
          }}
          onRejectDeveloper={async (reason) => {
            try {
              const res = await contractApi.rejectByDeveloper(selectedContract.id, reason);
              return { success: res.success, message: res.message };
            } catch (err: any) {
              return { success: false, message: err.response?.data?.message || err.message || 'Error rejecting contract' };
            }
          }}
        />
      )}

    </>
  );
};
