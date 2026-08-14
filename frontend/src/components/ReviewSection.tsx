import React, { useEffect, useState } from 'react';
import { Star, Trash2, Send, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { reviewApi, ReviewResponse, ReviewSummaryDto } from '../api/reviewApi';

interface ReviewSectionProps {
  productId: string;
  productType: 'game' | 'asset';
  currentUserId?: string;
  currentUserEmail?: string;
  isAdmin?: boolean;
  sellerId?: string;
  sellerEmail?: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ 
  productId, productType, currentUserId, currentUserEmail, isAdmin, sellerId, sellerEmail 
}) => {
  const [summary, setSummary] = useState<ReviewSummaryDto | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Reply State
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const isSeller = Boolean(
    (currentUserId && sellerId && currentUserId === sellerId) ||
    (currentUserEmail && sellerEmail && currentUserEmail.toLowerCase() === sellerEmail.toLowerCase())
  );
  const isSellerOrAdmin = Boolean(isAdmin || isSeller);

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      setReplySubmitting(true);
      setErrorMsg(null);
      await reviewApi.replyToReview(reviewId, replyText.trim());
      setSuccessMsg('Phản hồi đánh giá thành công!');
      setReplyingReviewId(null);
      setReplyText('');
      fetchReviewData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi.';
      setErrorMsg(msg);
    } finally {
      setReplySubmitting(false);
    }
  };

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch summary
      const summaryRes = productType === 'game'
        ? await reviewApi.getGameReviewSummary(productId)
        : await reviewApi.getAssetReviewSummary(productId);

      if (summaryRes.data) {
        setSummary(summaryRes.data);
        if (summaryRes.data.currentUserReview) {
          setRating(summaryRes.data.currentUserReview.rating);
          setComment(summaryRes.data.currentUserReview.comment || '');
          setIsEditing(true);
        }
      }

      // Fetch list of reviews
      const listRes = productType === 'game'
        ? await reviewApi.getGameReviews(productId, 0, 10)
        : await reviewApi.getAssetReviews(productId, 0, 10);

      if (listRes.data && listRes.data.content) {
        setReviews(listRes.data.content);
      }
    } catch (err: any) {
      console.error('Failed to load review data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviewData();
    }
  }, [productId, productType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setErrorMsg('Vui lòng chọn số sao đánh giá từ 1 đến 5 sao.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        [productType === 'game' ? 'gameId' : 'assetId']: productId,
        rating,
        comment,
      };

      await reviewApi.createOrUpdateReview(payload);
      setSuccessMsg(isEditing ? 'Cập nhật đánh giá thành công!' : 'Gửi đánh giá thành công!');
      fetchReviewData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete modal state
  const [reviewToDeleteId, setReviewToDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!reviewToDeleteId) return;
    try {
      setDeleting(true);
      await reviewApi.deleteReview(reviewToDeleteId);
      setSuccessMsg('Xóa đánh giá thành công!');
      if (summary?.currentUserReview?.id === reviewToDeleteId) {
        setIsEditing(false);
        setComment('');
        setRating(5);
      }
      setReviewToDeleteId(null);
      fetchReviewData();
    } catch (err: any) {
      setErrorMsg('Không thể xóa đánh giá.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl text-slate-850 dark:text-slate-100 mt-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <MessageSquare className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
        <h2 className="text-xl font-bold tracking-tight text-slate-850 dark:text-white">Đánh giá & Bình luận từ người mua</h2>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Đang tải đánh giá...</div>
      ) : (
        <div className="space-y-8">
          {/* Summary Header & Star Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-955/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800/80">
            {/* Average Rating Score */}
            <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-4 md:pb-0">
              <span className="text-5xl font-extrabold text-slate-850 dark:text-white tracking-tight">
                {summary?.averageRating ? summary.averageRating.toFixed(1) : '0.0'}
              </span>
              <div className="flex items-center gap-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(summary?.averageRating || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Dựa trên {summary?.totalReviews || 0} lượt đánh giá
              </span>
            </div>

            {/* Star Breakdown Bars */}
            <div className="md:col-span-2 flex flex-col justify-center gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary?.ratingBreakdown?.[star] || 0;
                const total = summary?.totalReviews || 1;
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-slate-650 dark:text-slate-500">{count} ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Review Form (Only for eligible buyers) */}
          {summary?.userCanReview ? (
            <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
              <h3 className="text-md font-semibold mb-4 text-indigo-600 dark:text-indigo-300 flex items-center justify-between">
                <span>{isEditing ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}</span>
                {isEditing && (
                  <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Đã đánh giá trước đó
                  </span>
                )}
              </h3>

              {/* Star Rating Picker */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Chọn mức đánh giá:</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 cursor-pointer ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-700 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-semibold text-amber-600 dark:text-amber-300">
                    {hoverRating || rating} sao
                  </span>
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Nhận xét ngắn (Tối đa 1000 ký tự):
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Chia sẻ cảm nhận của bạn về chất lượng game/asset này..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <div className="text-right text-xs text-slate-450 dark:text-slate-500 mt-1">
                  {comment.length}/1000 ký tự
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Đang gửi...' : isEditing ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-550 dark:text-slate-400 text-xs text-center">
              Chỉ những người đã mua sản phẩm này mới có thể viết đánh giá & nhận xét.
            </div>
          )}

          {/* List of Reviews */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tất cả nhận xét ({reviews.length})</h3>

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên mua và đánh giá!
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl flex flex-col gap-2 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/10 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-300">
                          {rev.userAvatarUrl ? (
                            <img src={rev.userAvatarUrl} alt={rev.userName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            rev.userName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block">{rev.userName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      {/* Stars & Delete Option */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-800'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Reply Option for Seller */}
                        {isSeller && (
                          <button
                            onClick={() => {
                              if (replyingReviewId === rev.id) {
                                setReplyingReviewId(null);
                              } else {
                                setReplyingReviewId(rev.id);
                                setReplyText(rev.sellerReply || '');
                              }
                            }}
                            title="Tác giả phản hồi nhận xét này"
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            {rev.sellerReply ? 'Sửa phản hồi (Tác giả)' : 'Trả lời (Tác giả)'}
                          </button>
                        )}

                        {/* Reply Option for Admin */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (replyingReviewId === rev.id) {
                                setReplyingReviewId(null);
                              } else {
                                setReplyingReviewId(rev.id);
                                setReplyText(rev.adminReply || '');
                              }
                            }}
                            title="Admin phản hồi nhận xét này"
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            {rev.adminReply ? 'Sửa phản hồi (Admin)' : 'Trả lời (Admin)'}
                          </button>
                        )}

                        {(isAdmin || (currentUserId && currentUserId === rev.userId)) && (
                          <button
                            onClick={() => setReviewToDeleteId(rev.id)}
                            title={isAdmin ? "Admin xóa đánh giá này" : "Xóa đánh giá"}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-sm text-slate-655 dark:text-slate-300 mt-1 pl-11 whitespace-pre-line leading-relaxed">
                        {rev.comment}
                      </p>
                    )}

                    {/* Existing Seller Reply Display */}
                    {rev.sellerReply && (
                      <div className="mt-3 ml-11 p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-500/30 rounded-xl space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-indigo-800 dark:text-indigo-200">Phản hồi từ Tác giả sản phẩm</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                              👤 Tác giả
                            </span>
                          </div>
                          {rev.sellerRepliedAt && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {new Date(rev.sellerRepliedAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-655 dark:text-slate-200 whitespace-pre-line leading-relaxed pl-1">
                          {rev.sellerReply}
                        </p>
                      </div>
                    )}

                    {/* Existing Admin Reply Display */}
                    {rev.adminReply && (
                      <div className="mt-3 ml-11 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-500/30 rounded-xl space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-rose-800 dark:text-rose-200">
                              {rev.adminRepliedUserName || 'Quản trị viên'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                              🛡️ Admin
                            </span>
                          </div>
                          {rev.adminRepliedAt && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {new Date(rev.adminRepliedAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-655 dark:text-slate-200 whitespace-pre-line leading-relaxed pl-1">
                          {rev.adminReply}
                        </p>
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {replyingReviewId === rev.id && (
                      <div className="mt-3 ml-11 p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 rounded-xl space-y-3 animate-fade-in">
                        <label className="block text-xs font-semibold text-indigo-650 dark:text-indigo-300">
                          {isAdmin ? '🛡️ Quản trị viên phản hồi:' : '👤 Tác giả sản phẩm phản hồi:'}
                        </label>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          maxLength={1000}
                          rows={3}
                          placeholder="Nhập câu trả lời/phản hồi của bạn dành cho người mua này..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingReviewId(null)}
                            disabled={replySubmitting}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendReply(rev.id)}
                            disabled={replySubmitting || !replyText.trim()}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            {replySubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {reviewToDeleteId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setReviewToDeleteId(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-205 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">Xác nhận xóa đánh giá</h3>
            </div>
            <p className="text-sm text-slate-655 dark:text-slate-300">
              {isAdmin
                ? "Bạn có chắc chắn muốn xóa đánh giá này khỏi hệ thống? Tác giả đánh giá sẽ nhận được thông báo giải thích do vi phạm quy định."
                : "Bạn có chắc chắn muốn xóa đánh giá của mình? Hành động này không thể hoàn tác."}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-305 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xóa đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
