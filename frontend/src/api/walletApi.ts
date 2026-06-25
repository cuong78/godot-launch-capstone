import api from './axios';
import { 
  ApiResponse, 
  WalletResponse, 
  PageResponse, 
  TransactionResponse, 
  WithdrawalRequestResponse, 
  CreateWithdrawalRequest, 
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

  createWithdrawal: async (data: CreateWithdrawalRequest): Promise<ApiResponse<WithdrawalRequestResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalRequestResponse>>('/api/v1/withdrawals', data);
    return response.data;
  },

  getMyWithdrawals: async (): Promise<ApiResponse<WithdrawalRequestResponse[]>> => {
    const response = await api.get<ApiResponse<WithdrawalRequestResponse[]>>('/api/v1/withdrawals/me');
    return response.data;
  },

  getWithdrawalDetail: async (id: string): Promise<ApiResponse<WithdrawalRequestResponse>> => {
    const response = await api.get<ApiResponse<WithdrawalRequestResponse>>(`/api/v1/withdrawals/${id}`);
    return response.data;
  },

  getAllWithdrawals: async (): Promise<ApiResponse<WithdrawalRequestResponse[]>> => {
    const response = await api.get<ApiResponse<WithdrawalRequestResponse[]>>('/api/v1/withdrawals/admin');
    return response.data;
  },

  reviewWithdrawal: async (id: string, data: ReviewWithdrawalRequest): Promise<ApiResponse<WithdrawalRequestResponse>> => {
    const response = await api.post<ApiResponse<WithdrawalRequestResponse>>(`/api/v1/withdrawals/admin/${id}/review`, data);
    return response.data;
  }
};
