import React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Copy,
  Landmark,
  LoaderCircle,
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
  completionRemark: string;
  rejectRemark: string;
  onCompletionRemarkChange: (value: string) => void;
  onRejectRemarkChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  statusNotice?: WithdrawalStatusNotice | null;
  payoutProgress?: WithdrawalPayoutProgress | null;
  onDismissStatusNotice: () => void;
}

const formatMoney = (value?: number, currency = "VND") => {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const getStatusMeta = (status: WithdrawalStatus) => {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        className: "bg-amber-100 text-amber-700 border border-amber-200",
      };
    case "approved":
      return {
        label: "Approved / Waiting Payout",
        className: "bg-violet-100 text-violet-700 border border-violet-200",
      };
    case "processing":
      return {
        label: "Payout Processing",
        className: "bg-sky-100 text-sky-700 border border-sky-200",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      };
    case "failed":
      return {
        label: "Payout Failed",
        className: "bg-rose-100 text-rose-700 border border-rose-200",
      };
    case "rejected":
      return {
        label: "Rejected",
        className: "bg-rose-100 text-rose-700 border border-rose-200",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      };
  }
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

const getPayoutProgressMeta = (progress: WithdrawalPayoutProgress) => {
  switch (progress.phase) {
    case "success":
      return {
        icon: <BadgeCheck size={28} />,
        iconClassName: "bg-emerald-500/15 text-emerald-300",
        badgeClassName: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        barClassName: "bg-emerald-400",
        title: "Chuyển tiền thành công",
        message:
          progress.message
          || "Tiền đã về tài khoản người dùng. Hệ thống sẽ tự động đóng Withdrawal Detail.",
      };
    case "failed":
      return {
        icon: <ShieldAlert size={28} />,
        iconClassName: "bg-rose-500/15 text-rose-300",
        badgeClassName: "border border-rose-500/30 bg-rose-500/10 text-rose-200",
        barClassName: "bg-rose-400",
        title: "Chuyển tiền thất bại",
        message:
          progress.message
          || "PayOS đã phản hồi payout chưa thành công. Vui lòng kiểm tra lại giao dịch trước khi thao tác tiếp.",
      };
    case "timeout":
      return {
        icon: <AlertTriangle size={28} />,
        iconClassName: "bg-amber-500/15 text-amber-300",
        badgeClassName: "border border-amber-500/30 bg-amber-500/10 text-amber-100",
        barClassName: "bg-amber-400",
        title: "Chuyển tiền thất bại",
        message:
          progress.message
          || "Đã chờ 30 giây nhưng chưa thấy PayOS xác nhận hoàn tất. Hệ thống sẽ thoát khỏi trang chi tiết để bạn kiểm tra lại queue.",
      };
    default:
      return {
        icon: <LoaderCircle size={28} className="animate-spin" />,
        iconClassName: "bg-sky-500/15 text-sky-300",
        badgeClassName: "border border-sky-500/30 bg-sky-500/10 text-sky-100",
        barClassName: "bg-sky-400",
        title: "Tiền đang được chuyển tới tài khoản của bạn",
        message:
          progress.message
          || "Hệ thống đang chờ PayOS xác nhận giao dịch. Khi tiền về tài khoản người dùng, màn hình này sẽ tự động đóng.",
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
  completionRemark,
  rejectRemark,
  onCompletionRemarkChange,
  onRejectRemarkChange,
  onClose,
  onApprove,
  onReject,
  statusNotice,
  payoutProgress,
  onDismissStatusNotice,
}) => {
  if (!isOpen || !withdrawal) {
    return null;
  }

  const statusMeta = getStatusMeta(withdrawal.status);
  const canCreatePayout =
    withdrawal.status === "pending" ||
    (withdrawal.status === "approved" && !withdrawal.payosPayoutId);
  const canReject =
    withdrawal.status === "pending" ||
    withdrawal.status === "approved" ||
    withdrawal.status === "processing";
  const currency = withdrawal.currency || "VND";
  const noticeMeta = statusNotice ? getNoticeMeta(statusNotice.tone) : null;
  const progressMeta = payoutProgress ? getPayoutProgressMeta(payoutProgress) : null;
  const adminPayoutCurrency = adminPayoutBalance?.currency || "VND";
  const adminPayoutDisplay = isLoadingAdminPayoutBalance
    ? "Loading..."
    : adminPayoutBalance
      ? formatMoney(Number(adminPayoutBalance.balance), adminPayoutCurrency)
      : "N/A";
  const payoutProgressPercent = payoutProgress
    ? Math.max(
      0,
      Math.min(
        100,
        ((payoutProgress.totalMs - payoutProgress.remainingMs) / payoutProgress.totalMs) * 100
      )
    )
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Withdrawal Detail
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
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {withdrawal.transferReference}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                <Wallet2 size={14} className="text-amber-500" />
                Số dư ví admin: {adminPayoutDisplay}
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
                    Developer Information
                  </h4>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Full Name
                    </dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {withdrawal.developerFullName || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Email
                    </dt>
                    <dd className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {withdrawal.developerEmail || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Created
                    </dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                      {formatTimestamp(withdrawal.createdAt)}
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
                    Wallet Information
                  </h4>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Wallet Balance
                    </dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {formatMoney(withdrawal.walletBalance, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Available Balance
                    </dt>
                    <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(withdrawal.availableBalance, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Pending Withdrawal
                    </dt>
                    <dd className="font-semibold text-sky-600 dark:text-sky-400">
                      {formatMoney(withdrawal.pendingBalance, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Total Revenue
                    </dt>
                    <dd className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatMoney(withdrawal.totalRevenue, currency)}
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
                  Bank Information
                </h4>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Bank Name
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {withdrawal.bankName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Account Holder
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {withdrawal.accountHolder}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Account Number
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
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Transfer Reference
                      </p>
                      <p className="mt-2 font-mono text-sm text-slate-900 dark:text-white">
                        {withdrawal.transferReference || "N/A"}
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
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Withdrawal Amount
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatMoney(withdrawal.amount, currency)}
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
                  Payout Tracking
                </h4>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800/70 dark:bg-slate-900/60">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        PayOS Payout ID
                      </p>
                      <p className="mt-2 break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                        {withdrawal.payosPayoutId || "Chưa tạo payout order"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        PayOS Status
                      </p>
                      <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                        {withdrawal.payosStatus || "Chưa có trạng thái"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        PayOS Created
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        {formatTimestamp(withdrawal.payosCreatedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Last Processed
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        {formatTimestamp(withdrawal.processedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-950/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Step 1
                    </p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      Create payout order
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Admin tạo lệnh chi từ kênh PayOS payout của nền tảng tới
                      tài khoản ngân hàng developer.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-950/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Step 2
                    </p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      Sync transfer result
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Khi PayOS xác nhận chuyển tiền thành công, withdrawal sẽ
                      tự chuyển sang completed.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Actions
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
                        PayOS Payout ID
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                        {withdrawal.payosPayoutId || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        PayOS Status
                      </p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                        {withdrawal.payosStatus || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {canCreatePayout && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Approval Note
                  </label>
                  <textarea
                    value={completionRemark}
                    onChange={(event) =>
                      onCompletionRemarkChange(event.target.value)
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Ghi chú nội bộ cho lần xử lý chuyển khoản này..."
                  />
                </div>
              )}

              {canReject && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Reject Remark
                  </label>
                  <textarea
                    value={rejectRemark}
                    onChange={(event) =>
                      onRejectRemarkChange(event.target.value)
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Nhập lý do từ chối nếu thông tin ngân hàng hoặc amount có vấn đề..."
                  />
                </div>
              )}

              {(withdrawal.remark || withdrawal.status === "rejected") && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="font-semibold">Stored Remark</span>
                  </div>
                  <p className="mt-2">
                    {withdrawal.remark || "Không có ghi chú."}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {canCreatePayout && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onApprove}
                    disabled={isBusy}
                  >
                    Create Payout Order
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReject}
                    disabled={isBusy}
                  >
                    Reject Request
                  </Button>
                )}
                {!canCreatePayout && !canReject && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Withdrawal này đã ở trạng thái cuối và không thể chỉnh sửa
                    thêm.
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>

        {statusNotice && noticeMeta && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
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
                  Đã hiểu
                </Button>
              </div>
            </div>
          </div>
        )}

        {payoutProgress && progressMeta && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-[30px] border border-slate-800 bg-slate-950/95 p-6 text-white shadow-[0_30px_100px_rgba(2,6,23,0.78)]">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${progressMeta.iconClassName}`}
                >
                  {progressMeta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Payout transfer status
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
                    {payoutProgress.phase === "processing" ? "Đang xử lý" : "Đã cập nhật"}
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

                <p className="mt-4 text-xs leading-6 text-slate-400">
                  {payoutProgress.phase === "processing"
                    ? "Hệ thống đang kiểm tra lại trạng thái payout định kỳ và sẽ tự thoát khi giao dịch hoàn tất."
                    : "Trạng thái payout đã được cập nhật. Modal này sẽ tự động đóng trong giây lát."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
