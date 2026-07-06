import api from './axios';
import { ApiResponse } from '../types';

export interface CreateOrderRequest {
  targetId: string;
  orderType: 'source_code_purchase' | 'asset_purchase';
}

export interface CreateOrderResponse {
  orderId: string;
}

export const orderApi = {
  createOrder: async (data: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> => {
    const response = await api.post<ApiResponse<CreateOrderResponse>>('/api/orders', data);
    return response.data;
  },
};
