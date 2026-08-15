import api from './axios';
import { ApiResponse } from '../types';

export type AgreementType = 'DEVELOPER_ONBOARDING' | 'BUYER_EULA';

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
  getActive: async (type: AgreementType = 'DEVELOPER_ONBOARDING'): Promise<ApiResponse<AgreementVersionResponse>> => {
    const res = await api.get('/api/v1/agreements/active', { params: { type } });
    return res.data;
  },
  getAcceptanceStatus: async (type: AgreementType = 'DEVELOPER_ONBOARDING'): Promise<ApiResponse<AgreementAcceptanceStatusResponse>> => {
    const res = await api.get('/api/v1/agreements/acceptance-status', { params: { type } });
    return res.data;
  },
  accept: async (type: AgreementType = 'DEVELOPER_ONBOARDING'): Promise<ApiResponse<AgreementAcceptanceStatusResponse>> => {
    const res = await api.post('/api/v1/agreements/accept', null, { params: { type } });
    return res.data;
  },
};

export const adminAgreementApi = {
  listVersions: async (type: AgreementType = 'DEVELOPER_ONBOARDING'): Promise<ApiResponse<AgreementVersionResponse[]>> => {
    const res = await api.get('/api/v1/admin/agreements', { params: { type } });
    return res.data;
  },
  createVersion: async (content: string, type: AgreementType = 'DEVELOPER_ONBOARDING'): Promise<ApiResponse<AgreementVersionResponse>> => {
    const res = await api.post('/api/v1/admin/agreements', { content, type });
    return res.data;
  },
};
