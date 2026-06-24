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
  refundDeadline: string | null;
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
};
