import api from './axios';
import { 
  ApiResponse, 
  WalletResponse, 
  PageResponse, 
  TransactionResponse, 
  DeveloperWalletSummaryResponse,
  WithdrawalResponse,
  WithdrawalDetailResponse,
  CreateWithdrawalRequest, 
  ApproveWithdrawalRequest,
  RejectWithdrawalRequest,
  ReviewWithdrawalRequest 
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
    const response = await api.get<ApiResponse<DeveloperWalletSummaryResponse>>('/api/v1/developer/wallet');
    return response.data;
  },

  createDeveloperWithdrawal: async (data: CreateWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>('/api/v1/developer/withdrawals', data);
    return response.data;
  },

  getDeveloperWithdrawals: async (): Promise<ApiResponse<WithdrawalResponse[]>> => {
    const response = await api.get<ApiResponse<WithdrawalResponse[]>>('/api/v1/developer/withdrawals');
    return response.data;
  },

  getDeveloperWithdrawalDetail: async (id: string): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.get<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/developer/withdrawals/${id}`);
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

  approveWithdrawal: async (id: string, data?: ApproveWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/approve`, data ?? {});
    return response.data;
  },

  markWithdrawalProcessing: async (id: string): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/processing`);
    return response.data;
  },

  completeWithdrawal: async (id: string, data?: ApproveWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/complete`, data ?? {});
    return response.data;
  },

  rejectWithdrawal: async (id: string, data: RejectWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/admin/withdrawals/${id}/reject`, data);
    return response.data;
  },

  reviewWithdrawal: async (id: string, data: ReviewWithdrawalRequest): Promise<ApiResponse<WithdrawalDetailResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalDetailResponse>>(`/api/v1/withdrawals/admin/${id}/review`, data);
    return response.data;
  }
};
