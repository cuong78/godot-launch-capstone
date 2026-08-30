import React, { useState, useEffect } from 'react';
import {
  Download,
  DollarSign,
  Globe,
  Package,
  BarChart3,
  TrendingUp,
  FileText,
  Clock,
  ShieldCheck,
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
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const totalInstalls = metrics.reduce((sum, m) => sum + (m.dailyUserInstalls || 0), 0);
  const totalEarnings = statements.reduce((sum, s) => sum + (s.developerEarnings || 0), 0);

  const currentGame = games.find((g) => g.gameId === selectedGameId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="w-7 h-7 text-emerald-400" />
                Hiệu Suất Google Play Store & Báo Cáo Doanh Thu
              </h2>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl">
              Theo dõi lượt cài đặt người dùng mới (Daily User Installs), lịch sử đồng bộ CSV báo cáo và thu nhập thực tế được chia theo tỷ lệ hợp đồng co-publishing.
            </p>
          </div>

          {/* Game Selector */}
          {games.length > 0 && (
            <div className="min-w-[240px]">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Chọn Game Xuất Bản</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-medium rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
              >
                {games.map((g) => {
                  const matchedGame = myGames.find((mg) => mg.id === g.gameId);
                  const titleStr = matchedGame ? matchedGame.title : 'Game ' + g.gameId.substring(0, 8);
                  return (
                    <option key={g.gameId} value={g.gameId}>
                      {titleStr} ({g.packageName || 'com.godotlaunch'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-300">Bạn chưa có game nào được xuất bản lên Store.</p>
          <p className="text-sm text-slate-500 mt-1">
            Hãy gửi game và ký hợp đồng co-publishing với GodotLaunch để bắt đầu theo dõi báo cáo lượt tải và doanh thu.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Tổng Lượt Cài Đặt Người Dùng Mới</span>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{totalInstalls.toLocaleString()}</div>
              <p className="text-xs text-slate-400">Daily User Installs đồng bộ từ CSV report</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Tổng Thu Nhập Đã Chia</span>
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-300 mb-1">{formatVnd(totalEarnings)}</div>
              <p className="text-xs text-slate-400">Tiền đã cộng trực tiếp vào Ví Developer</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Package Name</span>
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-lg font-mono font-semibold text-cyan-300 truncate mb-1">{currentGame?.packageName || 'N/A'}</div>
              <p className="text-xs text-slate-400">Trạng thái: <span className="text-emerald-400 font-medium">PUBLISHED MOCK</span></p>
            </div>
          </div>

          {/* Section 1: Revenue Statements */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Lịch sử Nhận Chia Doanh Thu (Revenue Statements)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase">
                    <th className="p-4">External Payout ID</th>
                    <th className="p-4">Kỳ Báo Cáo</th>
                    <th className="p-4">Gross Store Revenue</th>
                    <th className="p-4">Google Fee (15%)</th>
                    <th className="p-4">Net Proceeds (85%)</th>
                    <th className="p-4">Tỷ Lệ Hợp Đồng</th>
                    <th className="p-4">Thu Nhập Developer</th>
                    <th className="p-4 text-right">Ngày Nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {statements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Chưa có đợt chia doanh thu nào cho game này.
                      </td>
                    </tr>
                  ) : (
                    statements.map((stm) => (
                      <tr key={stm.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono text-xs text-amber-300 font-medium">{stm.externalPayoutId}</td>
                        <td className="p-4 font-medium text-white">{stm.periodKey}</td>
                        <td className="p-4 text-xs text-slate-300">{formatVnd(stm.grossRevenue)}</td>
                        <td className="p-4 text-xs text-rose-400">-{formatVnd(stm.googleFeeAmount)}</td>
                        <td className="p-4 text-xs font-semibold text-cyan-300">{formatVnd(stm.netStoreProceeds)}</td>
                        <td className="p-4 text-xs font-bold text-amber-400">{stm.developerShareRate}%</td>
                        <td className="p-4 text-xs font-bold text-emerald-400">{formatVnd(stm.developerEarnings)}</td>
                        <td className="p-4 text-right text-xs text-slate-400">{new Date(stm.settledAt).toLocaleDateString('vi-VN')}</td>
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
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Chi tiết Lượt cài đặt người dùng mới (Daily User Installs)
                </h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase sticky top-0 bg-slate-950">
                      <th className="p-3">Ngày</th>
                      <th className="p-3">Quốc gia</th>
                      <th className="p-3 text-right">Daily User Installs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {metrics.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500">
                          Chưa có chỉ số lượt tải nào.
                        </td>
                      </tr>
                    ) : (
                      metrics.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono text-xs text-slate-300">{m.metricDate}</td>
                          <td className="p-3 font-semibold text-xs text-emerald-300">{m.countryCode}</td>
                          <td className="p-3 text-right font-bold text-white">+{m.dailyUserInstalls}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CSV Imports & Download */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Lịch sử Đợt Import CSV Report
                </h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase sticky top-0 bg-slate-950">
                      <th className="p-3">Thời gian Sync</th>
                      <th className="p-3">Kỳ</th>
                      <th className="p-3">Số dòng</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {imports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          Chưa có lịch sử import CSV nào.
                        </td>
                      </tr>
                    ) : (
                      imports.map((imp) => (
                        <tr key={imp.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 text-xs text-slate-300">{new Date(imp.syncedAt).toLocaleDateString('vi-VN')}</td>
                          <td className="p-3 font-semibold text-xs text-emerald-300">{imp.reportMonth}</td>
                          <td className="p-3 text-xs font-bold text-white">{imp.rowCount} dòng</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDownloadCsv(imp.id, `installs_${imp.packageName}_${imp.reportMonth}.csv`)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 text-emerald-400" />
                              Tải CSV
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
