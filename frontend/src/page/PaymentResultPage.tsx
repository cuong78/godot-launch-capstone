import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { paymentApi } from '../api/paymentApi';
import { PaymentResponse, ScreenType } from '../types';

interface PaymentResultPageProps {
  variant: 'success' | 'failed' | 'cancelled';
  setCurrentScreen: (screen: ScreenType) => void;
  onPaymentLoaded: (payment: PaymentResponse) => void;
  onPaymentResolved: (payment: PaymentResponse, variant: 'success' | 'failed' | 'cancelled') => void;
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

const getVariantMeta = (variant: PaymentResultPageProps['variant']) => {
  switch (variant) {
    case 'success':
      return {
        title: 'Payment Success',
        subtitle: 'The checkout returned successfully. Downloads will unlock only after the backend confirms the PayOS webhook.',
        icon: <CheckCircle2 size={22} className="text-emerald-500" />,
        accentCard: 'border-emerald-500/20 bg-emerald-500/10',
      };
    case 'failed':
      return {
        title: 'Payment Failed',
        subtitle: 'The checkout did not complete successfully. You can refresh the status or reopen the hosted checkout if it is still available.',
        icon: <AlertTriangle size={22} className="text-amber-500" />,
        accentCard: 'border-amber-500/20 bg-amber-400/10',
      };
    case 'cancelled':
    default:
      return {
        title: 'Payment Cancelled',
        subtitle: 'The checkout was cancelled before completion. Your order stays locked until a new payment succeeds.',
        icon: <XCircle size={22} className="text-slate-500" />,
        accentCard: 'border-slate-500/20 bg-slate-500/10',
      };
  }
};

const getStatusMeta = (status?: PaymentResponse['paymentStatus']) => {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        helper: 'Webhook confirmation is complete. Your order is paid and the package is ready to download.',
      };
    case 'PROCESSING':
      return {
        label: 'Processing',
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        helper: 'PayOS detected payment activity. The backend is waiting for the final webhook confirmation.',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        helper: 'The payment was not completed successfully. You can create or reopen a new checkout session if it is still active.',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        helper: 'This PayOS session was cancelled before the order could be paid.',
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        helper: 'The hosted checkout link expired. You will need a new session before paying again.',
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending',
        badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
        helper: 'The checkout link exists, but the payment has not been completed yet.',
      };
  }
};

export const PaymentResultPage: React.FC<PaymentResultPageProps> = ({
  variant,
  setCurrentScreen,
  onPaymentLoaded,
  onPaymentResolved,
}) => {
  const variantMeta = getVariantMeta(variant);
  const paymentId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('paymentId'),
    []
  );
  const announcedPaymentStateRef = React.useRef<string | null>(null);

  const [payment, setPayment] = React.useState<PaymentResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadPayment = React.useCallback(async (refresh: boolean) => {
    if (!paymentId) {
      setError('Missing payment id in the current return URL.');
      setIsLoading(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await paymentApi.confirmPayment(paymentId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Unable to load the payment result.');
      }

      setPayment(response.data);
      onPaymentLoaded(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to load the payment result.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onPaymentLoaded, paymentId]);

  React.useEffect(() => {
    loadPayment(false);
  }, [loadPayment]);

  React.useEffect(() => {
    if (!payment) {
      return;
    }

    const announcementKey = `${payment.id}:${payment.paymentStatus}:${variant}`;
    if (announcedPaymentStateRef.current === announcementKey) {
      return;
    }

    announcedPaymentStateRef.current = announcementKey;
    onPaymentResolved(payment, variant);
  }, [onPaymentResolved, payment, variant]);

  const statusMeta = getStatusMeta(payment?.paymentStatus);
  const canContinuePayment =
    Boolean(payment?.checkoutUrl) &&
    (payment?.paymentStatus === 'PENDING' || payment?.paymentStatus === 'PROCESSING');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={() => setCurrentScreen('marketplace')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-studio"
          >
            <ArrowLeft size={14} /> Back to Marketplace
          </button>
          <div className="mt-3 flex items-center gap-3">
            {variantMeta.icon}
            <h1 className="font-display font-bold text-2xl text-slate-850 dark:text-white">{variantMeta.title}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-xs text-slate-550 dark:text-slate-400">{variantMeta.subtitle}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
          onClick={() => loadPayment(true)}
        >
          Refresh Status
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-8 text-center text-sm text-slate-500 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400">
          Loading payment result...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 shadow-sm">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" size="sm" onClick={() => setCurrentScreen('marketplace')}>
              Back to Marketplace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('payment')}>
              Open Payment Center
            </Button>
          </div>
        </div>
      ) : !payment ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-8 text-center shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
          <p className="font-display text-lg font-bold text-slate-850 dark:text-white">Payment session not found</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            We could not find a payment to display for this return URL.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.92fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-xl font-bold text-slate-850 dark:text-white">
                      {payment.marketplaceItemTitle}
                    </h2>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {statusMeta.helper}
                  </p>
                </div>

                <div className={`rounded-2xl border px-4 py-3 ${variantMeta.accentCard}`}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Result Screen</p>
                  <p className="mt-2 font-display text-lg font-bold text-slate-850 dark:text-white">{variantMeta.title}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Order Number</p>
                  <p className="mt-2 font-display text-lg font-bold text-slate-850 dark:text-white">
                    {payment.orderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Amount</p>
                  <p className="mt-2 font-display text-lg font-bold text-amber-500">{formatMoney(payment.amount)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Order Status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{payment.orderStatus}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Paid At</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{formatTimestamp(payment.paidAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-500">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">Payment Session</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hosted PayOS metadata stored by the backend for this marketplace order.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Payment Provider</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{payment.paymentProvider}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Payment Status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{payment.paymentStatus}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">PayOS Order Code</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{payment.payosOrderCode ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Payment Reference</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-850 dark:text-white">{payment.paymentReference || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Payment Link ID</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-850 dark:text-white">{payment.payosPaymentLinkId || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Transaction ID</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-850 dark:text-white">{payment.payosTransactionId || 'Waiting webhook'}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">Next Actions</h2>
              <div className="mt-5 space-y-3">
                {canContinuePayment && payment.checkoutUrl && (
                  <a
                    href={payment.checkoutUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-600 transition-studio hover:border-sky-500 hover:bg-sky-500 hover:text-white dark:text-sky-400"
                  >
                    Continue PayOS Checkout <ExternalLink size={15} />
                  </a>
                )}

                <Button variant="primary" size="md" className="w-full" onClick={() => setCurrentScreen('payment')}>
                  Open Payment Center
                </Button>

                <Button variant="ghost" size="md" className="w-full" onClick={() => setCurrentScreen('marketplace')}>
                  Back to Marketplace
                </Button>

                {payment.downloadUrl && payment.paymentStatus === 'PAID' && (
                  <a
                    href={payment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Download size={15} /> Download Now
                  </a>
                )}
              </div>
            </section>

            <section className={`rounded-2xl border p-5 ${variantMeta.accentCard}`}>
              <h3 className="font-display text-base font-bold text-slate-850 dark:text-white">What Happens Next</h3>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <p>1. The backend refreshes PayOS status from the current payment session.</p>
                <p>2. Only a verified webhook can move the order into the paid state.</p>
                <p>3. The download button appears automatically after the payment is confirmed.</p>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};
