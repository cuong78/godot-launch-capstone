import React from 'react';
import { useTranslation } from 'react-i18next';
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
  Sparkles,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { PaymentResponse, ScreenType } from '../types';
import { resolveApiUrl } from '../utils/apiUrl';

interface PaymentDetailPageProps {
  payments: PaymentResponse[];
  selectedOrderId: string | null;
  setSelectedOrderId: (orderId: string) => void;
  isRefreshing: boolean;
  onBackToMarketplace: () => void;
  onRefreshPayments: () => void;
  onCancelPayment: (paymentId: string) => Promise<void>;
  setCurrentScreen: (screen: ScreenType) => void;
  variant?: 'page' | 'dashboard';
}

const resolveLocale = (language: string) => {
  switch (language) {
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'vi':
    default:
      return 'vi-VN';
  }
};

const formatMoney = (amount: number, currency = 'VND', locale = 'vi-VN', freeLabel = 'FREE') =>
  amount === 0
    ? freeLabel
    : new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency || 'VND',
        maximumFractionDigits: 0,
      }).format(amount);

const formatTimestamp = (value?: string | null, locale = 'vi-VN', fallback = 'N/A') => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getStatusMeta = (
  status: PaymentResponse['paymentStatus'],
  itemType: PaymentResponse['marketplaceItemType'],
  t: any
) => {
  switch (status) {
    case 'PAID':
      return {
        label: t('payment:status.paid.label'),
        badgeClass: 'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
        icon: <CheckCircle2 size={14} />,
        helper: itemType === 'game_source'
          ? t('payment:status.paid.helperSource')
          : t('payment:status.paid.helperAsset'),
      };
    case 'PROCESSING':
      return {
        label: t('payment:status.processing.label'),
        badgeClass: 'bg-amber-500/12 text-amber-500 border-amber-500/25',
        icon: <Clock3 size={14} />,
        helper: t('payment:status.processing.helper'),
      };
    case 'FAILED':
      return {
        label: t('payment:status.failed.label'),
        badgeClass: 'bg-rose-500/12 text-rose-500 border-rose-500/25',
        icon: <XCircle size={14} />,
        helper: t('payment:status.failed.helper'),
      };
    case 'CANCELLED':
      return {
        label: t('payment:status.cancelled.label'),
        badgeClass: 'bg-slate-500/12 text-slate-500 border-slate-500/25',
        icon: <XCircle size={14} />,
        helper: t('payment:status.cancelled.helper'),
      };
    case 'EXPIRED':
      return {
        label: t('payment:status.expired.label'),
        badgeClass: 'bg-slate-500/12 text-slate-500 border-slate-500/25',
        icon: <XCircle size={14} />,
        helper: t('payment:status.expired.helper'),
      };
    case 'PENDING':
    default:
      return {
        label: t('payment:status.pending.label'),
        badgeClass: 'bg-sky-500/12 text-sky-600 border-sky-500/25 dark:text-sky-400',
        icon: <Clock3 size={14} />,
        helper: t('payment:status.pending.helper'),
      };
  }
};

const getItemMeta = (itemType: PaymentResponse['marketplaceItemType'], t: any) =>
  itemType === 'game_source'
    ? {
        label: t('payment:itemType.sourceCode'),
        icon: <Code2 size={18} />,
        accentClass: 'border-amber-500/20 bg-amber-400/10 text-amber-500',
        softClass: 'from-amber-400/14 via-amber-400/8 to-transparent',
      }
    : {
        label: t('payment:itemType.asset'),
        icon: <Boxes size={18} />,
        accentClass: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
        softClass: 'from-sky-500/14 via-sky-500/8 to-transparent',
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
  variant = 'page',
}) => {
  const { t, i18n } = useTranslation(['payment']);
  const isEmbedded = variant === 'dashboard';
  const locale = React.useMemo(() => resolveLocale(i18n.resolvedLanguage || i18n.language || 'vi'), [i18n.language, i18n.resolvedLanguage]);

  const activePayment = React.useMemo(() => {
    if (payments.length === 0) {
      return null;
    }

    if (selectedOrderId) {
      return payments.find((payment) => payment.orderId === selectedOrderId) || payments[0];
    }

    return payments[0];
  }, [payments, selectedOrderId]);

  const paidPayments = React.useMemo(
    () => payments.filter((payment) => payment.paymentStatus === 'PAID'),
    [payments]
  );

  const totalAmount = React.useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  );

  const totalPaidAmount = React.useMemo(
    () => paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [paidPayments]
  );

  const pendingCount = React.useMemo(
    () =>
      payments.filter(
        (payment) => payment.paymentStatus === 'PENDING' || payment.paymentStatus === 'PROCESSING'
      ).length,
    [payments]
  );

  const activeDownloadUrl = React.useMemo(
    () => resolveApiUrl(activePayment?.downloadUrl),
    [activePayment?.downloadUrl]
  );

  if (!activePayment) {
    return (
      <div className={`space-y-4 ${isEmbedded ? '' : 'animate-fade-in'}`}>
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 p-6 shadow-sm dark:border-slate-800/80">
          <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative">
            {!isEmbedded && (
              <button
                type="button"
                onClick={onBackToMarketplace}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-studio hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft size={14} /> {t('payment:center.backToMarketplace')}
              </button>
            )}

            <div className={`${isEmbedded ? '' : 'mt-4'} flex items-center gap-3`}>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 text-sky-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/50 dark:text-sky-400">
                <WalletCards size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500 font-mono">
                  {t('payment:center.commandCenter')}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-slate-850 dark:text-white">
                  {t('payment:center.emptyTitle')}
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('payment:center.emptyIntro')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(activePayment.paymentStatus, activePayment.marketplaceItemType, t);
  const itemMeta = getItemMeta(activePayment.marketplaceItemType, t);
  const canContinuePayment =
    Boolean(activePayment.checkoutUrl) &&
    (activePayment.paymentStatus === 'PENDING' || activePayment.paymentStatus === 'PROCESSING');
  const canCancelPayment =
    activePayment.paymentStatus === 'PENDING' || activePayment.paymentStatus === 'PROCESSING';
  const isPaidSourcePurchase = activePayment.paymentStatus === 'PAID'
    && activePayment.marketplaceItemType === 'game_source'
    && Boolean(activeDownloadUrl);
  const isPaidAssetPurchase = activePayment.paymentStatus === 'PAID'
    && activePayment.marketplaceItemType === 'asset';
  const layoutClass = isEmbedded ? 'grid-cols-1' : 'xl:grid-cols-[0.92fr_1.25fr]';
  const detailSplitClass = isEmbedded ? 'grid-cols-1' : 'lg:grid-cols-[1.05fr_0.95fr]';

  return (
    <div className={`space-y-4 ${isEmbedded ? '' : 'animate-fade-in'}`}>
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 p-6 shadow-sm dark:border-slate-800/80">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-slate-950/10 to-transparent" />

        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              {!isEmbedded && (
                <button
                  type="button"
                  onClick={onBackToMarketplace}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-studio hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ArrowLeft size={14} /> {t('payment:center.backToMarketplace')}
                </button>
              )}

              <div className={`${isEmbedded ? '' : 'mt-4'} flex items-center gap-3`}>
                <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 text-sky-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/50 dark:text-sky-400">
                  <WalletCards size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500 font-mono">
                    {t('payment:center.commandCenter')}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-slate-850 dark:text-white">
                    {isEmbedded ? t('payment:center.embeddedTitle') : t('payment:center.title')}
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t('payment:center.intro')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
                onClick={onRefreshPayments}
                className="border border-slate-200/80 bg-white/70 dark:border-slate-800/80 dark:bg-slate-950/35"
              >
                {t('payment:center.refresh')}
              </Button>
            </div>
          </div>

          <div className={`grid gap-3 ${isEmbedded ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
            <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-white/72 p-4 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/40">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.stats.trackedOrders')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-850 dark:text-white">{payments.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-mono dark:text-emerald-400">{t('payment:center.stats.settledOrders')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-850 dark:text-white">{paidPayments.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-400/10 p-4 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-mono dark:text-amber-400">{t('payment:center.stats.needAttention')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-850 dark:text-white">{pendingCount}</p>
            </div>
            <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-white/72 p-4 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/40">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.stats.totalPaid')}</p>
              <p className="mt-2 font-display text-lg font-bold text-slate-850 dark:text-white">
                {formatMoney(totalPaidAmount, activePayment.currency, locale, t('payment:common.free'))}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {t('payment:center.stats.trackedValue', {
                  amount: formatMoney(totalAmount, activePayment.currency, locale, t('payment:common.free'))
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${layoutClass}`}>
        <aside className="space-y-4">
          <div className="dark-depth-card rounded-[26px] border border-slate-200/90 bg-white/92 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/72">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">
                  {t('payment:center.sessions.title')}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('payment:center.sessions.subtitle')}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-400">
                <Sparkles size={11} className="text-amber-500" /> {t('payment:common.live')}
              </span>
            </div>

            <div className={`mt-4 space-y-3 ${isEmbedded ? 'max-h-[320px] overflow-y-auto pr-1' : ''}`}>
              {payments.map((payment) => {
                const meta = getStatusMeta(payment.paymentStatus, payment.marketplaceItemType, t);
                const paymentItemMeta = getItemMeta(payment.marketplaceItemType, t);
                const isActive = payment.orderId === activePayment.orderId;

                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedOrderId(payment.orderId)}
                    className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-studio ${
                      isActive
                        ? 'border-amber-400/55 bg-gradient-to-r from-amber-400/14 via-white to-white shadow-sm dark:from-amber-400/14 dark:via-slate-900/75 dark:to-slate-900/75'
                        : 'dark-depth-inset border-slate-200/80 bg-slate-50/75 hover:border-sky-500/30 dark:border-slate-800/80 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${paymentItemMeta.softClass}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-slate-850 dark:text-white">
                          {payment.marketplaceItemTitle}
                        </p>
                        <p className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {t('payment:center.sessions.orderPrefix')} {(payment.orderId || payment.id).slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${paymentItemMeta.accentClass}`}>
                        {paymentItemMeta.icon}
                        {paymentItemMeta.label}
                      </span>
                      <span className="text-sm font-bold text-amber-500">
                        {formatMoney(payment.amount, payment.currency, locale, t('payment:common.free'))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="dark-depth-card relative overflow-hidden rounded-[26px] border border-slate-200/90 bg-white/92 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/72">
            <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-r ${itemMeta.softClass}`} />

            <div className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`rounded-2xl border p-3 ${itemMeta.accentClass}`}>
                      {itemMeta.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-slate-850 dark:text-white">
                          {activePayment.marketplaceItemTitle}
                        </h2>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.icon}
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {t('payment:center.detail.createdBy', {
                          time: formatTimestamp(activePayment.createdAt, locale, t('payment:common.notAvailable')),
                          name: activePayment.buyerFullName
                        })}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {statusMeta.helper}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {canContinuePayment && activePayment.checkoutUrl && (
                    <a
                      href={activePayment.checkoutUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#025272] transition-studio hover:bg-sky-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                    >
                      {t('payment:center.detail.continuePayos')} <ExternalLink size={15} />
                    </a>
                  )}
                  {isPaidSourcePurchase && activeDownloadUrl && (
                    <a
                      href={activeDownloadUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                    >
                      <Download size={15} /> {t('payment:center.detail.downloadPackage')}
                    </a>
                  )}
                  {isPaidAssetPurchase && (
                    <span className="inline-flex items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-600 dark:text-sky-400">
                      {t('payment:common.owned')}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.detail.amount')}</p>
                  <p className="mt-2 font-display text-lg font-bold text-amber-500">
                    {formatMoney(activePayment.amount, activePayment.currency, locale, t('payment:common.free'))}
                  </p>
                </div>
                <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.detail.reference')}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">
                    {activePayment.paymentReference || t('payment:common.waitingReference')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`grid gap-4 ${detailSplitClass}`}>
            <div className="dark-depth-card rounded-[26px] border border-slate-200/90 bg-white/92 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/72">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-500">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">
                    {t('payment:center.payos.title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('payment:center.payos.subtitle')}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.payos.orderCode')}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">
                    {activePayment.payosOrderCode ?? t('payment:common.notAvailable')}
                  </p>
                </div>
                <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.payos.paymentLinkId')}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-850 dark:text-white">
                    {activePayment.payosPaymentLinkId || t('payment:common.notAvailable')}
                  </p>
                </div>
                <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.payos.transactionId')}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-850 dark:text-white">
                    {activePayment.payosTransactionId || t('payment:common.waitingWebhook')}
                  </p>
                </div>
                <div className="dark-depth-inset rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{t('payment:center.payos.paidAt')}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">
                    {formatTimestamp(activePayment.paidAt, locale, t('payment:common.notAvailable'))}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950/55 dark:to-slate-900/40">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                  {t('payment:center.payos.flowTitle')}
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>{t('payment:center.payos.flowStep1')}</p>
                  <p>{t('payment:center.payos.flowStep2')}</p>
                  <p>{t('payment:center.payos.flowStep3')}</p>
                </div>
              </div>
            </div>

            <div className="dark-depth-card rounded-[26px] border border-slate-200/90 bg-white/92 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/72">
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl border p-3 ${itemMeta.accentClass}`}>
                  {itemMeta.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">
                    {t('payment:center.actions.title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('payment:center.actions.subtitle')}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {canContinuePayment && activePayment.checkoutUrl && (
                  <a
                    href={activePayment.checkoutUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-600 transition-studio hover:border-sky-500 hover:bg-sky-500 hover:text-white dark:text-sky-400"
                  >
                    {t('payment:center.actions.reopenCheckout')} <ExternalLink size={15} />
                  </a>
                )}

                <Button
                  variant="ghost"
                  size="md"
                  className="w-full border border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-950/40"
                  icon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
                  onClick={onRefreshPayments}
                >
                  {t('payment:center.actions.refreshStatus')}
                </Button>

                {canCancelPayment && (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => onCancelPayment(activePayment.id)}
                  >
                    {t('payment:center.actions.cancelSession')}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={onBackToMarketplace}
                >
                  {t('payment:center.actions.browseMore')}
                </Button>
              </div>
            </div>
          </div>

          {isPaidSourcePurchase && activeDownloadUrl && (
            <div className="rounded-[26px] border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">
                    {t('payment:center.download.title')}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t('payment:center.download.subtitle')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={activeDownloadUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Download size={15} /> {t('payment:center.download.downloadNow')}
                  </a>
                  <Button variant="ghost" size="md" onClick={() => setCurrentScreen('marketplace')}>
                    {t('payment:center.download.keepBrowsing')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isPaidAssetPurchase && (
            <div className="rounded-[26px] border border-sky-500/20 bg-sky-500/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">
                    {t('payment:center.owned.title')}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t('payment:center.owned.subtitle')}
                  </p>
                </div>
                <Button variant="ghost" size="md" onClick={() => setCurrentScreen('marketplace')}>
                  {t('payment:center.download.keepBrowsing')}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
