import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  ArrowLeft,
  Clock3,
  Landmark,
  ReceiptText,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet2,
} from "lucide-react";
import { Button } from "../components/Button";
import { Input, TextArea } from "../components/Input";
import { walletApi } from "../api/walletApi";
import { paymentApi } from "../api/paymentApi";
import { useAuth } from "../hooks/useAuth";
import { useFormattedAmountInput } from "../hooks/useFormattedAmountInput";
import {
  PendingCheckoutContext,
  mergePaymentWithStoredQr,
  readPendingCheckoutContext,
  resolveSuggestedTopUpAmount,
  updatePendingCheckoutContext,
} from "../utils/paymentFlowStorage";
import {
  CreateWithdrawalRequest,
  DeveloperWalletSummaryResponse,
  PaymentResponse,
  ScreenType,
  TransactionResponse,
  WalletResponse,
  WithdrawalResponse,
  WithdrawalStatus,
} from "../types";

const resolveCurrency = () => "VND";

const resolveLocale = (language: string) => {
  switch (language) {
    case "en":
      return "en-US";
    case "ja":
      return "ja-JP";
    case "vi":
    default:
      return "vi-VN";
  }
};

const formatMoney = (
  value?: number,
  currency?: string | null,
  locale = "vi-VN",
  fallback = "N/A",
) => {
  if (value == null) return fallback;
  return `${new Intl.NumberFormat(locale).format(value)}đ`;
};

const formatTimestamp = (
  value?: string | null,
  locale = "vi-VN",
  fallback = "N/A",
) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const sanitizeAmountInput = (value: string) => value.replace(/\D/g, "");

const formatAmountInput = (value: string) => {
  const digits = sanitizeAmountInput(value);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getStatusMeta = (status: WithdrawalStatus, t: any) => {
  switch (status) {
    case "pending":
      return {
        label: t("wallet:status.pending"),
        colorClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    case "approved":
      return {
        label: t("wallet:status.approved"),
        colorClass: "bg-violet-500/10 text-violet-500 border-violet-500/20",
      };
    case "processing":
      return {
        label: t("wallet:status.processing"),
        colorClass: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      };
    case "completed":
      return {
        label: t("wallet:status.completed"),
        colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "failed":
      return {
        label: t("wallet:status.failed"),
        colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      };
    case "rejected":
      return {
        label: t("wallet:status.rejected"),
        colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      };
    case "cancelled":
      return {
        label: t("wallet:status.cancelled"),
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
    default:
      return {
        label: status,
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
  }
};

const getTransactionTypeMeta = (type: string, t: any) => {
  switch (type?.toLowerCase()) {
    case "wallet_topup":
      return {
        label: t("wallet:txnTypes.walletTopup", "Nạp tiền vào ví"),
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "revenue_share":
      return {
        label: t("wallet:txnTypes.revenueShare", "Nhận doanh thu"),
        colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      };
    case "asset_purchase":
      return {
        label: t("wallet:txnTypes.assetPurchase", "Mua tài nguyên"),
        colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "source_code_purchase":
      return {
        label: t("wallet:txnTypes.sourceCodePurchase", "Mua game nguồn"),
        colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    case "withdrawal":
      return {
        label: t("wallet:txnTypes.withdrawal", "Rút tiền về ngân hàng"),
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "commission":
      return {
        label: t("wallet:txnTypes.commission", "Phí nền tảng"),
        colorClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      };
    default:
      return {
        label: type,
        colorClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
  }
};

interface WalletMetricCardProps {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  glowClass: string;
  barClass: string;
}

const WalletMetricCard: React.FC<WalletMetricCardProps> = ({
  label,
  value,
  description,
  icon,
  accentClass,
  glowClass,
  barClass,
}) => (
  <article className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_46px_rgba(15,23,42,0.12)] dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-[0_18px_44px_rgba(0,0,0,0.28)] dark:hover:border-slate-600/80 dark:hover:shadow-[0_24px_56px_rgba(0,0,0,0.4)]">
    <div className={`absolute inset-x-0 top-0 h-0.5 ${barClass}`} />
    <div
      className={`pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full opacity-15 blur-3xl transition-opacity duration-300 group-hover:opacity-25 ${glowClass}`}
    />
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm ${accentClass}`}
        >
          {icon}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-4 font-display text-[1.75rem] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  </article>
);

export const WalletPage: React.FC<{
  setCurrentScreen: (screen: ScreenType) => void;
  onOpenPaymentQr: (payment: PaymentResponse) => void;
}> = ({ setCurrentScreen, onOpenPaymentQr }) => {
  const { t, i18n } = useTranslation(["wallet"]);
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isCustomer = currentUser?.role === "customer";
  const canTopUp = isCustomer || currentUser?.role === "developer";
  const canUseSelfServiceWithdrawal = currentUser?.role === "developer";
  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language || "vi");
  const [walletSummary, setWalletSummary] =
    useState<DeveloperWalletSummaryResponse | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const withdrawAmountInput = useFormattedAmountInput(sanitizeAmountInput, formatAmountInput);
  const amount = withdrawAmountInput.rawValue;
  const setAmount = withdrawAmountInput.setValue;
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const topUpAmountInput = useFormattedAmountInput(sanitizeAmountInput, formatAmountInput);
  const topUpAmount = topUpAmountInput.rawValue;
  const setTopUpAmount = topUpAmountInput.setValue;
  const [suggestedCheckout, setSuggestedCheckout] =
    useState<PendingCheckoutContext | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [isTopUpSubmitting, setIsTopUpSubmitting] = useState(false);
  const [pendingTopUp, setPendingTopUp] = useState<PaymentResponse | null>(
    null,
  );
  const [isResumingTopUp, setIsResumingTopUp] = useState(false);
  const [isCancellingTopUp, setIsCancellingTopUp] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"topup" | "withdraw">(
    "topup",
  );
  const bankName = currentUser?.bankName?.trim() || "";
  const bankAccount = currentUser?.bankAccount?.trim() || "";
  const accountHolder = currentUser?.bankAccountHolder?.trim() || "";
  const hasVerifiedBankInfo = Boolean(bankName && bankAccount && accountHolder);

  const loadWalletSummary = async () => {
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      if (isAdmin) {
        const response = await walletApi.getMyWallet();
        if (response.success && response.data) {
          setWalletInfo(response.data);
          setWalletSummary(null);
        } else {
          setSummaryError(
            response.message || t("wallet:messages.summaryLoadFailed"),
          );
        }
      } else {
        const response = await walletApi.getDeveloperWalletSummary();
        if (response.success && response.data) {
          setWalletSummary(response.data);
          setWalletInfo(null);
        } else {
          setSummaryError(
            response.message || t("wallet:messages.summaryLoadFailed"),
          );
        }
      }
    } catch (error: any) {
      console.error("Failed to load wallet summary", error);
      setSummaryError(
        error.response?.data?.message ||
          error.message ||
          t("wallet:messages.summaryLoadFailed"),
      );
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await walletApi.getMyTransactions(page, 10);
      if (response.success && response.data) {
        setTransactions(response.data.content);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error("Failed to load transactions", error);
    }
  };

  const loadWithdrawals = async () => {
    if (!canUseSelfServiceWithdrawal) {
      setWithdrawals([]);
      return;
    }

    try {
      const response = await walletApi.getDeveloperWithdrawals();
      if (response.success && response.data) {
        setWithdrawals(response.data);
      }
    } catch (error) {
      console.error("Failed to load withdrawals", error);
    }
  };

  const loadPendingTopUp = async () => {
    if (!canTopUp) {
      setPendingTopUp(null);
      return;
    }

    try {
      const response = await paymentApi.getMyPayments();
      if (!response.success || !response.data) {
        return;
      }

      const candidates = response.data
        .filter(
          (p) =>
            p.paymentReference?.startsWith("TOPUP:") &&
            (p.paymentStatus === "PENDING" || p.paymentStatus === "PROCESSING") &&
            p.checkoutUrl,
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );

      const latest = candidates[0];
      if (!latest) {
        setPendingTopUp(null);
        return;
      }

      const confirmResponse = await paymentApi.confirmPayment(latest.id);
      const refreshed =
        confirmResponse.success && confirmResponse.data
          ? confirmResponse.data
          : latest;

      if (
        (refreshed.paymentStatus === "PENDING" ||
          refreshed.paymentStatus === "PROCESSING") &&
        refreshed.checkoutUrl
      ) {
        setPendingTopUp(refreshed);
      } else {
        setPendingTopUp(null);
        if (refreshed.paymentStatus === "PAID") {
          await loadWalletSummary();
        }
      }
    } catch (error) {
      console.error("Failed to check pending top-up", error);
    }
  };

  const handleResumeTopUp = async () => {
    if (!pendingTopUp) return;
    setIsResumingTopUp(true);
    try {
      const response = await paymentApi.confirmPayment(pendingTopUp.id);
      const refreshed =
        response.success && response.data ? response.data : pendingTopUp;
      if (
        refreshed.paymentStatus === "PENDING" ||
        refreshed.paymentStatus === "PROCESSING"
      ) {
        const paymentWithQr = mergePaymentWithStoredQr(refreshed);
        if (paymentWithQr.qrCode) {
          onOpenPaymentQr(paymentWithQr);
        } else if (refreshed.checkoutUrl) {
          window.location.href = refreshed.checkoutUrl;
        }
      } else {
        setPendingTopUp(null);
        if (refreshed.paymentStatus === "PAID") {
          await loadWalletSummary();
        }
      }
    } catch (error) {
      console.error("Failed to resume top-up", error);
    } finally {
      setIsResumingTopUp(false);
    }
  };

  const handleCancelTopUp = async () => {
    if (!pendingTopUp) return;
    setIsCancellingTopUp(true);
    try {
      await paymentApi.cancelPayment(pendingTopUp.id);
    } catch (error) {
      console.error("Failed to cancel pending top-up", error);
    } finally {
      setPendingTopUp(null);
      setIsCancellingTopUp(false);
    }
  };

  useEffect(() => {
    loadWalletSummary();
    if (canUseSelfServiceWithdrawal) {
      loadWithdrawals();
    } else {
      setWithdrawals([]);
    }
    if (canTopUp) {
      loadPendingTopUp();
    } else {
      setPendingTopUp(null);
    }
  }, [isAdmin, canTopUp, canUseSelfServiceWithdrawal]);

  useEffect(() => {
    loadTransactions();
  }, [page]);

  useEffect(() => {
    if (!canUseSelfServiceWithdrawal && activeRightTab === "withdraw") {
      setActiveRightTab("topup");
    }
  }, [activeRightTab, canUseSelfServiceWithdrawal]);

  useEffect(() => {
    const shouldSuggestTopUp =
      new URLSearchParams(window.location.search).get("suggestTopUp") === "1";
    if (!shouldSuggestTopUp) return;

    const context = readPendingCheckoutContext();
    if (!context) return;

    setSuggestedCheckout(context);
    setActiveRightTab("topup");
    setTopUpAmount(String(resolveSuggestedTopUpAmount(context.shortfall)));
  }, [setTopUpAmount]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUseSelfServiceWithdrawal) {
      return;
    }
    setFormError(null);
    setSuccessMessage(null);

    const parsedAmount = Number(sanitizeAmountInput(amount));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError(t("wallet:messages.invalidAmount"));
      return;
    }

    if (
      walletSummary &&
      parsedAmount > Number(walletSummary.availableBalance)
    ) {
      setFormError(t("wallet:messages.exceedsRevenue"));
      return;
    }

    const payload: CreateWithdrawalRequest = {
      amount: parsedAmount,
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      accountHolder: accountHolder.trim(),
      note: note.trim() || undefined,
    };

    if (!payload.bankName || !payload.bankAccount || !payload.accountHolder) {
      setFormError(t("wallet:messages.missingBankInfo"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await walletApi.createDeveloperWithdrawal(payload);
      if (response.success) {
        setSuccessMessage(
          response.data?.transferReference
            ? t("wallet:messages.successWithReference", {
                reference: response.data.transferReference,
              })
            : t("wallet:messages.successWithoutReference"),
        );
        setAmount("");
        setNote("");
        await Promise.all([loadWalletSummary(), loadWithdrawals()]);
      } else {
        setFormError(
          response.code === "WITHDRAWAL_EXCEEDS_REVENUE"
            ? t("wallet:messages.exceedsRevenue")
            : response.message || t("wallet:messages.submitFailed"),
        );
      }
    } catch (error: any) {
      setFormError(
        error.response?.data?.code === "WITHDRAWAL_EXCEEDS_REVENUE"
          ? t("wallet:messages.exceedsRevenue")
          : error.response?.data?.message ||
              error.message ||
              t("wallet:messages.submitFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTopUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canTopUp) {
      return;
    }
    setTopUpError(null);

    const parsedAmount = Number(sanitizeAmountInput(topUpAmount));
    if (Number.isNaN(parsedAmount) || parsedAmount < 10000) {
      setTopUpError(t("wallet:topup.messages.invalidAmount"));
      return;
    }

    setIsTopUpSubmitting(true);
    try {
      const response = await walletApi.createTopUp({ amount: parsedAmount });
      if (
        response.success &&
        response.data &&
        (response.data.qrCode || response.data.checkoutUrl)
      ) {
        if (suggestedCheckout) {
          updatePendingCheckoutContext({
            triggeredTopUpPaymentId: response.data.id,
            readyToResume: false,
          });
        }
        onOpenPaymentQr(response.data);
      } else {
        setTopUpError(
          response.message || t("wallet:topup.messages.submitFailed"),
        );
      }
    } catch (error: any) {
      setTopUpError(
        error.response?.data?.message ||
          error.message ||
          t("wallet:topup.messages.submitFailed"),
      );
    } finally {
      setIsTopUpSubmitting(false);
    }
  };

  const summaryCurrency =
    (isAdmin ? walletInfo?.currency : walletSummary?.currency) ||
    resolveCurrency();
  const usableBalance = walletSummary
    ? Math.max(
        Number(walletSummary.walletBalance) -
          Number(walletSummary.pendingBalance),
        0,
      )
    : undefined;
  const walletBalance = isAdmin ? walletInfo?.balance : usableBalance;
  const walletUpdatedAt = isAdmin
    ? walletInfo?.updatedAt
    : walletSummary?.updatedAt?.toString();
  const renderSummaryValue = (value?: number) => {
    if (isLoadingSummary) {
      return t("wallet:common.loading");
    }
    if (value == null) {
      return t("wallet:common.notAvailable");
    }
    return formatMoney(
      Number(value),
      summaryCurrency,
      locale,
      t("wallet:common.notAvailable"),
    );
  };

  const handleRefreshAll = () => {
    loadWalletSummary();
    if (canUseSelfServiceWithdrawal) {
      loadWithdrawals();
    } else {
      setWithdrawals([]);
    }
    loadTransactions();
    if (canTopUp) {
      loadPendingTopUp();
    } else {
      setPendingTopUp(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in py-2">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              setCurrentScreen(isAdmin ? "admin" : "dashboard")
            }
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            {t("wallet:page.backToDashboard")}
          </button>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isAdmin
              ? t("wallet:page.titleAdmin")
              : isCustomer
                ? t("wallet:page.titleCustomer")
                : t("wallet:page.title")}
          </h1>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isAdmin
              ? t("wallet:page.subtitleAdmin")
              : isCustomer
                ? t("wallet:page.subtitleCustomer")
                : t("wallet:page.subtitle")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={
            <RefreshCw
              size={13}
              className={isLoadingSummary ? "animate-spin" : ""}
            />
          }
          onClick={handleRefreshAll}
        >
          {t("wallet:common.refresh")}
        </Button>
      </div>

      {summaryError && !isLoadingSummary && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400"
        >
          {t("wallet:messages.summaryLoadFailed")}
        </div>
      )}

      {/* ── Pending top-up banner ────────────────────────────── */}
      {canTopUp && pendingTopUp && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 md:flex-row md:items-center md:justify-between dark:bg-amber-500/[0.04]">
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {t("wallet:pendingTopup.title")}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t("wallet:pendingTopup.description", {
                amount: formatMoney(
                  Number(pendingTopUp.amount),
                  pendingTopUp.currency ?? summaryCurrency,
                  locale,
                  t("wallet:common.notAvailable"),
                ),
                createdAt: formatTimestamp(
                  pendingTopUp.createdAt,
                  locale,
                  t("wallet:common.notAvailable"),
                ),
              })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleResumeTopUp}
              disabled={isResumingTopUp || isCancellingTopUp}
            >
              {isResumingTopUp
                ? t("wallet:pendingTopup.resuming")
                : t("wallet:pendingTopup.resume")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelTopUp}
              disabled={isResumingTopUp || isCancellingTopUp}
            >
              {isCancellingTopUp
                ? t("wallet:pendingTopup.cancelling")
                : t("wallet:pendingTopup.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Summary stat cards ───────────────────────────────── */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          isAdmin
            ? "sm:grid-cols-1"
            : isCustomer
              ? "sm:grid-cols-2"
              : "sm:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {isAdmin ? (
          <div className="dark-depth-card space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
              {t("wallet:cards.walletBalance")}
            </span>
            <div className="flex items-baseline gap-2">
              <Wallet2
                size={16}
                className="text-emerald-500 shrink-0 relative top-0.5"
              />
              <span className="text-2xl font-display font-bold dark:text-white">
                {walletInfo
                  ? formatMoney(
                      Number(walletInfo.balance),
                      summaryCurrency,
                      locale,
                      t("wallet:common.notAvailable"),
                    )
                  : isLoadingSummary
                    ? t("wallet:common.loading")
                    : t("wallet:common.notAvailable")}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
              {t("wallet:cards.walletBalanceDescriptionAdmin")}
            </p>
          </div>
        ) : (
          <>
            <WalletMetricCard
              label={t("wallet:cards.totalBalance")}
              value={renderSummaryValue(usableBalance)}
              description={t("wallet:cards.totalBalanceDescription")}
              icon={<Wallet2 size={17} />}
              accentClass="border-violet-500/20 bg-violet-500/10 text-violet-500 dark:text-violet-400"
              glowClass="bg-violet-500"
              barClass="bg-gradient-to-r from-violet-500 via-fuchsia-400 to-transparent"
            />

            {!isCustomer && (
              <>
                <WalletMetricCard
                  label={t("wallet:cards.availableBalance")}
                  value={renderSummaryValue(walletSummary?.availableBalance)}
                  description={t("wallet:cards.availableDescription")}
                  icon={<Landmark size={17} />}
                  accentClass="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                  glowClass="bg-emerald-500"
                  barClass="bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent"
                />

                <WalletMetricCard
                  label={t("wallet:cards.pendingWithdrawal")}
                  value={renderSummaryValue(walletSummary?.pendingBalance)}
                  description={t("wallet:cards.pendingDescription")}
                  icon={<Clock3 size={17} />}
                  accentClass="border-sky-500/20 bg-sky-500/10 text-sky-500 dark:text-sky-400"
                  glowClass="bg-sky-500"
                  barClass="bg-gradient-to-r from-sky-500 via-cyan-400 to-transparent"
                />
              </>
            )}

            {isCustomer && (
              <WalletMetricCard
                label={t("wallet:cards.restrictedBalance")}
                value={renderSummaryValue(walletSummary?.restrictedBalance)}
                description={t("wallet:cards.restrictedDescription")}
                icon={<ReceiptText size={17} />}
                accentClass="border-rose-500/20 bg-rose-500/10 text-rose-500 dark:text-rose-400"
                glowClass="bg-rose-500"
                barClass="bg-gradient-to-r from-rose-500 via-pink-400 to-transparent"
              />
            )}

            {!isCustomer && (
              <WalletMetricCard
                label={t("wallet:cards.totalRevenue")}
                value={renderSummaryValue(walletSummary?.totalRevenue)}
                description={t("wallet:cards.revenueDescription")}
                icon={<TrendingUp size={17} />}
                accentClass="border-amber-500/20 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                glowClass="bg-amber-500"
                barClass="bg-gradient-to-r from-amber-500 via-orange-400 to-transparent"
              />
            )}
          </>
        )}
      </div>

      {/* Ledger timestamp */}
      <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
        {walletBalance != null
          ? t("wallet:page.ledger", {
              balance: formatMoney(
                Number(walletBalance),
                summaryCurrency,
                locale,
                t("wallet:common.notAvailable"),
              ),
              updatedAt: formatTimestamp(
                walletUpdatedAt,
                locale,
                t("wallet:common.notAvailable"),
              ),
            })
          : isLoadingSummary
            ? t("wallet:page.loadingLedger")
            : t("wallet:page.emptyLedger")}
      </p>

      {/* ── Main two-column workspace ────────────────────────── */}
      <div
        className={`grid grid-cols-1 gap-8 ${
          isAdmin ? "" : "xl:grid-cols-[1fr_0.7fr]"
        }`}
      >
        {/* Left column — tables */}
        <section className="space-y-6">
          {/* Payout request history */}
          {canUseSelfServiceWithdrawal && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {t("wallet:history.title")}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {t("wallet:history.subtitle")}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  {t("wallet:history.requestsCount", {
                    count: withdrawals.length,
                  })}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-mono">
                      <th className="p-3">
                        {t("wallet:history.columns.status")}
                      </th>
                      <th className="p-3">
                        {t("wallet:history.columns.amount")}
                      </th>
                      <th className="p-3">
                        {t("wallet:history.columns.reference")}
                      </th>
                      <th className="p-3">
                        {t("wallet:history.columns.created")}
                      </th>
                      <th className="p-3">
                        {t("wallet:history.columns.processed")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-xs text-slate-500 dark:text-slate-400"
                        >
                          {t("wallet:history.empty")}
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((withdrawal) => {
                        const statusMeta = getStatusMeta(
                          withdrawal.status,
                          t,
                        );
                        return (
                          <tr
                            key={withdrawal.id}
                            className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors"
                          >
                            <td className="p-3">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusMeta.colorClass}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-semibold dark:text-amber-400">
                              {formatMoney(
                                Number(withdrawal.amount),
                                withdrawal.currency ?? summaryCurrency,
                                locale,
                                t("wallet:common.notAvailable"),
                              )}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              {withdrawal.transferReference || "\u2014"}
                            </td>
                            <td className="p-3 text-[10px] text-slate-500 dark:text-slate-400">
                              {formatTimestamp(
                                withdrawal.createdAt?.toString(),
                                locale,
                                t("wallet:common.notAvailable"),
                              )}
                            </td>
                            <td className="p-3 text-[10px] text-slate-500 dark:text-slate-400">
                              {formatTimestamp(
                                withdrawal.processedAt?.toString(),
                                locale,
                                t("wallet:common.notAvailable"),
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transaction ledger */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {t("wallet:transactions.title")}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {t("wallet:transactions.subtitle")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={13} />}
                onClick={loadTransactions}
              >
                {t("wallet:common.refresh")}
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/80 dark:bg-slate-900/45 backdrop-blur-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-mono">
                    <th className="p-3">
                      {t("wallet:transactions.columns.type")}
                    </th>
                    <th className="p-3">
                      {t("wallet:transactions.columns.amount")}
                    </th>
                    <th className="p-3">
                      {t("wallet:transactions.columns.balanceAfter")}
                    </th>
                    <th className="p-3">
                      {t("wallet:transactions.columns.reference")}
                    </th>
                    <th className="p-3">
                      {t("wallet:transactions.columns.time")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                  {transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        {t("wallet:transactions.empty")}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => {
                      const typeMeta = getTransactionTypeMeta(txn.type, t);
                      return (
                        <tr
                          key={txn.id}
                          className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 transition-colors"
                        >
                          <td className="p-3">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeMeta.colorClass}`}
                            >
                              {typeMeta.label}
                            </span>
                          </td>
                          <td
                            className={`p-3 font-mono font-semibold ${
                              Number(txn.amount) < 0
                                ? "text-rose-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {Number(txn.amount) > 0 ? "+" : ""}
                            {formatMoney(
                              Number(txn.amount),
                              summaryCurrency,
                              locale,
                              t("wallet:common.notAvailable"),
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300 font-semibold">
                            {txn.balanceAfter !== undefined && txn.balanceAfter !== null
                              ? formatMoney(
                                  Number(txn.balanceAfter),
                                  summaryCurrency,
                                  locale,
                                  t("wallet:common.notAvailable"),
                                )
                              : t("wallet:common.notAvailable")}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {txn.referenceId || "\u2014"}
                          </td>
                          <td className="p-3 text-[10px] text-slate-500 dark:text-slate-400">
                            {formatTimestamp(
                              txn.createdAt?.toString(),
                              locale,
                              t("wallet:common.notAvailable"),
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono">
                {t("wallet:transactions.pageCounter", {
                  page: page + 1,
                  totalPages,
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t("wallet:transactions.previous")}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages - 1, prev + 1))
                  }
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t("wallet:transactions.next")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right column — forms */}
        {!isAdmin && (
          <aside className="space-y-6">
            {/* Tab switcher for top-up / withdraw */}
            <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-1.5">
              {canTopUp && (
                <button
                  type="button"
                  onClick={() => setActiveRightTab("topup")}
                  className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeRightTab === "topup"
                      ? "border-sky-500 text-sky-500"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <ArrowDownToLine size={13} />
                  {t("wallet:topup.title")}
                </button>
              )}
              {canUseSelfServiceWithdrawal && (
                <button
                  type="button"
                  onClick={() => setActiveRightTab("withdraw")}
                  className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeRightTab === "withdraw"
                      ? "border-sky-500 text-sky-500"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Landmark size={13} />
                  {t("wallet:form.title")}
                </button>
              )}
            </div>

            {/* ── Top-up form ──────────────────────────────────── */}
            {activeRightTab === "topup" && canTopUp && (
              <div className="dark-depth-card space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-slate-900">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {t("wallet:topup.title")}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {t("wallet:topup.subtitle")}
                  </p>
                </div>

                {topUpError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-semibold">
                    {topUpError}
                  </div>
                )}

                {suggestedCheckout && (
                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-400/12 via-orange-400/8 to-transparent p-4">
                    <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-400/15 text-amber-600 dark:text-amber-400">
                        <Sparkles size={17} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          {t("wallet:topup.suggestionTitle")}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                          {t("wallet:topup.suggestionDescription", {
                            amount: formatMoney(
                              suggestedCheckout.shortfall,
                              "VND",
                              locale,
                              t("wallet:common.notAvailable"),
                            ),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}


                <form className="space-y-4" onSubmit={handleTopUp}>
                  <Input
                    label={t("wallet:topup.amountLabel")}
                    placeholder={t("wallet:topup.amountPlaceholder")}
                    type="text"
                    inputMode="numeric"
                    {...topUpAmountInput.inputProps}
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isTopUpSubmitting}
                  >
                    {isTopUpSubmitting
                      ? t("wallet:topup.submitting")
                      : t("wallet:topup.submit")}
                  </Button>
                </form>
              </div>
            )}

            {/* ── Withdrawal form ──────────────────────────────── */}
            {activeRightTab === "withdraw" && canUseSelfServiceWithdrawal && (
              <div className="dark-depth-card space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-slate-900">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {t("wallet:form.title")}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {t("wallet:form.subtitle")}
                  </p>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-semibold">
                    {formError}
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold">
                    {successMessage}
                  </div>
                )}

                {/* Limits info */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-semibold">
                    <ReceiptText size={13} className="text-amber-500" />
                    <span>{t("wallet:form.currentLimits")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("wallet:form.minimumWithdrawal")}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("wallet:form.availableToWithdraw", {
                      amount: walletSummary
                        ? formatMoney(
                            Number(walletSummary.availableBalance),
                            summaryCurrency,
                            locale,
                            t("wallet:common.notAvailable"),
                          )
                        : t("wallet:common.loading"),
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("wallet:form.pendingReserve", {
                      amount: walletSummary
                        ? formatMoney(
                            Number(walletSummary.pendingBalance),
                            summaryCurrency,
                            locale,
                            t("wallet:common.notAvailable"),
                          )
                        : t("wallet:common.loading"),
                    })}
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Input
                    label={t("wallet:form.amountLabel")}
                    placeholder={t("wallet:form.amountPlaceholder")}
                    type="text"
                    inputMode="numeric"
                    {...withdrawAmountInput.inputProps}
                    required
                  />
                  {hasVerifiedBankInfo ? (
                    <div className="p-3 bg-sky-500/5 border border-sky-500/15 rounded-lg space-y-1 relative">
                      <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                        {t("wallet:form.bankNameLabel")}
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {bankName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t("wallet:form.accountNumberLabel")}:{" "}
                        <span className="font-semibold font-mono">
                          {bankAccount}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t("wallet:form.accountHolderLabel")}:{" "}
                        <span className="font-semibold">
                          {accountHolder}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                      {t("wallet:messages.missingBankInfo")}
                    </div>
                  )}
                  <TextArea
                    label={t("wallet:form.noteLabel")}
                    placeholder={t("wallet:form.notePlaceholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isSubmitting || isLoadingSummary || !hasVerifiedBankInfo}
                  >
                    {isSubmitting
                      ? t("wallet:form.submitting")
                      : t("wallet:form.submit")}
                  </Button>
                </form>
              </div>
            )}

            {/* Workflow guide */}
            <div className="dark-depth-card space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {t("wallet:workflow.title")}
              </h3>
              <ul className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <li className="flex gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    1
                  </span>
                  {t("wallet:workflow.step1")}
                </li>
                <li className="flex gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    2
                  </span>
                  {t("wallet:workflow.step2")}
                </li>
                <li className="flex gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    3
                  </span>
                  {t("wallet:workflow.step3")}
                </li>
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
