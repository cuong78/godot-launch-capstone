import React, { useState } from 'react';
import { ShieldAlert, CreditCard, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { DisputeResponse, disputeApi } from '../api/disputeApi';

interface DisputeRepaymentModalProps {
  dispute: DisputeResponse;
  onPaymentInitiated?: () => void;
}

export const DisputeRepaymentModal: React.FC<DisputeRepaymentModalProps> = ({
  dispute,
  onPaymentInitiated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = dispute.sellerOutstandingDebt || dispute.refundAmount || 0;

  const handlePayOSClick = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await disputeApi.createDisputeRepayment(dispute.id);
      if (response.success && response.data?.checkoutUrl) {
        if (onPaymentInitiated) onPaymentInitiated();
        window.location.href = response.data.checkoutUrl;
      } else {
        setError(response.message || 'Không thể tạo liên kết thanh toán PayOS. Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      console.error('Lỗi khởi tạo PayOS dispute repayment:', err);
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo liên kết PayOS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 flex flex-col items-center text-center relative">
        
        {/* Top Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-5 animate-pulse">
          <ShieldAlert size={34} />
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-bold font-display text-white tracking-wide">
          Yêu Cầu Thanh Toán Nợ Vi Phạm
        </h2>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Tài khoản của bạn tạm thời bị khóa do khoản nợ bồi thường vi phạm bản quyền từ khiếu nại{' '}
          <span className="font-mono text-amber-400 font-semibold">#{dispute.id.slice(0, 8)}</span> cho game{' '}
          <span className="text-slate-200 font-medium">"{dispute.gameTitle || 'Sản phẩm'}"</span>.
        </p>

        {/* Amount Box */}
        <div className="w-full mt-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Số tiền nợ cần thanh toán
          </span>
          <span className="text-3xl font-extrabold text-amber-400 font-mono">
            {amount.toLocaleString('vi-VN')} <span className="text-base font-sans font-bold">VND</span>
          </span>
          {dispute.refundDeadline && (
            <span className="text-xs text-rose-400 mt-2 font-mono flex items-center gap-1">
              <AlertCircle size={13} />
              Hạn hoàn trả: {new Date(dispute.refundDeadline).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-left">
            {error}
          </div>
        )}

        {/* Notice text */}
        <p className="text-xs text-slate-400 mt-4 italic">
          * Bạn cần hoàn tất thanh toán để hệ thống tự động cấn trừ nợ và khôi phục lại quyền Developer.
        </p>

        {/* Action Button */}
        <button
          onClick={handlePayOSClick}
          disabled={loading}
          className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang khởi tạo cổng PayOS...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Thanh toán ngay qua PayOS
              <ExternalLink size={16} className="ml-1 opacity-70" />
            </>
          )}
        </button>

      </div>
    </div>
  );
};
