import api from './axios';
import {
  ApiResponse,
  CreatePaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  PaymentVerificationRequest,
  UploadReceiptRequest,
} from '../types';

export const paymentApi = {
  createPayment: async (data: CreatePaymentRequest): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>('/api/v1/payments', data);
    return response.data;
  },

  uploadReceipt: async (paymentId: string, data: UploadReceiptRequest): Promise<ApiResponse<PaymentResponse>> => {
    const formData = new FormData();
    formData.append('payerName', data.payerName);
    formData.append('payerBank', data.payerBank);
    formData.append('transferReference', data.transferReference);
    formData.append('receiptFile', data.receiptFile);

    const response = await api.post<ApiResponse<PaymentResponse>>(
      `/api/v1/payments/${paymentId}/receipt`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getPaymentByOrder: async (orderId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.get<ApiResponse<PaymentResponse>>(`/api/v1/payments/order/${orderId}`);
    return response.data;
  },

  getPaymentStatus: async (orderId: string): Promise<ApiResponse<PaymentStatusResponse>> => {
    const response = await api.get<ApiResponse<PaymentStatusResponse>>(`/api/v1/payments/order/${orderId}/status`);
    return response.data;
  },

  getPendingPayments: async (): Promise<ApiResponse<PaymentResponse[]>> => {
    const response = await api.get<ApiResponse<PaymentResponse[]>>('/api/v1/admin/payments/pending');
    return response.data;
  },

  getPaymentDetail: async (paymentId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.get<ApiResponse<PaymentResponse>>(`/api/v1/admin/payments/${paymentId}`);
    return response.data;
  },

  approvePayment: async (paymentId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>(`/api/v1/admin/payments/${paymentId}/approve`);
    return response.data;
  },

  rejectPayment: async (
    paymentId: string,
    data: PaymentVerificationRequest
  ): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>(
      `/api/v1/admin/payments/${paymentId}/reject`,
      data
    );
    return response.data;
  },
};
