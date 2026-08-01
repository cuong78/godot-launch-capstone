import React from 'react';
import { Boxes, ChevronDown, ChevronUp, Code2, Download, ReceiptText, ShoppingBag } from 'lucide-react';
import { Button } from './Button';
import { PaymentResponse } from '../types';
import { resolveApiUrl } from '../utils/apiUrl';

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
                          href={downloadUrl}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                        >
                          <Download size={13} /> Download
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
    </div>
  );
};
