import api from './axios';
import { ApiResponse } from '../types';

export interface KycOcrResult {
  documentType: string;
  idNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  address: string | null;
}

export interface KycStatus {
  kycVerified: boolean;
  documentType: string | null;
  fullName: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  address: string | null;
  kycVerifiedAt: string | null;
}

export interface KycConfirmPayload {
  documentType: string;
  fullName: string;
  idNumber: string;
  dateOfBirth?: string;
  address?: string;
}

export const kycApi = {
  getStatus: async (): Promise<ApiResponse<KycStatus>> => {
    const res = await api.get('/api/developer/kyc/status');
    return res.data;
  },

  ocr: async (imageBase64: string, documentType: 'cccd' | 'passport'): Promise<ApiResponse<KycOcrResult>> => {
    const res = await api.post('/api/developer/kyc/ocr', { imageBase64, documentType });
    return res.data;
  },

  confirm: async (payload: KycConfirmPayload): Promise<ApiResponse<KycStatus>> => {
    const res = await api.post('/api/developer/kyc/confirm', payload);
    return res.data;
  },
};
