import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  DollarSign,
  Globe,
  Package,
  BarChart3,
  TrendingUp,
  FileText,
  ShieldCheck,
  ChevronDown,
  Check,
  Gamepad2,
} from 'lucide-react';
import { storeReportApi } from '../../api/storeReportApi';
import {
  ExternalPublishResponse,
  StoreDailyMetricResponse,
  StoreReportImportResponse,
  StoreRevenueStatementResponse,
  GameResponse,
} from '../../types';

interface DeveloperStorePerformanceProps {
  myGames?: GameResponse[];
}

export const DeveloperStorePerformance: React.FC<DeveloperStorePerformanceProps> = ({ myGames = [] }) => {
  const [games, setGames] = useState<ExternalPublishResponse[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState<StoreDailyMetricResponse[]>([]);
  const [imports, setImports] = useState<StoreReportImportResponse[]>([]);
  const [statements, setStatements] = useState<StoreRevenueStatementResponse[]>([]);

  const [isGameSelectOpen, setIsGameSelectOpen] = useState(false);
  const selectContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGameSelectOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (selectContainerRef.current && !selectContainerRef.current.contains(e.target as Node)) {
        setIsGameSelectOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGameSelectOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isGameSelectOpen]);

  const fetchGames = async () => {
    try {
      const res = await storeReportApi.getDeveloperStoreGames();
      const fetchedGames: ExternalPublishResponse[] = res.data || [];

      // Combine with myGames prop as fallback if external_publish records don't exist yet for some store games
      const fallbackGames: ExternalPublishResponse[] = (myGames || [])
        .filter((g) => g.publishingType !== 'marketplace_listing')
        .map((g) => ({
          id: g.id,
          gameId: g.id,
          status: (g.status === 'published' ? 'live' : 'pending') as any,
          packageName: `com.godotlaunch.${g.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          provider: 'google_play_mock',
        }));

      // Merge avoiding duplicates by gameId
      const mergedMap = new Map<string, ExternalPublishResponse>();
      for (const item of [...fetchedGames, ...fallbackGames]) {
        if (!mergedMap.has(item.gameId)) {
          mergedMap.set(item.gameId, item);
        }
      }
      const combined = Array.from(mergedMap.values());
      setGames(combined);
      if (combined.length > 0 && !selectedGameId) {
        setSelectedGameId(combined[0].gameId);
      }
    } catch (err) {
      console.error('Error fetching developer store games:', err);
      const fallbackGames: ExternalPublishResponse[] = (myGames || [])
        .filter((g) => g.publishingType !== 'marketplace_listing')
        .map((g) => ({
          id: g.id,
          gameId: g.id,
          status: (g.status === 'published' ? 'live' : 'pending') as any,
          packageName: `com.godotlaunch.${g.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          provider: 'google_play_mock',
        }));
      setGames(fallbackGames);
      if (fallbackGames.length > 0 && !selectedGameId) {
        setSelectedGameId(fallbackGames[0].gameId);
      }
    }
  };

  const fetchGameDetails = async (gameId: string) => {
    if (!gameId) return;
    setLoading(true);
    try {
      const [metRes, impRes, stmRes] = await Promise.all([
        storeReportApi.getDeveloperDailyMetrics(gameId).catch(() => null),
        storeReportApi.getDeveloperReportImports(gameId).catch(() => null),
        storeReportApi.getDeveloperRevenueStatements(gameId).catch(() => null),
      ]);

      if (metRes?.data) setMetrics(metRes.data);
      if (impRes?.data) setImports(impRes.data);
      if (stmRes?.data) setStatements(stmRes.data);
    } catch (err) {
      console.error('Error fetching game details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      fetchGameDetails(selectedGameId);
    }
  }, [selectedGameId]);

  const handleDownloadCsv = async (importId: string, filename: string) => {
    if (!selectedGameId) return;
    try {
      const blob = await storeReportApi.downloadDeveloperRawCsv(selectedGameId, importId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `store_report_${selectedGameId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể tải file CSV thô');
    }
  };

  const formatVnd = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  };

  const totalInstalls = metrics.reduce((sum, m) => sum + (m.dailyUserInstalls || 0), 0);
  const totalEarnings = statements.reduce((sum, s) => sum + (s.developerEarnings || 0), 0);

  const currentGame = games.find((g) => g.gameId === selectedGameId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50/80 p-6 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-slate-900 relative backdrop-blur-md z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Globe size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                Hiệu Suất Google Play Store & Báo Cáo Doanh Thu
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-2xl">
              Theo dõi lượt cài đặt người dùng mới (Daily User Installs), lịch sử đồng bộ CSV báo cáo và thu nhập thực tế được chia theo tỷ lệ hợp đồng co-publishing.
            </p>
          </div>

          {/* Custom Game Selector */}
          {games.length > 0 && (
            <div ref={selectContainerRef} className="relative min-w-[260px] md:min-w-[300px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Gamepad2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                Chọn Game Xuất Bản
              </label>
              <button
                type="button"
                onClick={() => setIsGameSelectOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all shadow-sm cursor-pointer ${
                  isGameSelectOpen
                    ? "border-emerald-500 bg-emerald-500/10 text-slate-900 dark:text-white ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-800 hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-slate-900 dark:text-white text-sm">
                      {(() => {
                        const matchedGame = myGames.find((mg) => mg.id === currentGame?.gameId);
                        return matchedGame ? matchedGame.title : 'Game ' + (currentGame?.gameId?.substring(0, 8) || '');
                      })()}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      {currentGame?.packageName || 'com.godotlaunch'}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                    isGameSelectOpen ? "rotate-180 text-emerald-500" : ""
                  }`}
                />
              </button>

              {isGameSelectOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-full min-w-[280px] max-h-64 overflow-y-auto rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-1.5 shadow-xl dark:border-slate-700/80 dark:bg-slate-900/95 animate-scale-up">
                  {games.map((g) => {
                    const matchedGame = myGames.find((mg) => mg.id === g.gameId);
                    const titleStr = matchedGame ? matchedGame.title : 'Game ' + g.gameId.substring(0, 8);
                    const pkgStr = g.packageName || 'com.godotlaunch';
                    const isSelected = g.gameId === selectedGameId;

                    return (
                      <button
                        key={g.gameId}
                        type="button"
                        onClick={() => {
                          setSelectedGameId(g.gameId);
                          setIsGameSelectOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{titleStr}</div>
                          <div className="text-[11px] font-mono opacity-80 truncate">{pkgStr}</div>
                        </div>
                        {isSelected && <Check size={16} className="text-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
          <Package className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">Bạn chưa có game nào được xuất bản lên Store.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hãy gửi game và ký hợp đồng co-publishing với GodotLaunch để bắt đầu theo dõi báo cáo lượt tải và doanh thu.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Tổng Lượt Cài Đặt Người Dùng Mới</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-display mb-1">
                {totalInstalls.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily User Installs đồng bộ từ CSV report</p>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Tổng Thu Nhập Đã Chia</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-300 font-display mb-1">
                {formatVnd(totalEarnings)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tiền đã cộng trực tiếp vào Ví Developer</p>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Package Name</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="text-sm font-mono font-bold text-cyan-700 dark:text-cyan-300 truncate mb-1">
                {currentGame?.packageName || 'N/A'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trạng thái: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PUBLISHED MOCK</span>
              </p>
            </div>
          </div>

          {/* Section 1: Revenue Statements */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Lịch sử Nhận Chia Doanh Thu (Revenue Statements)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tổng số: <strong className="text-slate-900 dark:text-white">{statements.length}</strong> đợt
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center">External Payout ID</th>
                    <th className="py-3.5 px-4 text-center">Kỳ Báo Cáo</th>
                    <th className="py-3.5 px-4 text-center">Gross Store Revenue</th>
                    <th className="py-3.5 px-4 text-center">Google Fee (15%)</th>
                    <th className="py-3.5 px-4 text-center">Net Proceeds (85%)</th>
                    <th className="py-3.5 px-4 text-center">Tỷ Lệ Hợp Đồng</th>
                    <th className="py-3.5 px-4 text-center">Thu Nhập Developer</th>
                    <th className="py-3.5 px-4 text-center">Ngày Nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {statements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Chưa có đợt chia doanh thu nào cho game này.
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
                        <td className="py-3.5 px-4 text-center align-middle font-semibold text-slate-900 dark:text-white">{stm.periodKey}</td>
                        <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-slate-900 dark:text-white">{formatVnd(stm.grossRevenue)}</td>
                        <td className="py-3.5 px-4 text-center align-middle text-xs text-rose-600 dark:text-rose-400 font-medium">-{formatVnd(stm.googleFeeAmount)}</td>
                        <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-cyan-700 dark:text-cyan-300">{formatVnd(stm.netStoreProceeds)}</td>
                        <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-amber-700 dark:text-amber-400">
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {stm.developerShareRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center align-middle text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(stm.developerEarnings)}</td>
                        <td className="py-3.5 px-4 text-center align-middle text-xs text-slate-500 dark:text-slate-400 font-medium">{new Date(stm.settledAt).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Daily User Install Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Installs Table */}
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Chi tiết Lượt cài đặt người dùng mới (Daily User Installs)
                </h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-center border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-950">
                      <th className="py-3 px-4 text-center">Ngày</th>
                      <th className="py-3 px-4 text-center">Quốc gia</th>
                      <th className="py-3 px-4 text-center">Daily User Installs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {metrics.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                          Chưa có chỉ số lượt tải nào.
                        </td>
                      </tr>
                    ) : (
                      metrics.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center align-middle font-mono text-xs text-slate-600 dark:text-slate-300">{m.metricDate}</td>
                          <td className="py-3 px-4 text-center align-middle font-semibold text-xs text-emerald-600 dark:text-emerald-400">{m.countryCode}</td>
                          <td className="py-3 px-4 text-center align-middle font-bold text-slate-900 dark:text-white">+{m.dailyUserInstalls}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CSV Imports & Download */}
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-display flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Lịch sử Đợt Import CSV Report
                </h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-center border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-950">
                      <th className="py-3 px-4 text-center">Thời gian Sync</th>
                      <th className="py-3 px-4 text-center">Kỳ</th>
                      <th className="py-3 px-4 text-center">Số dòng</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {imports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                          Chưa có lịch sử import CSV nào.
                        </td>
                      </tr>
                    ) : (
                      imports.map((imp) => (
                        <tr key={imp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center align-middle text-xs text-slate-600 dark:text-slate-400">{new Date(imp.syncedAt).toLocaleDateString('vi-VN')}</td>
                          <td className="py-3 px-4 text-center align-middle font-semibold text-xs text-emerald-600 dark:text-emerald-400">{imp.reportMonth}</td>
                          <td className="py-3 px-4 text-center align-middle text-xs font-bold text-slate-900 dark:text-white">{imp.rowCount} dòng</td>
                          <td className="py-3 px-4 text-center align-middle">
                            <button
                              onClick={() => handleDownloadCsv(imp.id, `installs_${imp.packageName}_${imp.reportMonth}.csv`)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Tải CSV</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
