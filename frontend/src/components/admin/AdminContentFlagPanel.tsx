import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import contentFlagApi, {
  type ContentFlagItem,
  type ContentFlagStats,
} from '../../api/contentFlagApi';

type StatusFilter = 'all' | 'pending' | 'approved' | 'removed' | 'warned';
type OwnerFilter = 'all' | 'game' | 'marketplace_item';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  removed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  warned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xem xét',
  approved: 'Đã duyệt',
  removed: 'Đã xóa',
  warned: 'Đã cảnh báo',
};

export const AdminContentFlagPanel: React.FC = () => {
  const [flags, setFlags] = useState<ContentFlagItem[]>([]);
  const [stats, setStats] = useState<ContentFlagStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [preview, setPreview] = useState<ContentFlagItem | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contentFlagApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        ownerType: ownerFilter === 'all' ? undefined : ownerFilter,
        onlyFlagged: onlyFlagged || undefined,
        search: search || undefined,
        page,
        size: 20,
      });
      if (res.success) {
        setFlags(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ownerFilter, onlyFlagged, search, page]);

  const fetchStats = useCallback(async () => {
    const res = await contentFlagApi.stats();
    if (res.success) setStats(res.data);
  }, []);

  useEffect(() => {
    fetchFlags();
    fetchStats();
  }, [fetchFlags, fetchStats]);

  const handleAction = async (action: 'approve' | 'remove' | 'warn') => {
    if (!preview) return;
    setActionLoading(true);
    try {
      const fn =
        action === 'approve'
          ? contentFlagApi.approve
          : action === 'remove'
            ? contentFlagApi.remove
            : contentFlagApi.warn;
      const res = await fn(preview.id, actionNote || undefined);
      if (res.success) {
        setPreview(null);
        setActionNote('');
        fetchFlags();
        fetchStats();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 dark:text-red-400 font-bold';
    if (score >= 0.5) return 'text-amber-600 dark:text-amber-400 font-semibold';
    return 'text-slate-500';
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['total', 'pending', 'approved', 'removed', 'warned'] as const).map((k) => (
            <div
              key={k}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-center cursor-pointer"
              onClick={() => {
                if (k !== 'total') setStatusFilter(k);
                else setStatusFilter('all');
                setPage(0);
              }}
            >
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats[k]}</div>
              <div className="text-xs text-slate-500 capitalize">{STATUS_LABEL[k] ?? 'Tất cả'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ xem xét</option>
          <option value="approved">Đã duyệt</option>
          <option value="removed">Đã xóa</option>
          <option value="warned">Đã cảnh báo</option>
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => { setOwnerFilter(e.target.value as OwnerFilter); setPage(0); }}
          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Game & Marketplace</option>
          <option value="game">Game</option>
          <option value="marketplace_item">Marketplace</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={(e) => { setOnlyFlagged(e.target.checked); setPage(0); }}
            className="rounded"
          />
          Chỉ bị flag
        </label>

        <input
          type="text"
          placeholder="Tìm tên game / URL..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 w-48"
        />

        <button
          onClick={() => { fetchFlags(); fetchStats(); }}
          className="ml-auto text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Đang tải...</div>
        ) : flags.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldAlert size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Không có content flag nào</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-left">
                <th className="px-4 py-3 font-medium">Ảnh</th>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">NSFW Score</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-4 py-2">
                    <img
                      src={f.mediaUrl}
                      alt=""
                      className="w-14 h-10 object-cover rounded-lg bg-slate-100 dark:bg-slate-800"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                      {f.ownerName ?? '—'}
                    </div>
                    <div className="text-slate-400 capitalize">{f.ownerType.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-2 capitalize text-slate-600 dark:text-slate-400">
                    {f.mediaType ?? 'image'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={scoreColor(f.nsfwScore)}>
                      {(f.nsfwScore * 100).toFixed(1)}%
                    </span>
                    {f.flagged && (
                      <span className="ml-1 text-red-500 font-bold">!</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[f.status] ?? ''}`}>
                      {STATUS_LABEL[f.status] ?? f.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-400">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => { setPreview(f); setActionNote(''); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                      title="Xem chi tiết"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{totalElements} mục</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span>Trang {page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                <ShieldAlert size={16} className="text-amber-500" />
                Xem xét Content Flag
              </div>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <img
                src={preview.mediaUrl}
                alt=""
                className="w-full max-h-64 object-contain rounded-xl bg-slate-100 dark:bg-slate-800"
              />

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-400 text-xs">Tên</span>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{preview.ownerName}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Loại nội dung</span>
                  <p className="capitalize text-slate-700 dark:text-slate-300">{preview.ownerType.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">NSFW Score</span>
                  <p className={scoreColor(preview.nsfwScore)}>
                    {(preview.nsfwScore * 100).toFixed(2)}%
                    {preview.flagged && <span className="ml-1 text-red-500 text-xs">(FLAGGED)</span>}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Trạng thái</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[preview.status]}`}>
                    {STATUS_LABEL[preview.status]}
                  </span>
                </div>
              </div>

              {preview.reviewerNote && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-xs text-slate-400 block mb-1">Ghi chú trước:</span>
                  {preview.reviewerNote}
                </div>
              )}

              {/* Note input */}
              <textarea
                rows={2}
                placeholder="Ghi chú (tùy chọn)..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
              />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => handleAction('warn')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  <AlertTriangle size={14} /> Cảnh báo
                </button>
                <button
                  onClick={() => handleAction('remove')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
