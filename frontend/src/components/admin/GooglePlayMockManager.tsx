import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Download,
  DollarSign,
  Globe,
  Package,
  BarChart3,
  Settings,
  ShieldCheck,
  FileText,
  TrendingUp,
  CreditCard,
  Building,
  Search,
  X,
} from 'lucide-react';
import { storeReportApi } from '../../api/storeReportApi';
import {
  GooglePlayMockConfigDto,
  StoreDailyMetricResponse,
  StoreReportImportResponse,
  StoreRevenueStatementResponse,
  StoreRevenueSummaryResponse,
} from '../../types';

export const GooglePlayMockManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'imports' | 'statements'>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [config, setConfig] = useState<GooglePlayMockConfigDto>({
    provider: 'GOOGLE_PLAY_MOCK',
    bucketUri: 'gs://pubsite_prod_rev_01234567890987654321',
    serviceAccountEmail: 'godotlaunch-play-reports@your-project.iam.gserviceaccount.com',
    dailySyncTime: '02:00',
    enabled: true,
  });

  const [summary, setSummary] = useState<StoreRevenueSummaryResponse | null>(null);
  const [imports, setImports] = useState<StoreReportImportResponse[]>([]);
  const [metrics, setMetrics] = useState<StoreDailyMetricResponse[]>([]);
  const [statements, setStatements] = useState<StoreRevenueStatementResponse[]>([]);
  const [publishedGames, setPublishedGames] = useState<any[]>([]);

  // Modals / Actions
  const [activateModal, setActivateModal] = useState<{
    open: boolean;
    publishId: string;
    isGameId?: boolean;
    title: string;
    packageName: string;
    priceProposed: string;
    contractType?: string;
  }>({
    open: false,
    publishId: '',
    isGameId: false,
    title: '',
    packageName: '',
    priceProposed: '199000',
    contractType: '',
  });

  const [payoutModal, setPayoutModal] = useState<{ open: boolean; publishId: string; title: string; periodKey: string }>({
    open: false,
    publishId: '',
    title: '',
    periodKey: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cfgRes, sumRes, impRes, metRes, stmRes, gamesRes] = await Promise.all([
        storeReportApi.getPublisherConfig().catch(() => null),
        storeReportApi.getStoreRevenueSummary().catch(() => null),
        storeReportApi.getAllReportImports().catch(() => null),
        storeReportApi.getAllDailyMetrics().catch(() => null),
        storeReportApi.getAllRevenueStatements().catch(() => null),
        storeReportApi.getEligibleStoreGames().catch(() => null),
      ]);

      if (cfgRes?.data) setConfig(cfgRes.data);
      if (sumRes?.data) setSummary(sumRes.data);
      if (impRes?.data) setImports(impRes.data);
      if (metRes?.data) setMetrics(metRes.data);
      if (stmRes?.data) setStatements(stmRes.data);
      if (gamesRes?.data) setPublishedGames(gamesRes.data);
    } catch (err: any) {
      console.error('Error fetching mock store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await storeReportApi.updatePublisherConfig(config);
      if (res.success) {
        setMessage({ type: 'success', text: 'Cập nhật cấu hình Publisher thành công!' });
        setConfig(res.data);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Cập nhật thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMock = async () => {
    if (!activateModal.packageName) {
      alert('Vui lòng nhập Package Name!');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const priceNum = Number(activateModal.priceProposed) || 99000;
      const res = activateModal.isGameId
        ? await storeReportApi.activateMockPublishForGame(activateModal.publishId, activateModal.packageName, priceNum)
        : await storeReportApi.activateMockPublish(activateModal.publishId, activateModal.packageName, priceNum);
      if (res.success) {
        setMessage({ type: 'success', text: `Đã kích hoạt Google Play Mock thành công cho game ${activateModal.title} (Giá niêm yết: ${priceNum.toLocaleString('vi-VN')} ₫)!` });
        setActivateModal({ open: false, publishId: '', isGameId: false, title: '', packageName: '', priceProposed: '199000', contractType: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Kích hoạt thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDownloads = async (publishId: string, title: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await storeReportApi.syncDownloads(publishId);
      if (res.success) {
        setMessage({ type: 'success', text: `Đồng bộ CSV lượt cài đặt thành công cho game ${title}! (${res.data.rowCount} chỉ số mới/cập nhật)` });
        fetchData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Đồng bộ thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPayout = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await storeReportApi.executeDemoPayout(payoutModal.publishId, payoutModal.periodKey);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `HẠCH TOÁN DOANH THU THÀNH CÔNG cho game ${payoutModal.title}! Doanh thu gộp (Gross): ${formatVnd(res.data.grossRevenue)} | Phí CH Play (15%): -${formatVnd(res.data.googleFeeAmount)} | Doanh thu thuần (Net 85%): ${formatVnd(res.data.netStoreProceeds)} | Phần chia Developer: ${formatVnd(res.data.developerEarnings)} | Phần Ví Hệ Thống: ${formatVnd(res.data.platformRetainedRevenue)}`,
        });
        setPayoutModal({ open: false, publishId: '', title: '', periodKey: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Demo payout thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = async (importId: string, filename: string) => {
    try {
      const blob = await storeReportApi.downloadAdminRawCsv(importId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `store_report_${importId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Không thể tải file CSV thô');
    }
  };

  const formatVnd = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  };

  const formatPriceInput = (val: string | number) => {
    const digits = String(val).replace(/[^0-9]/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(digits));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50/80 p-6 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-slate-900 relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Google Play Mock Reports & Revenue Share
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                MOCK MODE
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-2xl leading-relaxed">
              Quản lý tích hợp Google Play Console báo cáo lượt cài đặt hàng ngày, cấu hình tài khoản Publisher và thực hiện hạch toán chia 85% doanh thu thuần theo hợp đồng co-publishing.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium leading-relaxed">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Finance Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Store Revenue</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 font-display">
              {formatVnd(summary.totalGrossRevenue)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total gross revenue from store</p>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Net Store Proceeds (85%)</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Building size={18} />
              </div>
            </div>
            <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mb-1 font-display">
              {formatVnd(summary.totalNetStoreProceeds)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">After 15% Google Fee ({formatVnd(summary.totalGoogleFee)})</p>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Developer Payable</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CreditCard size={18} />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mb-1 font-display">
              {formatVnd(summary.totalDeveloperPayable)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Allocated earnings for developers</p>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Platform Retained</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1 font-display">
              {formatVnd(summary.totalPlatformRetained)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Net revenue retained by GodotLaunch</p>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 pt-1 text-sm font-semibold transition relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Game Xuất bản Mock ({publishedGames.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 pt-1 text-sm font-semibold transition relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'config'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu hình Publisher</span>
        </button>
        <button
          onClick={() => setActiveTab('imports')}
          className={`pb-3 pt-1 text-sm font-semibold transition relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'imports'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Lịch sử Import CSV ({imports.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className={`pb-3 pt-1 text-sm font-semibold transition relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'statements'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Payout Statements ({statements.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW GAMES */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 dark:bg-slate-950/40">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
                Danh sách Game trên Google Play
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các game đã ký hợp đồng Co-Publishing hoặc Mua đứt (Awaiting Build / Published)
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm game, tác giả, package..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Game</th>
                  <th className="p-4">Package Name</th>
                  <th className="p-4">Trạng thái Mock</th>
                  <th className="p-4">Lượt tải Mock</th>
                  <th className="p-4 text-right">Thao tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {publishedGames.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Chưa có game nào trong danh sách xuất bản.
                    </td>
                  </tr>
                ) : (
                  publishedGames
                    .filter((g: any) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      const title = (g.gameTitle || g.title || '').toLowerCase();
                      const creator = (g.creatorName || g.creatorEmail || '').toLowerCase();
                      const pkg = (g.packageName || '').toLowerCase();
                      return title.includes(q) || creator.includes(q) || pkg.includes(q);
                    })
                    .map((game: any) => {
                      const isMocked = !!game.packageName;
                      const gameId = game.gameId || game.id;
                      const title = game.gameTitle || game.title || 'Untitled Game';
                      const creatorName = game.creatorName || game.creatorEmail || 'N/A';
                      const extPubId = game.externalPublishId;

                      return (
                        <tr key={gameId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-medium">
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{title}</span>
                                {game.contractType === 'full_acquisition' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30 rounded-full">
                                    Mua đứt (100% Platform)
                                  </span>
                                )}
                                {game.contractType === 'co_publishing' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30 rounded-full">
                                    Co-Publishing ({game.revenueSplit ?? 80}%)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Tác giả: {creatorName}</div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                            {game.packageName ? game.packageName : <span className="text-slate-400 dark:text-slate-500 italic">Chưa kích hoạt</span>}
                          </td>
                          <td className="p-4">
                            {isMocked ? (
                              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold flex items-center w-fit gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                PUBLISHED_MOCK
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold flex items-center w-fit gap-1">
                                Chờ kích hoạt ({game.gameStatus || 'awaiting_build'})
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-semibold text-slate-900 dark:text-white">
                            {game.totalInstalls || metrics.filter((m) => m.gameId === gameId).reduce((acc, curr) => acc + (curr.dailyUserInstalls || 0), 0)} installs
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  setActivateModal({
                                    open: true,
                                    publishId: extPubId || gameId,
                                    isGameId: !extPubId,
                                    title: title,
                                    packageName: game.packageName || `com.godotlaunch.${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                                    priceProposed: String(game.priceProposed || (game.contractType === 'full_acquisition' ? 199000 : 99000)),
                                    contractType: game.contractType,
                                  })
                                }
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                              >
                                {isMocked ? 'Sửa Giá / Package' : 'Kích hoạt Mock'}
                              </button>

                              <button
                                onClick={() => handleSyncDownloads(extPubId || gameId, title)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Sync Lượt Tải</span>
                              </button>

                              <button
                                onClick={() =>
                                  setPayoutModal({
                                    open: true,
                                    publishId: extPubId || gameId,
                                    title: title,
                                    periodKey: `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-demo-01`,
                                  })
                                }
                                disabled={loading}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-gradient-to-r dark:from-amber-600 dark:to-orange-600 dark:hover:from-amber-500 dark:hover:to-orange-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Demo Payout</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PUBLISHER CONFIG */}
      {activeTab === 'config' && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-3xl">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 font-display">
            <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Cấu hình Publisher Google Play Mock
          </h3>
          <form onSubmit={handleUpdateConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Provider Type
              </label>
              <input
                type="text"
                disabled
                value={config.provider}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Google Cloud Storage Bucket URI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={config.bucketUri}
                onChange={(e) => setConfig({ ...config, bucketUri: e.target.value })}
                placeholder="gs://pubsite_prod_rev_01234567890987654321"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm font-mono focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Định dạng chuẩn Google Play Bucket: gs://pubsite_prod_rev_&lt;publisher-id&gt;
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Service Account Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={config.serviceAccountEmail}
                onChange={(e) => setConfig({ ...config, serviceAccountEmail: e.target.value })}
                placeholder="godotlaunch-play-reports@your-project.iam.gserviceaccount.com"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm font-mono focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                GCP Service Account Email dùng để xác thực quyền truy cập Play Console
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Daily Sync Time (UTC+7)
                </label>
                <input
                  type="text"
                  value={config.dailySyncTime}
                  onChange={(e) => setConfig({ ...config, dailySyncTime: e.target.value })}
                  placeholder="02:00"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center sm:pt-6">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Kích hoạt Daily Scheduler Sync
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
              >
                Lưu Cấu Hình
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: IMPORT HISTORY */}
      {activeTab === 'imports' && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
              Lịch sử Import Report CSV từ SeaweedFS
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Thời gian Sync</th>
                  <th className="p-4">Game / Package</th>
                  <th className="p-4">Source Object Path</th>
                  <th className="p-4">Kỳ Report</th>
                  <th className="p-4">Số dòng</th>
                  <th className="p-4">Checksum SHA-256</th>
                  <th className="p-4 text-right">Raw File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {imports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Chưa có đợt import CSV nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">
                        {new Date(imp.syncedAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{imp.gameTitle}</div>
                        <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{imp.packageName}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {imp.sourceObjectPath}
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{imp.reportMonth}</td>
                      <td className="p-4 text-xs font-bold text-slate-900 dark:text-white">{imp.rowCount} dòng</td>
                      <td className="p-4 font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                        {imp.fileChecksum}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDownloadCsv(imp.id, `installs_${imp.packageName}_${imp.reportMonth}.csv`)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Tải Raw CSV</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REVENUE STATEMENTS */}
      {activeTab === 'statements' && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display">
              Lịch sử Payout Statements & Chia doanh thu
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tổng số: <strong className="text-slate-900 dark:text-white">{statements.length}</strong> bản ghi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center">External Payout ID</th>
                  <th className="py-3.5 px-4 text-center">Game</th>
                  <th className="py-3.5 px-4 text-center">Gross Revenue</th>
                  <th className="py-3.5 px-4 text-center">Google Fee (15%)</th>
                  <th className="py-3.5 px-4 text-center">Net Proceeds (85%)</th>
                  <th className="py-3.5 px-4 text-center">Developer Earnings</th>
                  <th className="py-3.5 px-4 text-center">Platform Retained</th>
                  <th className="py-3.5 px-4 text-center">Ngày Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {statements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Chưa có Payout Statement nào được tạo.
                    </td>
                  </tr>
                ) : (
                  statements.map((stm) => (
                    <tr key={stm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-xs font-semibold border border-amber-500/20">
                          {stm.externalPayoutId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle font-semibold text-slate-900 dark:text-white">
                        {stm.gameTitle}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-slate-900 dark:text-white">
                        {formatVnd(stm.grossRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-xs text-rose-600 dark:text-rose-400 font-medium">
                        -{formatVnd(stm.googleFeeAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        {formatVnd(stm.netStoreProceeds)}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <div>{formatVnd(stm.developerEarnings)}</div>
                        <span className="text-[10px] inline-block mt-0.5 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-normal">
                          {stm.developerShareRate}% Hợp đồng
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-purple-700 dark:text-purple-300">
                        {formatVnd(stm.platformRetainedRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(stm.settledAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ACTIVATE MOCK */}
      {activateModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display">
                  <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Kích hoạt Google Play Mock
                </h3>
                <button
                  onClick={() => setActivateModal({ open: false, publishId: '', isGameId: false, title: '', packageName: '', priceProposed: '199000', contractType: '' })}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Thiết lập Package Name và Giá niêm yết bán trên Store để xuất bản game <strong>{activateModal.title}</strong> lên Google Play Mock.
              </p>

              {activateModal.contractType === 'full_acquisition' ? (
                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-500/40 rounded-xl text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                  ⚡ <strong>Hợp đồng Mua Đứt (Full Acquisition):</strong> Sàn GodotLaunch toàn quyền thiết lập giá bán trên CH Play. Khi phát sinh lượt tải, <strong>100% doanh thu thuần</strong> (sau trừ 15% phí CH Play) sẽ tự động chảy về <strong>Ví Hệ Thống GodotLaunch</strong>.
                </div>
              ) : (
                <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/40 rounded-xl text-xs text-cyan-800 dark:text-cyan-200 leading-relaxed">
                  🤝 <strong>Hợp đồng Đồng Phát Hành (Co-Publishing):</strong> Doanh thu thuần = Số lượt tải × Giá niêm yết (sau trừ 15% phí CH Play). Hệ thống sẽ trích % chia cho Developer theo hợp đồng.
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Package Name
                  </label>
                  <input
                    type="text"
                    value={activateModal.packageName}
                    onChange={(e) => setActivateModal({ ...activateModal, packageName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-emerald-700 dark:text-emerald-300 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Giá bán niêm yết trên Store (VNĐ / lượt tải)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatPriceInput(activateModal.priceProposed)}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/[^0-9]/g, '');
                        setActivateModal({ ...activateModal, priceProposed: rawDigits });
                      }}
                      placeholder="990.000"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-16 py-2.5 text-amber-700 dark:text-amber-300 font-mono text-sm focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                      đ
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      Hiển thị: <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatVnd(Number(activateModal.priceProposed) || 0)}</strong>
                    </span>
                    <span>Doanh thu gộp = Lượt tải × Giá niêm yết</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setActivateModal({ open: false, publishId: '', isGameId: false, title: '', packageName: '', priceProposed: '199000', contractType: '' })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleActivateMock}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  Xác nhận Kích hoạt
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: DEMO PAYOUT */}
      {payoutModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display">
                  <Play className="w-5 h-5 text-amber-500 fill-current" />
                  Demo Nhận Doanh Thu Google Play
                </h3>
                <button
                  onClick={() => setPayoutModal({ open: false, publishId: '', title: '', periodKey: '' })}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Mô phỏng đợt Google Play thanh toán tiền cho game <strong>{payoutModal.title}</strong>. Hệ thống sẽ tự động trừ 15% Google Fee, hạch toán 85% Net Proceeds và chia % cho Developer theo hợp đồng.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Period Key (Kỳ thanh toán)
                </label>
                <input
                  type="text"
                  value={payoutModal.periodKey}
                  onChange={(e) => setPayoutModal({ ...payoutModal, periodKey: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-amber-700 dark:text-amber-300 font-mono text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setPayoutModal({ open: false, publishId: '', title: '', periodKey: '' })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDemoPayout}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  Thực hiện Payout
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
