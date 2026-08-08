import api from './axios';
import { ApiResponse } from '../types';

export interface CartItemResponse {
  id: string;
  asset: any;
  game: any;
  addedAt: string;
}

export interface AddCartItemRequest {
  itemId: string;
  itemType: 'asset' | 'source_code';
}

export const cartApi = {
  getCart: async (): Promise<ApiResponse<CartItemResponse[]>> => {
    const response = await api.get<ApiResponse<CartItemResponse[]>>('/api/cart');
    return response.data;
  },
  addToCart: async (data: AddCartItemRequest): Promise<ApiResponse<CartItemResponse>> => {
    const response = await api.post<ApiResponse<CartItemResponse>>('/api/cart', data);
    return response.data;
  },
  removeFromCart: async (itemId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/cart/items/${itemId}`);
    return response.data;
  },
  clearCart: async (): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>('/api/cart/clear');
    return response.data;
  },
};
