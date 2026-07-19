import api from './axios';
import { ApiResponse } from '../types';

export interface AgreementVersionResponse {
  id: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface AgreementAcceptanceStatusResponse {
  accepted: boolean;
  acceptedVersion: number | null;
  acceptedAt: string | null;
}

export const agreementApi = {
  getActive: async (): Promise<ApiResponse<AgreementVersionResponse>> => {
    const res = await api.get('/api/v1/agreements/active');
    return res.data;
  },
  getAcceptanceStatus: async (): Promise<ApiResponse<AgreementAcceptanceStatusResponse>> => {
    const res = await api.get('/api/v1/agreements/acceptance-status');
    return res.data;
  },
  accept: async (): Promise<ApiResponse<AgreementAcceptanceStatusResponse>> => {
    const res = await api.post('/api/v1/agreements/accept');
    return res.data;
  },
};

export const adminAgreementApi = {
  listVersions: async (): Promise<ApiResponse<AgreementVersionResponse[]>> => {
    const res = await api.get('/api/v1/admin/agreements');
    return res.data;
  },
  createVersion: async (content: string): Promise<ApiResponse<AgreementVersionResponse>> => {
    const res = await api.post('/api/v1/admin/agreements', { content });
    return res.data;
  },
};
