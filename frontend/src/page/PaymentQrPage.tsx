import React from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "../components/Button";
import { paymentApi } from "../api/paymentApi";
import { PaymentResponse, ScreenType } from "../types";
import {
  mergePaymentWithStoredQr,
  readPaymentQrSession,
  storePaymentQrSession,
} from "../utils/paymentFlowStorage";

interface PaymentQrPageProps {
  setCurrentScreen: (screen: ScreenType) => void;
  onPaymentUpdated: (payment: PaymentResponse) => void;
  onPaymentPaid: (payment: PaymentResponse) => void;
}

const BANK_NAMES_BY_BIN: Record<string, string> = {
  "970403": "Sacombank",
  "970405": "Agribank",
  "970407": "Techcombank",
  "970415": "VietinBank",
  "970416": "ACB",
  "970418": "BIDV",
  "970422": "MB Bank",
  "970423": "TPBank",
  "970432": "VPBank",
  "970436": "Vietcombank",
  "970437": "HDBank",
  "970443": "SHB",
  "970448": "OCB",
};

const ACTIVE_STATUSES: PaymentResponse["paymentStatus"][] = [
  "PENDING",
  "PROCESSING",
];

const resolveLocale = (language: string) => {
  if (language === "en") return "en-US";
  if (language === "ja") return "ja-JP";
  return "vi-VN";
};

const formatMoney = (amount: number, currency: string, locale: string) =>
  `${new Intl.NumberFormat(locale).format(Number(amount || 0))}đ`;

const formatRemainingTime = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const resolveTransferDescription = (payment: PaymentResponse) =>
  `GL${payment.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};

interface CopyRowProps {
  label: string;
  value: string;
  copyLabel: string;
  copied: boolean;
  emphasized?: boolean;
  onCopy: () => void;
}

const CopyRow: React.FC<CopyRowProps> = ({
  label,
  value,
  copyLabel,
  copied,
  emphasized = false,
  onCopy,
}) => (
  <div
    className={`group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-300 ${
      emphasized
        ? "border-amber-400/30 bg-gradient-to-r from-amber-400/12 to-orange-400/5"
        : "border-slate-200/80 bg-slate-50/80 hover:border-sky-400/30 hover:bg-sky-50/60 dark:border-slate-800/80 dark:bg-slate-950/45 dark:hover:border-sky-500/25 dark:hover:bg-sky-500/5"
    }`}
  >
    <div className="min-w-0">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 truncate font-semibold text-slate-900 dark:text-white ${
          emphasized ? "font-display text-xl text-amber-600 dark:text-amber-400" : "text-sm"
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-all duration-200 ${
        copied
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-slate-200 bg-white text-slate-500 hover:border-sky-400/40 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-sky-400"
      }`}
      aria-label={`${copyLabel}: ${label}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span className="hidden sm:inline">{copyLabel}</span>
    </button>
  </div>
);

export const PaymentQrPage: React.FC<PaymentQrPageProps> = ({
  setCurrentScreen,
  onPaymentUpdated,
  onPaymentPaid,
}) => {
  const { t, i18n } = useTranslation(["payment"]);
  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language || "vi");
  const paymentId = React.useMemo(
    () => new URLSearchParams(window.location.search).get("paymentId"),
    [],
  );
  const initialSession = React.useMemo(
    () => readPaymentQrSession(paymentId),
    [paymentId],
  );
  const [payment, setPayment] = React.useState<PaymentResponse | null>(
    initialSession?.payment || null,
  );
  const [expiresAt, setExpiresAt] = React.useState<string | null>(
    initialSession?.expiresAt || null,
  );
  const [remainingMs, setRemainingMs] = React.useState(() =>
    initialSession ? Math.max(0, new Date(initialSession.expiresAt).getTime() - Date.now()) : 0,
  );
  const [isLoading, setIsLoading] = React.useState(!initialSession);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const paidHandledRef = React.useRef(false);
  const pollingRef = React.useRef(false);

  const persistPayment = React.useCallback(
    (nextPayment: PaymentResponse) => {
      const merged = mergePaymentWithStoredQr(nextPayment);
      const session = storePaymentQrSession(merged, expiresAt || undefined);
      setPayment(merged);
      if (session?.expiresAt) {
        setExpiresAt(session.expiresAt);
      }
      onPaymentUpdated(merged);
      return merged;
    },
    [expiresAt, onPaymentUpdated],
  );

  const refreshPayment = React.useCallback(
    async (manual = false) => {
      if (!paymentId || pollingRef.current) return;
      pollingRef.current = true;
      if (manual) setIsRefreshing(true);
      try {
        const response = await paymentApi.confirmPayment(paymentId);
        if (!response.success || !response.data) {
          throw new Error(response.message || t("payment:qr.errors.loadFailed"));
        }
        persistPayment(response.data);
        setError(null);
      } catch (refreshError: any) {
        if (manual || !payment) {
          setError(
            refreshError.response?.data?.message ||
              refreshError.message ||
              t("payment:qr.errors.loadFailed"),
          );
        }
      } finally {
        pollingRef.current = false;
        setIsLoading(false);
        if (manual) setIsRefreshing(false);
      }
    },
    [payment, paymentId, persistPayment, t],
  );

  React.useEffect(() => {
    if (!paymentId) {
      setIsLoading(false);
      setError(t("payment:qr.errors.missingPayment"));
      return;
    }
    if (!payment) {
      void refreshPayment(false);
    }
  }, [payment, paymentId, refreshPayment, t]);

  const isActive = Boolean(
    payment && ACTIVE_STATUSES.includes(payment.paymentStatus),
  );

  React.useEffect(() => {
    if (!paymentId || !isActive) return;
    const intervalId = window.setInterval(() => {
      void refreshPayment(false);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [isActive, paymentId, refreshPayment]);

  React.useEffect(() => {
    if (!expiresAt) return;
    const updateCountdown = () => {
      setRemainingMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    };
    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt]);

  React.useEffect(() => {
    if (
      payment?.paymentStatus === "PAID" &&
      !paidHandledRef.current
    ) {
      paidHandledRef.current = true;
      onPaymentPaid(payment);
    }
  }, [onPaymentPaid, payment]);

  const handleCopy = async (field: string, value: string) => {
    try {
      await copyText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch (copyError) {
      console.error("Unable to copy payment information", copyError);
    }
  };

  const handleCancel = async () => {
    if (!payment || !isActive) return;
    setIsCancelling(true);
    try {
      const response = await paymentApi.cancelPayment(payment.id);
      if (!response.success || !response.data) {
        throw new Error(response.message || t("payment:qr.errors.cancelFailed"));
      }
      persistPayment(response.data);
      setShowCancelConfirm(false);
      setError(null);
    } catch (cancelError: any) {
      setError(
        cancelError.response?.data?.message ||
          cancelError.message ||
          t("payment:qr.errors.cancelFailed"),
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[620px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-500/20 bg-sky-500/10 text-sky-500 shadow-[0_20px_60px_rgba(14,165,233,0.18)]">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h1 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-white">
            {t("payment:qr.loadingTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("payment:qr.loadingDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="mx-auto flex min-h-[620px] max-w-2xl items-center justify-center py-10">
        <div className="w-full rounded-[30px] border border-rose-500/20 bg-white/90 p-8 text-center shadow-2xl backdrop-blur-xl dark:bg-slate-900/85">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500">
            <TriangleAlert size={28} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {t("payment:qr.unavailableTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {error || t("payment:qr.unavailableDescription")}
          </p>
          <Button
            className="mt-6"
            variant="primary"
            onClick={() => setCurrentScreen("wallet")}
          >
            {t("payment:qr.backToWallet")}
          </Button>
        </div>
      </div>
    );
  }

  const bankName = payment.bin
    ? BANK_NAMES_BY_BIN[payment.bin] || t("payment:qr.receivingBank")
    : t("payment:qr.receivingBank");
  const transferDescription = resolveTransferDescription(payment);
  const amountText = formatMoney(payment.amount, payment.currency, locale);
  const isExpiredLocally = remainingMs <= 0;
  const isTerminalFailure = ["FAILED", "CANCELLED", "EXPIRED"].includes(
    payment.paymentStatus,
  );

  return (
    <div className="relative isolate animate-fade-in overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/75 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/55 dark:shadow-[0_35px_100px_rgba(0,0,0,0.4)] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-28 -top-32 h-80 w-80 rounded-full bg-sky-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

      <div className="relative">
        <header className="flex flex-col gap-5 border-b border-slate-200/70 pb-6 dark:border-slate-800/70 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setCurrentScreen("wallet")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={14} /> {t("payment:qr.backToWallet")}
            </button>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)]">
                <ScanLine size={22} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {t("payment:qr.title")}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  {t("payment:qr.subtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={14} /> {t("payment:qr.securedByPayos")}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold ${
                isActive
                  ? "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : payment.paymentStatus === "PAID"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-slate-500/20 bg-slate-500/10 text-slate-500"
              }`}
            >
              {isActive ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                </span>
              ) : payment.paymentStatus === "PAID" ? (
                <CheckCircle2 size={14} />
              ) : (
                <XCircle size={14} />
              )}
              {isActive
                ? t("payment:qr.waitingStatus")
                : t(`payment:qr.status.${payment.paymentStatus.toLowerCase()}`)}
            </span>
          </div>
        </header>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isTerminalFailure && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-300/70 bg-slate-100/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/75 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <XCircle size={20} className="shrink-0 text-slate-500" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("payment:qr.terminalTitle")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("payment:qr.terminalDescription")}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCurrentScreen("wallet")}>
              {t("payment:qr.createAnother")}
            </Button>
          </div>
        )}

        <div className="mt-7 grid gap-7 xl:grid-cols-[0.88fr_1.12fr]">
          <section className="relative overflow-hidden rounded-[30px] border border-sky-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-5 text-white shadow-[0_24px_70px_rgba(2,132,199,0.22)] sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-sky-300">
                  {t("payment:qr.vietQrLabel")}
                </p>
                <h2 className="mt-1 font-display text-lg font-bold">
                  {t("payment:qr.scanToPay")}
                </h2>
              </div>
              <Smartphone size={22} className="text-sky-300" />
            </div>

            <div className="relative mx-auto mt-6 w-fit rounded-[28px] bg-white p-4 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-5">
              {payment.qrCode ? (
                <div className="relative">
                  <QRCodeSVG
                    value={payment.qrCode}
                    size={252}
                    level="H"
                    marginSize={0}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    className="h-auto w-[220px] sm:w-[252px]"
                    title={t("payment:qr.qrAlt")}
                  />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-4 border-white bg-gradient-to-br from-sky-500 to-cyan-400 font-display text-sm font-black text-white shadow-md">
                    G
                  </div>
                </div>
              ) : (
                <div className="flex h-[252px] w-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-slate-500 sm:w-[252px]">
                  <TriangleAlert size={28} />
                  <p className="mt-3 text-xs font-semibold leading-relaxed">
                    {t("payment:qr.qrUnavailable")}
                  </p>
                </div>
              )}
            </div>

            <div className="relative mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-300">
              <ScanLine size={15} className="text-sky-300" />
              {t("payment:qr.scanHint")}
            </div>

            <div className="relative mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <Clock3 size={17} className={isExpiredLocally ? "text-rose-300" : "text-amber-300"} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {t("payment:qr.timeRemaining")}
                  </p>
                  <p className={`mt-0.5 font-mono text-lg font-bold ${isExpiredLocally ? "text-rose-300" : "text-white"}`}>
                    {formatRemainingTime(remainingMs)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshPayment(true)}
                disabled={isRefreshing}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label={t("payment:qr.refresh")}
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/72 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {t("payment:qr.transferInfoTitle")}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t("payment:qr.transferInfoSubtitle")}
                    </p>
                  </div>
                </div>
                <BadgeCheck size={20} className="shrink-0 text-emerald-500" />
              </div>

              <div className="mt-5 space-y-3">
                <CopyRow
                  label={t("payment:qr.amount")}
                  value={amountText}
                  copyLabel={copiedField === "amount" ? t("payment:quick.copied") : t("payment:quick.copy")}
                  copied={copiedField === "amount"}
                  emphasized
                  onCopy={() => handleCopy("amount", String(Math.round(Number(payment.amount))))}
                />
                <CopyRow
                  label={t("payment:qr.bank")}
                  value={payment.bin ? `${bankName} • ${payment.bin}` : bankName}
                  copyLabel={copiedField === "bank" ? t("payment:quick.copied") : t("payment:quick.copy")}
                  copied={copiedField === "bank"}
                  onCopy={() => handleCopy("bank", payment.bin || bankName)}
                />
                <CopyRow
                  label={t("payment:qr.accountNumber")}
                  value={payment.bankAccountNumber || t("payment:common.notAvailable")}
                  copyLabel={copiedField === "account" ? t("payment:quick.copied") : t("payment:quick.copy")}
                  copied={copiedField === "account"}
                  onCopy={() => handleCopy("account", payment.bankAccountNumber || "")}
                />
                <CopyRow
                  label={t("payment:qr.accountName")}
                  value={payment.bankAccountName || t("payment:common.notAvailable")}
                  copyLabel={copiedField === "name" ? t("payment:quick.copied") : t("payment:quick.copy")}
                  copied={copiedField === "name"}
                  onCopy={() => handleCopy("name", payment.bankAccountName || "")}
                />
                <CopyRow
                  label={t("payment:qr.transferContent")}
                  value={transferDescription}
                  copyLabel={copiedField === "content" ? t("payment:quick.copied") : t("payment:quick.copy")}
                  copied={copiedField === "content"}
                  onCopy={() => handleCopy("content", transferDescription)}
                />
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                <Info size={15} className="mt-0.5 shrink-0" />
                <span>{t("payment:qr.exactTransferWarning")}</span>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50/95 to-white/80 p-5 dark:border-slate-800/80 dark:from-slate-900/75 dark:to-slate-950/55 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {t("payment:qr.autoConfirmTitle")}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {t("payment:qr.autoConfirmDescription")}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {payment.checkoutUrl && (
                  <a
                    href={payment.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-600 transition-all hover:border-sky-500/40 hover:bg-sky-500 hover:text-white dark:text-sky-400"
                  >
                    {t("payment:qr.openPayos")} <ExternalLink size={15} />
                  </a>
                )}
                {isActive && (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:border-rose-400/30 hover:bg-rose-500/5 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <X size={15} /> {t("payment:qr.cancelPayment")}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-7 grid gap-3 border-t border-slate-200/70 pt-6 dark:border-slate-800/70 sm:grid-cols-3">
          {[
            ["01", Smartphone, t("payment:qr.step1")],
            ["02", ScanLine, t("payment:qr.step2")],
            ["03", CheckCircle2, t("payment:qr.step3")],
          ].map(([number, Icon, label]) => {
            const StepIcon = Icon as React.ComponentType<{ size?: number; className?: string }>;
            return (
              <div key={number as string} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 dark:border-slate-800/70 dark:bg-slate-900/45">
                <span className="font-mono text-[10px] font-black text-sky-500">{number as string}</span>
                <StepIcon size={16} className="shrink-0 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label as string}</span>
              </div>
            );
          })}
        </footer>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <TriangleAlert size={22} />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
              {t("payment:qr.cancelConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t("payment:qr.cancelConfirmDescription")}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                variant="ghost"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
              >
                {t("payment:qr.keepPayment")}
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-400 disabled:opacity-50"
              >
                {isCancelling && <Loader2 size={15} className="animate-spin" />}
                {isCancelling ? t("payment:qr.cancelling") : t("payment:qr.confirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
