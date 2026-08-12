import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Trash2, Search, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { reviewApi, ReviewResponse } from '../../api/reviewApi';

export const AdminReviewManagementPanel: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAllReviews = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch master list of all reviews from API
      const res = await reviewApi.getAllReviews(page, 20);
      if (res.data) {
        setReviews(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err: any) {
      console.error('Failed to load admin reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm(t('reviews.deleteConfirm', 'Bạn có chắc chắn muốn xóa nhận xét này?'))) return;
    setDeletingId(reviewId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await reviewApi.deleteReview(reviewId);
      setSuccessMsg(t('reviews.deleteSuccess', 'Đã xóa nhận xét thành công!'));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotalElements(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setErrorMsg(t('reviews.deleteFailed', 'Không thể xóa nhận xét. Vui lòng thử lại.'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews.filter(rev => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query ||
      (rev.userName || '').toLowerCase().includes(query) ||
      (rev.comment || '').toLowerCase().includes(query);
    const matchesRating = filterRating === 'all' || rev.rating === filterRating;
    return matchesQuery && matchesRating;
  });

  return (
    <div className="space-y-5">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-500" />
            {t('reviews.headerTitle', 'Quản lý Đánh giá & Bình luận')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('reviews.headerDesc', 'Xem, tìm kiếm và xóa các nhận xét/bình luận vi phạm trên toàn hệ thống.')}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAllReviews}
          disabled={loading}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('reviews.searchPlaceholder', 'Tìm theo tên người dùng, nội dung bình luận...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">{t('reviews.filterRatingLabel', 'Số sao:')}</span>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">{t('reviews.allRatings', 'Tất cả (1-5 sao)')}</option>
            <option value="5">5 ⭐⭐⭐⭐⭐</option>
            <option value="4">4 ⭐⭐⭐⭐</option>
            <option value="3">3 ⭐⭐⭐</option>
            <option value="2">2 ⭐⭐</option>
            <option value="1">1 ⭐ (Cần chú ý)</option>
          </select>
        </div>
      </div>

      {/* Reviews List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
            {t('reviews.loading', 'Đang tải danh sách đánh giá...')}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            {t('reviews.empty', 'Không tìm thấy đánh giá nào.')}
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="p-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-500/20">
                    {rev.userAvatarUrl ? (
                      <img src={rev.userAvatarUrl} alt={rev.userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (rev.userName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{rev.userName}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="flex items-center gap-0.5 ml-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rev.comment ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                        {rev.comment}
                      </p>
                    ) : (
                      <span className="text-[11px] italic text-slate-400">(Không có nhận xét văn bản)</span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deletingId === rev.id}
                    onClick={() => handleDeleteReview(rev.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === rev.id ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    <span>{t('reviews.deleteBtn', 'Xóa')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
