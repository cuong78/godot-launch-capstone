import React from 'react';
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { PaymentResponse, ScreenType } from '../types';

interface PaymentDetailPageProps {
  payments: PaymentResponse[];
  selectedOrderId: string | null;
  setSelectedOrderId: (orderId: string) => void;
  isRefreshing: boolean;
  onBackToMarketplace: () => void;
  onRefreshPayments: () => void;
  onCancelPayment: (paymentId: string) => Promise<void>;
  setCurrentScreen: (screen: ScreenType) => void;
}

const formatMoney = (amount: number) =>
  amount === 0
    ? 'FREE'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
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
        label: 'Paid',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        icon: <CheckCircle2 size={14} />,
        helper: 'Payment confirmed by webhook. Downloads are now unlocked.',
      };
    case 'PROCESSING':
      return {
        label: 'Processing',
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        icon: <Clock3 size={14} />,
        helper: 'PayOS detected activity. Waiting for final webhook confirmation.',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        icon: <XCircle size={14} />,
        helper: 'The payment did not complete successfully. Create a new PayOS session if needed.',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        icon: <XCircle size={14} />,
        helper: 'This checkout session was cancelled before completion.',
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        icon: <XCircle size={14} />,
        helper: 'The PayOS checkout link expired. Create a new session from checkout if you want to continue.',
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending',
        badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
        icon: <Clock3 size={14} />,
        helper: 'Your PayOS checkout link is ready. Complete the payment to unlock the order.',
      };
  }
};

export const PaymentDetailPage: React.FC<PaymentDetailPageProps> = ({
  payments,
  selectedOrderId,
  setSelectedOrderId,
  isRefreshing,
  onBackToMarketplace,
  onRefreshPayments,
  onCancelPayment,
  setCurrentScreen,
}) => {
  const activePayment = React.useMemo(() => {
    if (payments.length === 0) {
      return null;
    }

    if (selectedOrderId) {
      return payments.find((payment) => payment.orderId === selectedOrderId) || payments[0];
    }

    return payments[0];
  }, [payments, selectedOrderId]);

  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (!activePayment) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl">
          <h1 className="font-display font-bold text-2xl text-slate-850 dark:text-white">Payment Center</h1>
          <p className="mt-2 text-xs text-slate-550 dark:text-slate-400">
            No payment session is being tracked right now.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onBackToMarketplace}>
          Return to Marketplace
        </Button>
      </div>
    );
  }

  const statusMeta = getStatusMeta(activePayment.paymentStatus);
  const canContinuePayment =
    Boolean(activePayment.checkoutUrl) &&
    (activePayment.paymentStatus === 'PENDING' || activePayment.paymentStatus === 'PROCESSING');
  const canCancelPayment =
    activePayment.paymentStatus === 'PENDING' || activePayment.paymentStatus === 'PROCESSING';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-studio"
          >
            <ArrowLeft size={14} /> Back to Marketplace
          </button>
          <h1 className="mt-3 font-display font-bold text-2xl text-slate-850 dark:text-white">
            Payment Center
          </h1>
          <p className="mt-1 text-xs text-slate-550 dark:text-slate-400">
            Track hosted PayOS sessions, refresh payment status, and download paid marketplace items.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Tracked orders</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{payments.length}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-400/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-mono">Total value</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{formatMoney(totalAmount)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={onRefreshPayments}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.4fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
            <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">Tracked Payment Sessions</h2>
            <div className="mt-4 space-y-3">
              {payments.map((payment) => {
                const meta = getStatusMeta(payment.paymentStatus);
                const isActive = payment.orderId === activePayment.orderId;

                return (
                  <button
                    key={payment.orderId}
                    type="button"
                    onClick={() => setSelectedOrderId(payment.orderId)}
                    className={`w-full rounded-2xl border p-4 text-left transition-studio ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-400/10 shadow-sm'
                        : 'border-slate-200/80 bg-slate-50/70 hover:border-sky-500/30 dark:border-slate-800/80 dark:bg-slate-950/45'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-slate-850 dark:text-white truncate">
                          {payment.marketplaceItemTitle}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          Order {payment.orderId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{payment.marketplaceItemType === 'source_code' ? 'Source Code' : 'Asset'}</span>
                      <span className="font-semibold text-amber-500">{formatMoney(payment.amount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-xl font-bold text-slate-850 dark:text-white">{activePayment.marketplaceItemTitle}</h2>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.badgeClass}`}>
                    {statusMeta.icon}
                    {statusMeta.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Created {formatTimestamp(activePayment.createdAt)} by {activePayment.buyerFullName}
                </p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{statusMeta.helper}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {canContinuePayment && activePayment.checkoutUrl && (
                  <a
                    href={activePayment.checkoutUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#025272] transition-studio hover:bg-sky-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                  >
                    Continue PayOS <ExternalLink size={15} />
                  </a>
                )}
                {activePayment.downloadUrl && activePayment.paymentStatus === 'PAID' && (
                  <a
                    href={activePayment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Download size={15} /> Download Package
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Amount</p>
                <p className="mt-2 font-display text-lg font-bold text-amber-500">{formatMoney(activePayment.amount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Reference</p>
                <p className="mt-2 font-display text-sm font-bold text-slate-850 dark:text-white">{activePayment.paymentReference || 'Pending assignment'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Provider</p>
                <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{activePayment.paymentProvider}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Order Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{activePayment.orderStatus}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-500">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">PayOS Session</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hosted checkout metadata stored by the backend for this order.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">PayOS Order Code</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{activePayment.payosOrderCode ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Payment Link ID</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white break-all">{activePayment.payosPaymentLinkId || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Transaction ID</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white break-all">{activePayment.payosTransactionId || 'Waiting webhook'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Paid At</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{formatTimestamp(activePayment.paidAt)}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-250 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950/55 dark:to-slate-900/40 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">How confirmation works</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>1. Customer pays on PayOS.</p>
                    <p>2. Backend waits for a verified PayOS webhook.</p>
                    <p>3. Order becomes paid, transaction is created, and download unlocks.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-400/10 p-3 text-amber-500">
                  {activePayment.marketplaceItemType === 'source_code' ? <Code2 size={18} /> : <Boxes size={18} />}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">Actions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Use these controls to continue checkout, refresh status, or move back into the marketplace.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {canContinuePayment && activePayment.checkoutUrl && (
                  <a
                    href={activePayment.checkoutUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-600 transition-studio hover:border-sky-500 hover:bg-sky-500 hover:text-white dark:text-sky-400"
                  >
                    Reopen PayOS Checkout <ExternalLink size={15} />
                  </a>
                )}

                <Button
                  variant="ghost"
                  size="md"
                  className="w-full"
                  icon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
                  onClick={onRefreshPayments}
                >
                  Refresh Payment Status
                </Button>

                {canCancelPayment && (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => onCancelPayment(activePayment.id)}
                  >
                    Cancel Payment Session
                  </Button>
                )}

              </div>
            </div>
          </div>

          {activePayment.downloadUrl && activePayment.paymentStatus === 'PAID' && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">Download Unlocked</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The webhook confirmed your PayOS payment. You can now download the package or continue browsing the marketplace.
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={activePayment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Download size={15} /> Download Now
                  </a>
                  <Button variant="ghost" size="md" onClick={() => setCurrentScreen('marketplace')}>
                    Keep Browsing
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
