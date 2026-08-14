import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Trash2, Search, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { reviewApi, ReviewResponse } from '../../api/reviewApi';
import { AdminDialog } from './AdminDialog';

export const AdminReviewManagementPanel: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewResponse | null>(null);
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

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    setDeletingId(reviewToDelete.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await reviewApi.deleteReview(reviewToDelete.id);
      setSuccessMsg(t('reviews.deleteSuccess', 'Đã xóa nhận xét thành công!'));
      setReviews(prev => prev.filter(r => r.id !== reviewToDelete.id));
      setTotalElements(prev => Math.max(0, prev - 1));
      setReviewToDelete(null);
    } catch (err: any) {
      setErrorMsg(t('reviews.deleteFailed', 'Không thể xóa nhận xét. Vui lòng thử lại.'));
    } finally {
      setDeletingId(null);
    }
  };

  // Reply State
  const [replyingReview, setReplyingReview] = useState<ReviewResponse | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const handleSendReply = async () => {
    if (!replyingReview || !replyText.trim()) return;
    setReplySubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await reviewApi.replyToReview(replyingReview.id, replyText.trim());
      setSuccessMsg('Đã đăng phản hồi cho nhận xét thành công!');
      setReplyingReview(null);
      setReplyText('');
      fetchAllReviews();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi phản hồi. Vui lòng thử lại.';
      setErrorMsg(msg);
    } finally {
      setReplySubmitting(false);
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
            {t('reviews.headerTitle', 'Quản lý Đánh giá & Phản hồi')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('reviews.headerDesc', 'Xem, trả lời phản hồi chính thức và xóa các nhận xét/bình luận vi phạm trên toàn hệ thống.')}
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

                    {/* Existing Seller Reply Display */}
                    {rev.sellerReply && (
                      <div className="mt-2 text-xs bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-500 dark:text-indigo-400">
                          <span>👤 Phản hồi từ Tác giả sản phẩm</span>
                          {rev.sellerRepliedAt && <span className="font-mono opacity-80">{new Date(rev.sellerRepliedAt).toLocaleDateString('vi-VN')}</span>}
                        </div>
                        <p className="text-slate-700 dark:text-slate-200">{rev.sellerReply}</p>
                      </div>
                    )}

                    {/* Existing Admin Reply Display */}
                    {rev.adminReply && (
                      <div className="mt-2 text-xs bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-500 dark:text-sky-400">
                          <span>🛡️ Phản hồi từ Admin ({rev.adminRepliedUserName || 'Quản trị viên'})</span>
                          {rev.adminRepliedAt && <span className="font-mono opacity-80">{new Date(rev.adminRepliedAt).toLocaleDateString('vi-VN')}</span>}
                        </div>
                        <p className="text-slate-700 dark:text-slate-200">{rev.adminReply}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply & Delete Buttons */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReview(rev);
                      setReplyText(rev.adminReply || '');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 text-xs font-bold text-sky-500 hover:bg-sky-500/20 transition cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>{rev.adminReply ? 'Sửa phản hồi (Admin)' : 'Phản hồi (Admin)'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === rev.id}
                    onClick={() => setReviewToDelete(rev)}
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

      {/* Modern Confirmation Modal */}
      <AdminDialog
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        title={t('reviews.deleteModalTitle', 'Xác nhận xóa nhận xét')}
        description={t('reviews.deleteModalDesc', 'Hành động này sẽ gỡ bỏ nhận xét khỏi hệ thống và tự động gửi thông báo đến người dùng.')}
      >
        {reviewToDelete && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500 flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-rose-200">{t('reviews.deleteConfirmHeader', 'Bạn có chắc chắn muốn xóa nhận xét này?')}</p>
                <p className="mt-1 text-xs opacity-90 text-slate-700 dark:text-slate-300">
                  Tác giả <strong>{reviewToDelete.userName}</strong> sẽ nhận được thông báo Realtime giải thích nhận xét đã bị xóa do vi phạm tiêu chuẩn cộng đồng.
                </p>
              </div>
            </div>

            {/* Preview of review being deleted */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{reviewToDelete.userName}</span>
                  <span className="text-[11px] text-slate-400">({new Date(reviewToDelete.createdAt).toLocaleDateString('vi-VN')})</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= reviewToDelete.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {reviewToDelete.comment ? (
                <p className="text-xs text-slate-600 dark:text-slate-300 italic whitespace-pre-line">
                  "{reviewToDelete.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  (Không có nội dung văn bản)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                disabled={deletingId === reviewToDelete.id}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {t('reviews.cancel', 'Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteReview}
                disabled={deletingId === reviewToDelete.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingId === reviewToDelete.id ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>{t('reviews.confirmDelete', 'Xóa nhận xét')}</span>
              </button>
            </div>
          </div>
        )}
      </AdminDialog>

      {/* Admin Reply Modal */}
      <AdminDialog
        isOpen={!!replyingReview}
        onClose={() => setReplyingReview(null)}
        title="🛡️ Admin Phản hồi Đánh giá"
        description="Đăng câu trả lời chính thức từ phía Quản trị viên tới người dùng. Hệ thống sẽ tự động gửi thông báo Realtime cho tác giả nhận xét."
      >
        {replyingReview && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{replyingReview.userName}</span>
                  <span className="text-[11px] text-slate-400">({new Date(replyingReview.createdAt).toLocaleDateString('vi-VN')})</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= replyingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {replyingReview.comment && (
                <p className="text-xs text-slate-600 dark:text-slate-300 italic whitespace-pre-line">
                  "{replyingReview.comment}"
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nội dung phản hồi chính thức:
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Nhập câu trả lời hoặc giải đáp thắc mắc từ đại diện Quản trị viên..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                disabled={replySubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={replySubmitting || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {replySubmitting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <MessageSquare size={13} />
                )}
                <span>{replySubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}</span>
              </button>
            </div>
          </div>
        )}
      </AdminDialog>
    </div>
  );
};
