import api from './axios';
import { ApiResponse } from '../types';

export interface BannerResponse {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerPayload {
  title: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
}

export const bannerApi = {
  getPublicBanners: async (): Promise<ApiResponse<BannerResponse[]>> => {
    const response = await api.get<ApiResponse<BannerResponse[]>>('/api/v1/banners');
    return response.data;
  },

  getAdminBanners: async (): Promise<ApiResponse<BannerResponse[]>> => {
    const response = await api.get<ApiResponse<BannerResponse[]>>('/api/v1/admin/banners');
    return response.data;
  },

  createBanner: async (payload: BannerPayload): Promise<ApiResponse<BannerResponse>> => {
    const response = await api.post<ApiResponse<BannerResponse>>('/api/v1/admin/banners', payload);
    return response.data;
  },

  updateBanner: async (id: string, payload: BannerPayload): Promise<ApiResponse<BannerResponse>> => {
    const response = await api.put<ApiResponse<BannerResponse>>(`/api/v1/admin/banners/${id}`, payload);
    return response.data;
  },

  deleteBanner: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/admin/banners/${id}`);
    return response.data;
  },

  uploadImage: async (file: File): Promise<ApiResponse<{ imageUrl: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ imageUrl: string }>>(
      '/api/v1/admin/banners/image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
