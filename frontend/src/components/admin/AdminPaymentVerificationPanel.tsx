import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, Eye, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { Button } from '../Button';
import { TextArea } from '../Input';
import { PaymentResponse } from '../../types';

const formatMoney = (amount: number) =>
  amount === 0
    ? 'FREE'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatTimestamp = (value?: string) => {
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

const getStatusBadgeClass = (status: PaymentResponse['paymentStatus']) => {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    case 'WAITING_VERIFICATION':
      return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    case 'CANCELLED':
      return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    case 'PENDING':
    default:
      return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
  }
};

export const AdminPaymentVerificationPanel: React.FC = () => {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isActing, setIsActing] = useState(false);

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await paymentApi.getPendingPayments();
      if (res.success && res.data) {
        setPayments(res.data);
      } else {
        setError(res.message || 'Failed to load pending payments');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load pending payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const openPaymentDetail = async (paymentId: string) => {
    try {
      const res = await paymentApi.getPaymentDetail(paymentId);
      if (res.success && res.data) {
        setSelectedPayment(res.data);
        setRejectReason('');
        setIsRejectMode(false);
        setIsModalOpen(true);
      } else {
        alert(res.message || 'Failed to load payment detail');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to load payment detail');
    }
  };

  const handleApprove = async (paymentId: string) => {
    if (!window.confirm('Approve this payment and release the seller revenue?')) {
      return;
    }

    setIsActing(true);
    try {
      const res = await paymentApi.approvePayment(paymentId);
      if (!res.success) {
        alert(res.message || 'Failed to approve payment');
        return;
      }
      setIsModalOpen(false);
      setSelectedPayment(null);
      await fetchPendingPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to approve payment');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!rejectReason.trim()) {
      return;
    }

    setIsActing(true);
    try {
      const res = await paymentApi.rejectPayment(paymentId, { rejectionReason: rejectReason.trim() });
      if (!res.success) {
        alert(res.message || 'Failed to reject payment');
        return;
      }
      setIsModalOpen(false);
      setSelectedPayment(null);
      setRejectReason('');
      await fetchPendingPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to reject payment');
    } finally {
      setIsActing(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Payment Verification</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review uploaded bank transfer receipts before releasing marketplace revenue.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchPendingPayments}
          >
            Refresh Queue
          </Button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-semibold">Order ID</th>
                  <th className="p-4 font-semibold">Buyer</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Payment Status</th>
                  <th className="p-4 font-semibold">Receipt</th>
                  <th className="p-4 font-semibold">Created Time</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      Loading payment verification queue...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No payments are currently waiting for verification.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-slate-200/70 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {payment.orderId.slice(0, 8).toUpperCase()}
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${getStatusBadgeClass(payment.paymentStatus)}`}>
                          <Clock3 size={12} />
                          {payment.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        {payment.receiptUrl ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-sky-500 hover:text-sky-600"
                          >
                            View Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No receipt</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(payment.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => openPaymentDetail(payment.id)}>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && selectedPayment && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-850 dark:text-white">Payment Detail</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Order {selectedPayment.orderId.slice(0, 8).toUpperCase()} • {selectedPayment.marketplaceItemTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-studio"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.95fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Receipt Image</p>
                  {selectedPayment.receiptUrl ? (
                    <a
                      href={selectedPayment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
                    >
                      <img
                        src={selectedPayment.receiptUrl}
                        alt="Payment receipt"
                        className="max-h-[420px] w-full object-cover bg-slate-100 dark:bg-slate-950"
                      />
                    </a>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-250 bg-slate-50/50 px-5 py-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-500">
                      No receipt uploaded yet.
                    </div>
                  )}
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
                      <span className="text-slate-500 dark:text-slate-400">Reference</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.transferReference}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Payer Name</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.payerName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Payer Bank</span>
                      <span className="font-semibold text-slate-850 dark:text-white text-right">{selectedPayment.payerBank || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {selectedPayment.rejectionReason && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                    <div className="flex items-start gap-2">
                      <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Previous rejection reason</p>
                        <p className="mt-1 leading-relaxed">{selectedPayment.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isRejectMode ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
                    <TextArea
                      label="Reject Payment"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={4}
                      placeholder="Enter the rejection reason shown to the customer..."
                    />
                    <div className="mt-4 flex justify-end gap-3">
                      <Button variant="ghost" size="sm" onClick={() => setIsRejectMode(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReject(selectedPayment.id)}
                        disabled={!rejectReason.trim() || isActing}
                      >
                        {isActing ? 'Rejecting...' : 'Confirm Reject'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => setIsRejectMode(true)}
                        disabled={isActing}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={() => handleApprove(selectedPayment.id)}
                        disabled={isActing}
                      >
                        {isActing ? 'Approving...' : 'Approve'}
                      </Button>
                    </div>
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
