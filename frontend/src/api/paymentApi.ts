import api from './axios';
import {
  ApiResponse,
  CreatePaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from '../types';

export const paymentApi = {
  createPayment: async (data: CreatePaymentRequest): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>('/api/v1/payments/create', data);
    return response.data;
  },

  confirmPayment: async (paymentId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>(`/api/v1/payments/${paymentId}/confirm`);
    return response.data;
  },

  cancelPayment: async (paymentId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.post<ApiResponse<PaymentResponse>>(`/api/v1/payments/${paymentId}/cancel`);
    return response.data;
  },

  getMyPayments: async (): Promise<ApiResponse<PaymentResponse[]>> => {
    const response = await api.get<ApiResponse<PaymentResponse[]>>('/api/v1/payments/my-payments');
    return response.data;
  },

  getPaymentById: async (paymentId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.get<ApiResponse<PaymentResponse>>(`/api/v1/payments/${paymentId}`);
    return response.data;
  },

  getPaymentByOrder: async (orderId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.get<ApiResponse<PaymentResponse>>(`/api/v1/payments/order/${orderId}`);
    return response.data;
  },

  getPaymentStatus: async (orderId: string): Promise<ApiResponse<PaymentStatusResponse>> => {
    const response = await api.get<ApiResponse<PaymentStatusResponse>>(`/api/v1/payments/status/${orderId}`);
    return response.data;
  },

  getAdminPayments: async (): Promise<ApiResponse<PaymentResponse[]>> => {
    const response = await api.get<ApiResponse<PaymentResponse[]>>('/api/v1/admin/payments');
    return response.data;
  },

  getAdminPaymentDetail: async (paymentId: string): Promise<ApiResponse<PaymentResponse>> => {
    const response = await api.get<ApiResponse<PaymentResponse>>(`/api/v1/admin/payments/${paymentId}`);
    return response.data;
  },
};
