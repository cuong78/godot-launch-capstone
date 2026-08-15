import React from 'react';
import { Boxes, ChevronDown, ChevronUp, Code2, Download, ReceiptText, ShoppingBag, X, FileText, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { agreementApi } from '../api/agreementApi';
import { Button } from './Button';
import { PaymentResponse } from '../types';
import { resolveApiUrl } from '../utils/apiUrl';

const formatEulaContent = (text: string) => {
  if (!text) return <p className="text-slate-400">Đang tải thỏa thuận...</p>;

  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-3" />;

    // Title mapping (e.g. THỎA THUẬN CẤP PHÉP...)
    if (trimmed.toUpperCase() === trimmed && trimmed.length > 15 && !trimmed.match(/^[0-9]/)) {
      return (
        <h2 key={idx} className="text-base font-extrabold text-white tracking-wide border-b border-white/5 pb-2 mb-4 font-display">
          {trimmed}
        </h2>
      );
    }

    // Section headers (e.g. 1. CẤP PHÉP SỬ DỤNG NỘI DUNG)
    if (trimmed.match(/^[0-9]+\.\s/)) {
      return (
        <h3 key={idx} className="text-[13px] font-bold uppercase tracking-wider text-emerald-400 mt-5 mb-2 font-display flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {trimmed}
        </h3>
      );
    }

    // Bullet points (e.g. - Bán lại...)
    if (trimmed.startsWith('-')) {
      return (
        <li key={idx} className="ml-4 pl-1 text-[12.5px] leading-relaxed text-slate-300 dark:text-slate-200 list-disc font-sans">
          {trimmed.substring(1).trim()}
        </li>
      );
    }

    // Sub-sections (e.g. a. Quyền sở hữu:)
    if (trimmed.match(/^[a-z]\.\s/)) {
      return (
        <p key={idx} className="pl-3 text-[12.5px] leading-relaxed text-slate-300 dark:text-slate-200 font-sans">
          <span className="font-semibold text-emerald-300/90">{trimmed.substring(0, 3)}</span>
          {trimmed.substring(3)}
        </p>
      );
    }

    // Standard text line
    return (
      <p key={idx} className="text-[12.5px] leading-relaxed text-slate-300 dark:text-slate-200 font-sans">
        {trimmed}
      </p>
    );
  });
};

interface PurchasedInventoryPanelProps {
  payments: PaymentResponse[];
  onOpenPaymentCenter: () => void;
}

const formatMoney = (amount: number) =>
  amount === 0
    ? 'FREE'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return 'Chưa xác nhận';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Chưa xác nhận';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

export const PurchasedInventoryPanel: React.FC<PurchasedInventoryPanelProps> = ({
  payments,
  onOpenPaymentCenter,
}) => {
  const [showDownloadEula, setShowDownloadEula] = React.useState(false);
  const [downloadEulaText, setDownloadEulaText] = React.useState("");
  const [targetDownloadUrl, setTargetDownloadUrl] = React.useState("");
  const [downloadCheckboxChecked, setDownloadCheckboxChecked] = React.useState(false);

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    setTargetDownloadUrl(url);
    try {
      const statusRes = await agreementApi.getAcceptanceStatus('BUYER_EULA');
      if (statusRes.success && statusRes.data && statusRes.data.accepted) {
        window.location.href = url;
        return;
      }
    } catch (err) {
      console.error("Failed to fetch EULA acceptance status:", err);
    }

    try {
      const response = await agreementApi.getActive('BUYER_EULA');
      if (response.success && response.data) {
        setDownloadEulaText(response.data.content);
      } else {
        setDownloadEulaText("Thỏa thuận cấp phép người dùng cuối (EULA)");
      }
    } catch (err) {
      console.error(err);
      setDownloadEulaText("THỎA THUẬN CẤP PHÉP NGƯỜI DÙNG CUỐI (EULA) CỦA GODOT LAUNCH\n\nThỏa thuận Cấp phép Người dùng Cuối này áp dụng cho việc bạn sử dụng các tài nguyên kỹ thuật số được cung cấp thông qua Chợ ứng dụng của Godot Launch. Bằng cách nhấn chọn xác nhận đồng ý hoặc tải xuống nội dung, bạn đồng ý tuân thủ các điều khoản trong thỏa thuận này.");
    }
    setDownloadCheckboxChecked(false);
    setShowDownloadEula(true);
  };

  const confirmDownload = async () => {
    setShowDownloadEula(false);
    try {
      await agreementApi.accept('BUYER_EULA');
    } catch (err) {
      console.error("Failed to record EULA acceptance:", err);
    }
    if (targetDownloadUrl) {
      window.location.href = targetDownloadUrl;
    }
  };

  const [isExpanded, setIsExpanded] = React.useState(true);

  const paidPayments = React.useMemo(
    () =>
      payments
        .filter((payment) => payment.paymentStatus === 'PAID' && payment.orderId)
        .sort((left, right) => {
          const leftTime = new Date(left.paidAt || left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.paidAt || right.updatedAt || right.createdAt || 0).getTime();
          return rightTime - leftTime;
        }),
    [payments]
  );

  const totalSpent = React.useMemo(
    () => paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [paidPayments]
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
            <ShoppingBag size={15} className="text-emerald-500" /> Purchase Inventory
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kho lưu trữ những sản phẩm bạn đã thanh toán thành công trên marketplace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 dark:hover:text-slate-200 transition-studio"
          title={isExpanded ? 'Thu gọn inventory' : 'Mở inventory'}
        >
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Purchased Items</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{paidPayments.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-mono">Total Spent</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{formatMoney(totalSpent)}</p>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {paidPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center dark:border-slate-800 dark:bg-slate-950/35">
              <ReceiptText size={20} className="mx-auto text-slate-350 dark:text-slate-600" />
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Chưa có sản phẩm nào được thanh toán thành công.
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Khi giao dịch hoàn tất, asset hoặc source code sẽ tự xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {paidPayments.map((payment) => {
                const downloadUrl = resolveApiUrl(payment.downloadUrl);
                const isSourceCode = payment.marketplaceItemType === 'game_source';

                return (
                  <article
                    key={payment.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/35"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-850 dark:text-white truncate">
                          {payment.marketplaceItemTitle}
                        </p>
                        <p className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Order {payment.orderId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-amber-500">{formatMoney(payment.amount)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isSourceCode
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                          : 'border-sky-500/20 bg-sky-500/10 text-sky-500'
                      }`}>
                        {isSourceCode ? <Code2 size={11} /> : <Boxes size={11} />}
                        {isSourceCode ? 'Source Code' : 'Asset'}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        Paid
                      </span>
                      {!isSourceCode && (
                        <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-500">
                          Owned
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between gap-3">
                        <span>Ngày mua</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-right">
                          {formatTimestamp(payment.paidAt || payment.updatedAt || payment.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Người bán</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-right">
                          {payment.sellerFullName || payment.sellerEmail}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {downloadUrl ? (
                        <a
                          href="#"
                          onClick={(e) => handleDownloadClick(e, downloadUrl)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                        >
                          <Download size={13} /> {isSourceCode ? 'Download Game Package' : 'Download Asset Package'}
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          Purchased Successfully
                        </span>
                      )}
                      <Button variant="ghost" size="sm" onClick={onOpenPaymentCenter}>
                        Open Payment Center
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showDownloadEula && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowDownloadEula(false)}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0c101a]/95 dark:bg-[#070a13]/98 shadow-[0_32px_96px_rgba(0,0,0,0.85)] flex flex-col max-h-[82vh] animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-white text-base tracking-wide leading-none">Thỏa thuận Cấp phép EULA</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">PRE-DOWNLOAD EULA • THỎA THUẬN TRƯỚC KHI TẢI XUỐNG</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadEula(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {formatEulaContent(downloadEulaText)}
            </div>
            <div className="px-7 py-3 border-t border-white/5 bg-[#090d16]/40">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-transparent p-3 transition hover:border-amber-500/30">
                <input
                  type="checkbox"
                  checked={downloadCheckboxChecked}
                  onChange={(e) => setDownloadCheckboxChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-755 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <div className="text-xs text-slate-300">
                  Tôi đã đọc kĩ và đồng ý với Thỏa thuận Cấp phép Người dùng Cuối (EULA) của Godot Launch.
                </div>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4 bg-[#090d16]/80">
              <button
                type="button"
                onClick={() => setShowDownloadEula(false)}
                className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!downloadCheckboxChecked}
                onClick={confirmDownload}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:pointer-events-none px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} strokeWidth={2.5} />
                Tôi đồng ý
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
