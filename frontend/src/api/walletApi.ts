import api from './axios';
import {
  ApiResponse,
  WalletResponse,
  PayoutBalanceResponse,
  PageResponse,
  TransactionResponse,
  DeveloperWalletSummaryResponse,
  DeveloperSalesStatsResponse,
  WithdrawalResponse,
  WithdrawalDetailResponse,
  CreateWithdrawalRequest,
  RejectWithdrawalRequest,
  CreateTopUpRequest,
  PaymentResponse
} from '../types';

export const walletApi = {
  getMyWallet: async (): Promise<ApiResponse<WalletResponse>> => {
    const response = await api.get<ApiResponse<WalletResponse>>('/api/v1/wallets/me');
    return response.data;
  },

  getMyTransactions: async (page = 0, size = 10): Promise<ApiResponse<PageResponse<TransactionResponse>>> => {
    const response = await api.get<ApiResponse<PageResponse<TransactionResponse>>>(
      `/api/v1/wallets/me/transactions?page=${page}&size=${size}`
    );
    return response.data;
  },

  getDeveloperWalletSummary: async (): Promise<ApiResponse<DeveloperWalletSummaryResponse>> => {
    const response = await api.get<ApiResponse<DeveloperWalletSummaryResponse>>('/api/v1/wallets/summary');
    return response.data;
  },

  getDeveloperSalesStats: async (): Promise<ApiResponse<DeveloperSalesStatsResponse>> => {
    const response = await api.get<ApiResponse<DeveloperSalesStatsResponse>>('/api/v1/wallets/sales-stats');
    return response.data;
  },

  createTopUp: async (data: CreateTopUpRequest): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>('/api/v1/payments/topup', data);
    return response.data;
  },

  createDeveloperWithdrawal: async (data: CreateWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>('/api/v1/wallets/withdrawals', data);
    return response.data;
  },

  getDeveloperWithdrawals: async (): Promise<ApiResponse<WithdrawalResponse[]>> => {
    const response = await api.get<ApiResponse<WithdrawalResponse[]>>('/api/v1/wallets/withdrawals');
    return response.data;
  },

  getDeveloperWithdrawalDetail: async (id: string): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.get<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/wallets/withdrawals/${id}`);
    return response.data;
  },

  getAdminWithdrawals: async (): Promise<ApiResponse<WithdrawalResponse[]>> => {
    const response = await api.get<ApiResponse<WithdrawalResponse[]>>('/api/v1/admin/withdrawals');
    return response.data;
  },

  getAdminWithdrawalDetail: async (id: string): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.get<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}`);
    return response.data;
  },

  getAdminPayoutBalance: async (): Promise<ApiResponse<PayoutBalanceResponse>> => {
    const response = await api.get<ApiResponse<PayoutBalanceResponse>>('/api/v1/admin/payout/balance');
    return response.data;
  },

  syncAdminWithdrawal: async (id: string): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/sync`);
    return response.data;
  },

  rejectWithdrawal: async (id: string, data: RejectWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/reject`, data);
    return response.data;
  },

  // CHỈ DÙNG CHO DEMO/TEST: lùi createdAt của 1 withdrawal đang pending về đủ
  // điều kiện tự động payout ngay (theo withdrawalHoldDays hiện tại), thay
  // cho việc phải tự chạy UPDATE SQL thủ công.
  demoBackdateWithdrawal: async (id: string): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/demo-backdate`);
    return response.data;
  }
};
