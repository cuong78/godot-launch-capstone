import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { Button } from '../Button';
import { PaymentResponse } from '../../types';

const PAYMENTS_PER_PAGE = 6;

type PaymentSortOption =
  | 'all'
  | 'PAID'
  | 'PENDING'
  | 'CANCELLED'
  | 'EXPIRED';

const formatMoney = (amount: number) =>
  amount === 0
    ? 'FREE'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getStatusMeta = (status: PaymentResponse['paymentStatus']) => {
  switch (status) {
    case 'PAID':
      return {
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
        icon: <CheckCircle2 size={12} />,
      };
    case 'PROCESSING':
      return {
        badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        icon: <Clock3 size={12} />,
      };
    case 'FAILED':
      return {
        badgeClass: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
        icon: <XCircle size={12} />,
      };
    case 'CANCELLED':
    case 'EXPIRED':
      return {
        badgeClass: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
        icon: <XCircle size={12} />,
      };
    case 'PENDING':
    default:
      return {
        badgeClass: 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
        icon: <Clock3 size={12} />,
      };
  }
};

const getPaymentSortTimestamp = (payment: PaymentResponse) => {
  const value = payment.updatedAt || payment.paidAt || payment.createdAt;
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

interface AdminPaymentVerificationPanelProps {
  onRefreshStateChange?: (state: {
    refresh: () => Promise<void>;
    isRefreshing: boolean;
    isLoadingPrimary: boolean;
    isLoadingSecondary?: boolean;
  }) => void;
}

export const AdminPaymentVerificationPanel: React.FC<
  AdminPaymentVerificationPanelProps
> = ({ onRefreshStateChange }) => {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);
  const [sortOption, setSortOption] = useState<PaymentSortOption>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await paymentApi.getAdminPayments();
      if (res.success && res.data) {
        setPayments(res.data);
      } else {
        setError(res.message || 'Failed to load payments');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    onRefreshStateChange?.({
      refresh: fetchPayments,
      isRefreshing: isLoading,
      isLoadingPrimary: isLoading,
    });
  }, [fetchPayments, isLoading, onRefreshStateChange]);

  const sortedPayments = useMemo(() => {
    const items =
      sortOption === 'all'
        ? [...payments]
        : payments.filter((payment) => payment.paymentStatus === sortOption);

    items.sort(
      (left, right) =>
        getPaymentSortTimestamp(right) - getPaymentSortTimestamp(left),
    );

    return items;
  }, [payments, sortOption]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedPayments.length / PAYMENTS_PER_PAGE),
  );

  const paginatedPayments = useMemo(() => {
    const startIndex = currentPage * PAYMENTS_PER_PAGE;
    return sortedPayments.slice(startIndex, startIndex + PAYMENTS_PER_PAGE);
  }, [currentPage, sortedPayments]);

  useEffect(() => {
    setCurrentPage(0);
  }, [sortOption]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const openPaymentDetail = async (paymentId: string) => {
    try {
      const res = await paymentApi.getAdminPaymentDetail(paymentId);
      if (res.success && res.data) {
        setSelectedPayment(res.data);
        setIsModalOpen(true);
      } else {
        alert(res.message || 'Failed to load payment detail');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to load payment detail');
    }
  };

  const refreshSelectedPayment = async () => {
    if (!selectedPayment) {
      return;
    }

    setIsRefreshingDetail(true);
    try {
      const res = await paymentApi.getAdminPaymentDetail(selectedPayment.id);
      if (res.success && res.data) {
        setSelectedPayment(res.data);
      } else {
        alert(res.message || 'Failed to refresh payment detail');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to refresh payment detail');
    } finally {
      setIsRefreshingDetail(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2 text-sm shadow-[0_10px_24px_rgba(148,163,184,0.12)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-none">
            <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <ArrowUpDown size={14} />
              Sort
            </span>
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as PaymentSortOption)
              }
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none dark:text-slate-200"
            >
              <option value="all">All payments</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-semibold">Order</th>
                  <th className="p-4 font-semibold">Buyer</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Payment Status</th>
                  <th className="p-4 font-semibold">Updated</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      Loading payment sessions...
                    </td>
                  </tr>
                ) : sortedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No payment sessions are available right now.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => {
                    const statusMeta = getStatusMeta(payment.paymentStatus);

                    return (
                      <tr key={payment.id} className="border-t border-slate-200/70 dark:border-slate-800/70">
                        <td className="p-4">
                          <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {(payment.orderId || payment.id).slice(0, 8).toUpperCase()}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {payment.marketplaceItemTitle}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{payment.buyerFullName}</div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{payment.buyerEmail}</div>
                        </td>
                        <td className="p-4 font-semibold text-amber-500">{formatMoney(payment.amount)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}>
                            {statusMeta.icon}
                            {payment.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(payment.updatedAt)}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => openPaymentDetail(payment.id)}>
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {sortedPayments.length > 0 ? (
            <div className="flex justify-end gap-2 border-t border-slate-200/70 px-4 py-4 dark:border-slate-800/70">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                disabled={currentPage === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-studio disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages - 1, page + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-studio disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isModalOpen && selectedPayment && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-850 dark:text-white">Payment Detail</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Order {(selectedPayment.orderId || selectedPayment.id).slice(0, 8).toUpperCase()} • {selectedPayment.marketplaceItemTitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw size={14} className={isRefreshingDetail ? 'animate-spin' : ''} />}
                  onClick={refreshSelectedPayment}
                >
                  Refresh
                </Button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-studio"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.95fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Payment Timeline</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Created At</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{formatTimestamp(selectedPayment.createdAt)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Updated At</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{formatTimestamp(selectedPayment.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Paid At</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{formatTimestamp(selectedPayment.paidAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Order Information</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Buyer</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.buyerFullName}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Email</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.buyerEmail}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Product</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.marketplaceItemTitle}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Amount</span>
                      <span className="font-semibold text-amber-500 text-right">{formatMoney(selectedPayment.amount)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Payment Status</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.paymentStatus}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Reference</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.paymentReference || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">PayOS Order Code</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.payosOrderCode ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Payment Link ID</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right break-all">{selectedPayment.payosPaymentLinkId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right break-all">{selectedPayment.payosTransactionId || 'Waiting webhook'}</span>
                    </div>
                  </div>
                </div>

                {selectedPayment.downloadUrl && selectedPayment.paymentStatus === 'PAID' && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-slate-700 dark:text-slate-200">
                    Download is unlocked for this payment because PayOS webhook confirmation has completed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
