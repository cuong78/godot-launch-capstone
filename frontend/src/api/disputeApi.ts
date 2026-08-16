import api from './axios';
import { ApiResponse } from '../types';

export interface DisputeResponse {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reportedSellerId: string;
  reportedSellerEmail: string;
  gameId: string | null;
  gameTitle: string | null;
  marketplaceItemId: string | null;
  marketplaceItemTitle: string | null;
  reason: string;
  evidenceRepoUrl: string | null;
  evidenceNote: string | null;
  status: string;
  resolutionNote: string | null;
  refundAmount: number | null;
  sellerOutstandingDebt?: number | null;
  suggestedRefundAmount?: number | null;
  refundDeadline: string | null;
  refundConfirmedAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateDisputePayload {
  gameId?: string;
  marketplaceItemId?: string;
  reason: string;
  evidenceRepoUrl?: string;
  evidenceNote?: string;
}

export interface ResolveDisputePayload {
  resolution:
    | 'resolved_seller_fault'
    | 'resolved_reporter_fault'
    | 'resolved_inconclusive';
  resolutionNote?: string;
  refundAmount?: number;
  banUser?: boolean;
}

export const disputeApi = {
  create: async (payload: CreateDisputePayload): Promise<ApiResponse<DisputeResponse>> => {
    const res = await api.post('/api/v1/disputes', payload);
    return res.data;
  },
  myReports: async (): Promise<ApiResponse<DisputeResponse[]>> => {
    const res = await api.get('/api/v1/disputes/my-reports');
    return res.data;
  },
  getMyUnpaidDebt: async (): Promise<ApiResponse<DisputeResponse | null>> => {
    const res = await api.get('/api/v1/disputes/my-unpaid-debt');
    return res.data;
  },
  createDisputeRepayment: async (disputeId: string): Promise<ApiResponse<any>> => {
    const res = await api.post(`/api/v1/payments/dispute-repayment/${disputeId}`);
    return res.data;
  },
  getAll: async (): Promise<ApiResponse<DisputeResponse[]>> => {
    const res = await api.get('/api/v1/disputes');
    return res.data;
  },
  getById: async (id: string): Promise<ApiResponse<DisputeResponse>> => {
    const res = await api.get(`/api/v1/disputes/${id}`);
    return res.data;
  },
  resolve: async (id: string, payload: ResolveDisputePayload): Promise<ApiResponse<DisputeResponse>> => {
    const res = await api.post(`/api/v1/disputes/${id}/resolve`, payload);
    return res.data;
  },
  confirmRefund: async (id: string): Promise<ApiResponse<DisputeResponse>> => {
    const res = await api.post(`/api/v1/disputes/${id}/confirm-refund`);
    return res.data;
  },
  getAiAnalysis: async (id: string): Promise<ApiResponse<string>> => {
    const res = await api.get(`/api/v1/disputes/${id}/ai-analysis`);
    return res.data;
  },
};
