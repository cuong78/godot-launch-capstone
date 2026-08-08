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
  bankName: string | null;
  bankAccount: string | null;
  bankAccountHolder: string | null;
  // Chỉ có giá trị khi bước thiết lập ngân hàng vừa nâng role developer.
  token?: string | null;
}

export interface KycConfirmPayload {
  documentType: string;
  fullName: string;
  idNumber: string;
  dateOfBirth?: string;
  address?: string;
  frontImageBase64?: string;
  backImageBase64?: string;
}

export interface BankSetupPayload {
  bankName: string;
  bankAccount: string;
  bankAccountHolder: string;
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

  setupBank: async (payload: BankSetupPayload): Promise<ApiResponse<KycStatus>> => {
    const res = await api.post('/api/developer/kyc/bank', payload);
    return res.data;
  },
};
