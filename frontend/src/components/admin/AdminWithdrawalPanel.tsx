import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../Button";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { walletApi } from "../../api/walletApi";
import {
  PayoutBalanceResponse,
  WithdrawalDetailResponse,
  WithdrawalResponse,
  WithdrawalStatus,
} from "../../types";
import {
  AdminWithdrawalDetailModal,
  WithdrawalPayoutProgress,
  WithdrawalStatusNotice,
} from "./AdminWithdrawalDetailModal";

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

const PAYOUT_PROGRESS_TOTAL_MS = 30 * 1000;
const PAYOUT_PROGRESS_SYNC_INTERVAL_MS = 1000;
const PAYOUT_PROGRESS_FAILURE_CLOSE_DELAY_MS = 1200;
const WITHDRAWALS_PER_PAGE = 6;

interface PanelStatusFlash {
  tone: "success" | "warning";
  message: string;
}

interface PayoutMonitorState extends WithdrawalPayoutProgress {
  withdrawalId: string;
}

const getWithdrawalSortTimestamp = (withdrawal: WithdrawalResponse) => {
  const value =
    withdrawal.createdAt ||
    withdrawal.updatedAt ||
    withdrawal.processedAt ||
    withdrawal.payosCreatedAt;
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

interface AdminWithdrawalPanelProps {
  onRefreshStateChange?: (state: {
    refresh: () => Promise<void>;
    isRefreshing: boolean;
    isLoadingPrimary: boolean;
    isLoadingSecondary?: boolean;
  }) => void;
}

export const AdminWithdrawalPanel: React.FC<AdminWithdrawalPanelProps> = ({
  onRefreshStateChange,
}) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalDetailResponse | null>(null);
  const [adminPayoutBalance, setAdminPayoutBalance] =
    useState<PayoutBalanceResponse | null>(null);
  const [isLoadingAdminPayoutBalance, setIsLoadingAdminPayoutBalance] =
    useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [panelStatusFlash, setPanelStatusFlash] =
    useState<PanelStatusFlash | null>(null);
  const [statusNotice, setStatusNotice] =
    useState<WithdrawalStatusNotice | null>(null);
  const [payoutProgress, setPayoutProgress] =
    useState<PayoutMonitorState | null>(null);
  const [completionRemark, setCompletionRemark] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WithdrawalStatus>(
    "all",
  );
  const [currentPage, setCurrentPage] = useState(0);

  const loadAdminPayoutBalance = useCallback(async () => {
    setIsLoadingAdminPayoutBalance(true);
    try {
      const response = await walletApi.getAdminPayoutBalance();
      if (response.success && response.data) {
        setAdminPayoutBalance(response.data);
        return response.data;
      }
    } catch (err) {
      console.error("Failed to load admin payout balance", err);
    } finally {
      setIsLoadingAdminPayoutBalance(false);
    }

    return null;
  }, []);

  const loadWithdrawals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await walletApi.getAdminWithdrawals();
      if (response.success && response.data) {
        setWithdrawals(response.data);
      } else {
        setError(response.message || "Không thể tải danh sách rút tiền.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải danh sách rút tiền.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWithdrawals();
    void loadAdminPayoutBalance();
  }, [loadAdminPayoutBalance, loadWithdrawals]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadWithdrawals(), loadAdminPayoutBalance()]);
  }, [loadAdminPayoutBalance, loadWithdrawals]);

  useEffect(() => {
    onRefreshStateChange?.({
      refresh: handleRefresh,
      isRefreshing: isLoading || isLoadingAdminPayoutBalance,
      isLoadingPrimary: isLoading,
      isLoadingSecondary: isLoadingAdminPayoutBalance,
    });
  }, [
    handleRefresh,
    isLoading,
    isLoadingAdminPayoutBalance,
    onRefreshStateChange,
  ]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        withdrawal.developerFullName
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        withdrawal.developerEmail?.toLowerCase().includes(normalizedSearch) ||
        withdrawal.transferReference
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        withdrawal.bankName?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || withdrawal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, withdrawals]);

  const sortedWithdrawals = useMemo(() => {
    const items = [...filteredWithdrawals];

    items.sort(
      (left, right) =>
        getWithdrawalSortTimestamp(right) - getWithdrawalSortTimestamp(left),
    );

    return items;
  }, [filteredWithdrawals]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedWithdrawals.length / WITHDRAWALS_PER_PAGE),
  );

  const paginatedWithdrawals = useMemo(() => {
    const startIndex = currentPage * WITHDRAWALS_PER_PAGE;
    return sortedWithdrawals.slice(
      startIndex,
      startIndex + WITHDRAWALS_PER_PAGE,
    );
  }, [currentPage, sortedWithdrawals]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const openDetail = async (requestId: string) => {
    setIsBusy(true);
    setDetailError(null);
    setStatusNotice(null);
    setPanelStatusFlash(null);
    setPayoutProgress(null);
    setCompletionRemark("");
    setRejectRemark("");
    try {
      const [response] = await Promise.all([
        walletApi.getAdminWithdrawalDetail(requestId),
        loadAdminPayoutBalance(),
      ]);
      if (response.success && response.data) {
        setSelectedWithdrawal(response.data);
        setCompletionRemark("");
        setIsModalOpen(true);
      } else {
        setDetailError(
          response.message || "Không thể tải chi tiết yêu cầu rút tiền.",
        );
      }
    } catch (err: any) {
      setDetailError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải chi tiết yêu cầu rút tiền.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const buildInsufficientPayoutMessage = (
    balance?: PayoutBalanceResponse | null,
  ) => {
    const currentBalance = formatMoney(
      Number(balance?.balance ?? 0),
      balance?.currency || selectedWithdrawal?.currency || "VND",
    );

    return `Số dư hiện tại là ${currentBalance}. Bạn cần nộp tiền vào ví để thực hiện giao dịch.`;
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedWithdrawal(null);
    setDetailError(null);
    setStatusNotice(null);
    setPayoutProgress(null);
    setCompletionRemark("");
    setRejectRemark("");
  }, []);

  const updateWithdrawalInList = useCallback(
    (detail: WithdrawalDetailResponse) => {
      setSelectedWithdrawal(detail);
      setWithdrawals((current) =>
        current.map((item) =>
          item.id === detail.id ? { ...item, ...detail } : item,
        ),
      );
    },
    [],
  );

  const finalizeSuccessfulPayout = useCallback(
    (detail: WithdrawalDetailResponse) => {
      updateWithdrawalInList(detail);
      setPanelStatusFlash({
        tone: "success",
        message: "Tiền đã về tài khoản người dùng",
      });
      closeModal();
      void loadWithdrawals();
      void loadAdminPayoutBalance();
    },
    [
      closeModal,
      loadAdminPayoutBalance,
      loadWithdrawals,
      updateWithdrawalInList,
    ],
  );

  const syncAfterAction = async (
    detail?: WithdrawalDetailResponse | null,
    successText?: string,
  ) => {
    if (detail) {
      setSelectedWithdrawal(detail);
    }
    if (successText) {
      setSuccessMessage(successText);
    }
    if (detail) {
      setWithdrawals((current) =>
        current.map((item) =>
          item.id === detail.id ? { ...item, ...detail } : item,
        ),
      );
    }
    await loadWithdrawals();
  };

  const openPayoutProgress = (detail?: WithdrawalDetailResponse | null) => {
    if (!detail) return;

    setStatusNotice(null);

    if (detail.status === "completed") {
      finalizeSuccessfulPayout(detail);
      return;
    }

    if (detail.status === "failed" || detail.status === "rejected") {
      setPayoutProgress({
        withdrawalId: detail.id,
        phase: "failed",
        remainingMs: 0,
        totalMs: PAYOUT_PROGRESS_TOTAL_MS,
        message:
          detail.remark ||
          "PayOS đã phản hồi payout thất bại hoặc bị từ chối. Tiền chưa về tài khoản ngân hàng của developer.",
      });
      return;
    }

    setPayoutProgress({
      withdrawalId: detail.id,
      phase: "processing",
      remainingMs: PAYOUT_PROGRESS_TOTAL_MS,
      totalMs: PAYOUT_PROGRESS_TOTAL_MS,
    });
  };

  useEffect(() => {
    if (!payoutProgress || payoutProgress.phase !== "processing") {
      return;
    }

    const timerId = window.setInterval(() => {
      setPayoutProgress((current) => {
        if (!current || current.phase !== "processing") {
          return current;
        }

        const nextRemainingMs = Math.max(0, current.remainingMs - 1000);
        if (nextRemainingMs === 0) {
          return {
            ...current,
            phase: "timeout",
            remainingMs: 0,
            message:
              "Đã chờ đủ 30 giây nhưng PayOS vẫn chưa xác nhận chuyển tiền thành công. Vui lòng kiểm tra lại giao dịch hoặc số dư payout wallet.",
          };
        }

        return {
          ...current,
          remainingMs: nextRemainingMs,
        };
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [payoutProgress?.phase]);

  useEffect(() => {
    if (!payoutProgress || payoutProgress.phase !== "processing") {
      return;
    }

    let isDisposed = false;
    let isSyncing = false;

    const syncWithdrawalStatus = async () => {
      if (isDisposed || isSyncing) {
        return;
      }

      isSyncing = true;
      try {
        const response = await walletApi.syncAdminWithdrawal(
          payoutProgress.withdrawalId,
        );
        if (!response.success || !response.data || isDisposed) {
          return;
        }

        const nextDetail = response.data;
        updateWithdrawalInList(nextDetail);

        if (nextDetail.status === "completed") {
          finalizeSuccessfulPayout(nextDetail);
          return;
        }

        if (
          nextDetail.status === "failed" ||
          nextDetail.status === "rejected"
        ) {
          setPayoutProgress((current) =>
            current && current.withdrawalId === nextDetail.id
              ? {
                  ...current,
                  phase: "failed",
                  remainingMs: 0,
                  message:
                    nextDetail.remark ||
                    "PayOS đã phản hồi payout thất bại hoặc bị từ chối. Tiền chưa về tài khoản ngân hàng của developer.",
                }
              : current,
          );
        }
      } catch (syncError) {
        console.error("Failed to synchronize payout status", syncError);
      } finally {
        isSyncing = false;
      }
    };

    void syncWithdrawalStatus();
    const intervalId = window.setInterval(() => {
      void syncWithdrawalStatus();
    }, PAYOUT_PROGRESS_SYNC_INTERVAL_MS);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [
    finalizeSuccessfulPayout,
    payoutProgress?.phase,
    payoutProgress?.withdrawalId,
    updateWithdrawalInList,
  ]);

  useEffect(() => {
    if (
      !payoutProgress ||
      payoutProgress.phase === "processing" ||
      payoutProgress.phase === "success"
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const finalizeProgress = async () => {
        if (payoutProgress.phase === "failed") {
          setPanelStatusFlash({
            tone: "warning",
            message:
              payoutProgress.message ||
              "PayOS đã phản hồi payout thất bại. Vui lòng kiểm tra lại yêu cầu rút tiền.",
          });
        }

        if (payoutProgress.phase === "timeout") {
          setPanelStatusFlash({
            tone: "warning",
            message:
              payoutProgress.message ||
              "Đã chờ 30 giây nhưng chưa có xác nhận thành công từ PayOS. Vui lòng kiểm tra lại payout queue.",
          });
        }

        await loadWithdrawals();
        closeModal();
      };

      void finalizeProgress();
    }, PAYOUT_PROGRESS_FAILURE_CLOSE_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [
    closeModal,
    loadAdminPayoutBalance,
    loadWithdrawals,
    payoutProgress?.message,
    payoutProgress?.phase,
  ]);

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    setIsBusy(true);
    setDetailError(null);
    setPanelStatusFlash(null);
    try {
      const latestPayoutBalance = await loadAdminPayoutBalance();
      if (
        latestPayoutBalance &&
        Number(latestPayoutBalance.balance) < Number(selectedWithdrawal.amount)
      ) {
        setStatusNotice({
          title: "Số dư ví admin không đủ",
          message: buildInsufficientPayoutMessage(latestPayoutBalance),
          tone: "warning",
        });
        return;
      }

      const response = await walletApi.approveWithdrawal(
        selectedWithdrawal.id,
        {
          remark: completionRemark.trim() || undefined,
        },
      );
      if (response.success) {
        const nextDetail = response.data;

        const successText =
          nextDetail?.status === "completed"
            ? "PayOS đã xác nhận payout thành công. Withdrawal đã hoàn tất."
            : nextDetail?.status === "processing"
              ? "Payout order đã được tạo. Hệ thống đang tự động theo dõi việc chuyển tiền."
              : "Withdrawal đã được approve thành công.";

        if (nextDetail) {
          updateWithdrawalInList(nextDetail);
        }
        if (successText) {
          setSuccessMessage(successText);
        }
        openPayoutProgress(nextDetail);
        void loadWithdrawals();
        void loadAdminPayoutBalance();
      } else {
        setDetailError(response.message || "Không thể approve withdrawal.");
      }
    } catch (err: any) {
      if (err.response?.data?.code === "INSUFFICIENT_PAYOUT_BALANCE") {
        const latestPayoutBalance =
          adminPayoutBalance ?? (await loadAdminPayoutBalance());
        setStatusNotice({
          title: "Số dư ví admin không đủ",
          message: buildInsufficientPayoutMessage(latestPayoutBalance),
          tone: "warning",
        });
      } else {
        setDetailError(
          err.response?.data?.message ||
            err.message ||
            "Không thể approve withdrawal.",
        );
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectRemark.trim()) {
      setDetailError("Vui lòng nhập lý do từ chối trước khi reject.");
      return;
    }

    setIsBusy(true);
    setDetailError(null);
    try {
      const response = await walletApi.rejectWithdrawal(selectedWithdrawal.id, {
        remark: rejectRemark.trim(),
      });
      if (response.success) {
        await syncAfterAction(response.data, "Withdrawal đã được reject.");
      } else {
        setDetailError(response.message || "Không thể reject withdrawal.");
      }
    } catch (err: any) {
      setDetailError(
        err.response?.data?.message ||
          err.message ||
          "Không thể reject withdrawal.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-none">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by developer, email, bank, or reference..."
            className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | WithdrawalStatus)
            }
            className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved / Waiting Payout</option>
            <option value="processing">Payout Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Payout Failed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
        {panelStatusFlash && (
          <div
            className={`mt-4 rounded-2xl border p-3 text-sm ${
              panelStatusFlash.tone === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-amber-300 bg-amber-50 text-amber-700"
            }`}
          >
            {panelStatusFlash.message}
          </div>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-950/30 dark:text-slate-400">
              <tr>
                <th className="p-4">Developer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    Đang tải withdrawal queue...
                  </td>
                </tr>
              ) : sortedWithdrawals.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-slate-400 dark:text-slate-500"
                  >
                    Không có yêu cầu rút tiền nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedWithdrawals.map((withdrawal) => {
                  const statusMeta = getStatusMeta(withdrawal.status);
                  return (
                    <tr
                      key={withdrawal.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/30"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {withdrawal.developerFullName || "Developer"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {withdrawal.developerEmail}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-amber-600">
                        {formatMoney(
                          Number(withdrawal.amount),
                          withdrawal.currency || "VND",
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatTimestamp(withdrawal.createdAt?.toString())}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => openDetail(withdrawal.id)}
                          disabled={isBusy}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sortedWithdrawals.length > 0 ? (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              disabled={currentPage === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition-studio disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:shadow-none"
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition-studio disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:shadow-none"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </div>

      <AdminWithdrawalDetailModal
        withdrawal={selectedWithdrawal}
        adminPayoutBalance={adminPayoutBalance}
        isLoadingAdminPayoutBalance={isLoadingAdminPayoutBalance}
        isBusy={isBusy}
        isOpen={isModalOpen}
        error={detailError}
        completionRemark={completionRemark}
        rejectRemark={rejectRemark}
        onCompletionRemarkChange={setCompletionRemark}
        onRejectRemarkChange={setRejectRemark}
        onClose={closeModal}
        onApprove={handleApprove}
        onReject={handleReject}
        statusNotice={statusNotice}
        payoutProgress={payoutProgress}
        onDismissStatusNotice={() => setStatusNotice(null)}
      />
    </div>
  );
};
