import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Copy,
  FastForward,
  Landmark,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  UserRound,
  Wallet2,
  X,
} from "lucide-react";
import { Button } from "../Button";
import { PayoutBalanceResponse, WithdrawalDetailResponse, WithdrawalStatus } from "../../types";

export interface WithdrawalStatusNotice {
  title: string;
  message: string;
  tone: "info" | "warning" | "success";
}

export interface WithdrawalPayoutProgress {
  phase: "processing" | "success" | "failed" | "timeout";
  remainingMs: number;
  totalMs: number;
  message?: string;
}

interface AdminWithdrawalDetailModalProps {
  withdrawal: WithdrawalDetailResponse | null;
  adminPayoutBalance?: PayoutBalanceResponse | null;
  isLoadingAdminPayoutBalance?: boolean;
  isBusy: boolean;
  isOpen: boolean;
  error?: string | null;
  rejectRemark: string;
  onRejectRemarkChange: (value: string) => void;
  onClose: () => void;
  onSync: () => void;
  onReject: () => void;
  // CHỈ DÙNG CHO DEMO/TEST: lùi createdAt để withdrawal đủ điều kiện tự
  // động payout ngay, thay vì phải tự chạy UPDATE SQL thủ công.
  onDemoBackdate: () => void;
  statusNotice?: WithdrawalStatusNotice | null;
  payoutProgress?: WithdrawalPayoutProgress | null;
  onDismissStatusNotice: () => void;
}

const formatMoney = (
  value: number | undefined,
  currency = "VND",
  fallback = "N/A",
) => {
  if (value == null) return fallback;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTimestamp = (value: string | null | undefined, fallback = "N/A") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const getStatusMeta = (status: WithdrawalStatus, t: (key: string) => string) => {
  switch (status) {
    case "pending":
      return {
        label: t("status.withdrawal.pending"),
        className: "bg-amber-100 text-amber-700 border border-amber-200",
      };
    case "approved":
      return {
        label: t("status.withdrawal.approved"),
        className: "bg-violet-100 text-violet-700 border border-violet-200",
      };
    case "processing":
      return {
        label: t("status.withdrawal.processing"),
        className: "bg-sky-100 text-sky-700 border border-sky-200",
      };
    case "completed":
      return {
        label: t("status.withdrawal.completed"),
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      };
    case "failed":
      return {
        label: t("status.withdrawal.failed"),
        className: "bg-rose-100 text-rose-700 border border-rose-200",
      };
    case "rejected":
      return {
        label: t("status.withdrawal.rejected"),
        className: "bg-rose-100 text-rose-700 border border-rose-200",
      };
    case "cancelled":
      return {
        label: t("status.withdrawal.cancelled"),
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      };
  }
};

const formatHoldCountdown = (eligibleAt?: string | null) => {
  if (!eligibleAt) return null;
  const target = new Date(eligibleAt).getTime();
  if (Number.isNaN(target)) return null;
  const diffMs = target - Date.now();
  if (diffMs <= 0) return "Sẽ tự động chi trả trong lần quét tiếp theo";
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return `Còn khoảng ${days} ngày sẽ tự động chi trả`;
};

const copyToClipboard = async (value?: string | null) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    console.error("Failed to copy text", error);
  }
};

const getNoticeMeta = (tone: WithdrawalStatusNotice["tone"]) => {
  switch (tone) {
    case "success":
      return {
        icon: <BadgeCheck size={18} />,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300",
      };
    case "warning":
      return {
        icon: <ShieldAlert size={18} />,
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-300",
      };
    default:
      return {
        icon: <LoaderCircle size={18} />,
        className:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/60 dark:text-sky-300",
      };
  }
};

const formatCountdown = (valueMs: number) => {
  const safeMs = Math.max(0, valueMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const getPayoutProgressMeta = (
  progress: WithdrawalPayoutProgress,
  t: (key: string) => string,
) => {
  switch (progress.phase) {
    case "success":
      return {
        icon: <BadgeCheck size={28} />,
        iconClassName: "bg-emerald-500/15 text-emerald-300",
        badgeClassName: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        barClassName: "bg-emerald-400",
        title: t("status.withdrawal.completed"),
        message:
          progress.message
          || t("withdrawal.successBalanceArrived"),
      };
    case "failed":
      return {
        icon: <ShieldAlert size={28} />,
        iconClassName: "bg-rose-500/15 text-rose-300",
        badgeClassName: "border border-rose-500/30 bg-rose-500/10 text-rose-200",
        barClassName: "bg-rose-400",
        title: t("status.withdrawal.failed"),
        message:
          progress.message
          || t("withdrawal.payoutFailedMessage"),
      };
    case "timeout":
      return {
        icon: <AlertTriangle size={28} />,
        iconClassName: "bg-amber-500/15 text-amber-300",
        badgeClassName: "border border-amber-500/30 bg-amber-500/10 text-amber-100",
        barClassName: "bg-amber-400",
        title: t("status.withdrawal.failed"),
        message:
          progress.message
          || t("withdrawal.timeoutMessage"),
      };
    default:
      return {
        icon: <LoaderCircle size={28} className="animate-spin" />,
        iconClassName: "bg-sky-500/15 text-sky-300",
        badgeClassName: "border border-sky-500/30 bg-sky-500/10 text-sky-100",
        barClassName: "bg-sky-400",
        title: t("status.withdrawal.processing"),
        message:
          progress.message
          || t("withdrawal.detail.processingDescription"),
      };
  }
};

export const AdminWithdrawalDetailModal: React.FC<
  AdminWithdrawalDetailModalProps
> = ({
  withdrawal,
  adminPayoutBalance,
  isLoadingAdminPayoutBalance,
  isBusy,
  isOpen,
  error,
  rejectRemark,
  onRejectRemarkChange,
  onClose,
  onSync,
  onReject,
  onDemoBackdate,
  statusNotice,
  payoutProgress,
  onDismissStatusNotice,
}) => {
  const { t } = useTranslation(["admin"]);
  if (!isOpen || !withdrawal) {
    return null;
  }

  const statusMeta = getStatusMeta(withdrawal.status, t);
  const canSync = withdrawal.status === "processing";
  const holdCountdown =
    withdrawal.status === "pending"
      ? formatHoldCountdown(withdrawal.autoPayoutEligibleAt)
      : null;
  const canReject =
    withdrawal.status === "pending" ||
    withdrawal.status === "approved" ||
    withdrawal.status === "processing";
  // Backend chỉ chấp nhận demo-backdate cho withdrawal đang pending.
  const canDemoBackdate = withdrawal.status === "pending";
  const currency = withdrawal.currency || "VND";
  const noticeMeta = statusNotice ? getNoticeMeta(statusNotice.tone) : null;
  const progressMeta = payoutProgress ? getPayoutProgressMeta(payoutProgress, t) : null;
  const adminPayoutCurrency = adminPayoutBalance?.currency || "VND";
  const adminPayoutDisplay = isLoadingAdminPayoutBalance
    ? t("common.loading")
    : adminPayoutBalance
      ? formatMoney(Number(adminPayoutBalance.balance), adminPayoutCurrency, t("withdrawal.na"))
      : t("withdrawal.na");
  const payoutProgressPercent = payoutProgress
    ? Math.max(
      0,
      Math.min(
        100,
        ((payoutProgress.totalMs - payoutProgress.remainingMs) / payoutProgress.totalMs) * 100
      )
    )
    : 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-4 sm:p-6 backdrop-blur-md animate-fade-in">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {t("withdrawal.detail.title")}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {withdrawal.developerFullName || withdrawal.developerEmail}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
              {withdrawal.heldByDispute && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-300">
                  <ShieldAlert size={12} />
                  Đang giữ do có khiếu nại
                </span>
              )}
              {!withdrawal.heldByDispute && holdCountdown && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/60 dark:text-sky-300">
                  <Clock size={12} />
                  {holdCountdown}
                </span>
              )}
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {withdrawal.transferReference}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                <Wallet2 size={14} className="text-amber-500" />
                {t("withdrawal.detail.adminBalance", { amount: adminPayoutDisplay })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[0.92fr_0.7fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900/5 p-3 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                    <UserRound size={18} />
                  </div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {t("withdrawal.detail.developerInfo")}
                  </h4>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.fullName")}
                    </dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {withdrawal.developerFullName || t("withdrawal.na")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.email")}
                    </dt>
                    <dd className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {withdrawal.developerEmail || t("withdrawal.na")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.created")}
                    </dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                      {formatTimestamp(withdrawal.createdAt, t("withdrawal.na"))}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-600 dark:text-amber-400">
                    <Wallet2 size={18} />
                  </div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {t("withdrawal.detail.walletInfo")}
                  </h4>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.walletBalance")}
                    </dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {formatMoney(withdrawal.walletBalance, currency, t("withdrawal.na"))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.availableBalance")}
                    </dt>
                    <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(withdrawal.availableBalance, currency, t("withdrawal.na"))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.pendingWithdrawal")}
                    </dt>
                    <dd className="font-semibold text-sky-600 dark:text-sky-400">
                      {formatMoney(withdrawal.pendingBalance, currency, t("withdrawal.na"))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.totalRevenue")}
                    </dt>
                    <dd className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatMoney(withdrawal.totalRevenue, currency, t("withdrawal.na"))}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-600 dark:text-sky-400">
                  <Landmark size={18} />
                </div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {t("withdrawal.detail.bankInfo")}
                  </h4>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t("withdrawal.detail.bankName")}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {withdrawal.bankName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t("withdrawal.detail.accountHolder")}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {withdrawal.accountHolder}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.accountNumber")}
                      </p>
                      <p className="mt-2 font-mono text-sm text-slate-900 dark:text-white">
                        {withdrawal.bankAccount}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy size={14} />}
                      onClick={() => copyToClipboard(withdrawal.bankAccount)}
                    >
                      {t("withdrawal.copy")}
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.transferReference")}
                      </p>
                      <p className="mt-2 font-mono text-sm text-slate-900 dark:text-white">
                        {withdrawal.transferReference || t("withdrawal.na")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy size={14} />}
                      onClick={() =>
                        copyToClipboard(withdrawal.transferReference)
                      }
                    >
                      {t("withdrawal.copy")}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t("withdrawal.detail.withdrawalAmount")}
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatMoney(withdrawal.amount, currency, t("withdrawal.na"))}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck size={18} />
                </div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {t("withdrawal.detail.payoutTracking")}
                  </h4>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800/70 dark:bg-slate-900/60">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.payosPayoutId")}
                      </p>
                      <p className="mt-2 break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                        {withdrawal.payosPayoutId || t("withdrawal.detail.noPayoutOrder")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.payosStatus")}
                      </p>
                      <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                        {withdrawal.payosStatus || t("withdrawal.detail.noStatus")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.payosCreated")}
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        {formatTimestamp(withdrawal.payosCreatedAt, t("withdrawal.na"))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.lastProcessed")}
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        {formatTimestamp(withdrawal.processedAt, t("withdrawal.na"))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-950/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.step1")}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {t("withdrawal.detail.step1Title")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.step1Description")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-950/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.step2")}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {t("withdrawal.detail.step2Title")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("withdrawal.detail.step2Description")}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {t("withdrawal.detail.actionsTitle")}
              </h4>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {(withdrawal.payosPayoutId || withdrawal.payosStatus) && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm dark:border-slate-800/70 dark:bg-slate-900/60">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.payosPayoutId")}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                        {withdrawal.payosPayoutId || t("withdrawal.na")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {t("withdrawal.detail.payosStatus")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                        {withdrawal.payosStatus || t("withdrawal.na")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {withdrawal.status === "pending" && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
                  Yêu cầu này sẽ được hệ thống tự động tạo payout order khi hết
                  thời gian giữ (cooling-off), trừ khi có khiếu nại đang mở
                  nhắm vào developer này. Admin chỉ có thể reject để chặn thủ
                  công nếu phát hiện dấu hiệu bất thường.
                </div>
              )}

              {canReject && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t("withdrawal.detail.rejectRemark")}
                  </label>
                  <textarea
                    value={rejectRemark}
                    onChange={(event) =>
                      onRejectRemarkChange(event.target.value)
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    placeholder={t("withdrawal.detail.rejectPlaceholder")}
                  />
                </div>
              )}

              {(withdrawal.remark || withdrawal.status === "rejected") && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="font-semibold">{t("withdrawal.detail.storedRemark")}</span>
                  </div>
                  <p className="mt-2">
                    {withdrawal.remark || t("withdrawal.detail.noRemark")}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {canSync && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    onClick={onSync}
                    disabled={isBusy}
                  >
                    Sync Payout Status
                  </Button>
                )}
                {canDemoBackdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<FastForward size={14} />}
                    onClick={onDemoBackdate}
                    disabled={isBusy}
                    title={t("withdrawal.detail.demoBackdateHint")}
                  >
                    {t("withdrawal.detail.demoBackdate")}
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReject}
                    disabled={isBusy}
                  >
                    {t("withdrawal.detail.rejectRequest")}
                  </Button>
                )}
                {!canSync && !canReject && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("withdrawal.detail.finalStateReadonly")}
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>

        {statusNotice && noticeMeta && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
            <div
              className={`w-full max-w-md rounded-[28px] border p-6 shadow-2xl ${noticeMeta.className}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{noticeMeta.icon}</div>
                <div>
                  <h4 className="font-display text-xl font-bold">
                    {statusNotice.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed opacity-90">
                    {statusNotice.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onDismissStatusNotice}
                >
                  {t("withdrawal.understood")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {payoutProgress && progressMeta && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-[30px] border border-slate-800 bg-slate-950/95 p-6 text-white shadow-[0_30px_100px_rgba(2,6,23,0.78)]">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${progressMeta.iconClassName}`}
                >
                  {progressMeta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {t("withdrawal.detail.payoutTransferStatus")}
                  </p>
                  <h4 className="mt-2 font-display text-2xl font-bold text-white">
                    {progressMeta.title}
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {progressMeta.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${progressMeta.badgeClassName}`}
                  >
                    {payoutProgress.phase === "processing" ? t("withdrawal.detail.processingBadge") : t("withdrawal.detail.updatedBadge")}
                  </span>
                  <span className="font-mono text-xl font-semibold text-white">
                    {formatCountdown(payoutProgress.remainingMs)}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${progressMeta.barClassName}`}
                    style={{ width: `${payoutProgressPercent}%` }}
                  />
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  {payoutProgress.phase === "processing"
                    ? t("withdrawal.detail.processingDescription")
                    : t("withdrawal.detail.updatedDescription")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
