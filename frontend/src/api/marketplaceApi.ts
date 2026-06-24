import api from './axios';
import { 
  ApiResponse, 
  CreateMarketplaceItemRequest, 
  UpdateMarketplaceItemRequest, 
  MarketplaceItemResponse 
} from '../types';

export const marketplaceApi = {
  createMarketplaceItem: async (data: CreateMarketplaceItemRequest): Promise<ApiResponse<{ itemId: string }>> => {
    const response = await api.post<ApiResponse<{ itemId: string }>>('/api/v1/marketplace-items', data);
    return response.data;
  },

  getAllMarketplaceItems: async (status?: string): Promise<ApiResponse<MarketplaceItemResponse[]>> => {
    const response = await api.get<ApiResponse<MarketplaceItemResponse[]>>('/api/v1/marketplace-items', {
      params: status ? { status } : {}
    });
    return response.data;
  },

  getMyMarketplaceItems: async (): Promise<ApiResponse<MarketplaceItemResponse[]>> => {
    const response = await api.get<ApiResponse<MarketplaceItemResponse[]>>('/api/v1/marketplace-items/my-items');
    return response.data;
  },

  getMarketplaceItemById: async (id: string): Promise<ApiResponse<MarketplaceItemResponse>> => {
    const response = await api.get<ApiResponse<MarketplaceItemResponse>>(`/api/v1/marketplace-items/${id}`);
    return response.data;
  },

  updateMarketplaceItem: async (id: string, data: UpdateMarketplaceItemRequest): Promise<ApiResponse<MarketplaceItemResponse>> => {
    const response = await api.put<ApiResponse<MarketplaceItemResponse>>(`/api/v1/marketplace-items/${id}`, data);
    return response.data;
  },

  getPresignedUrl: async (
    id: string, 
    contentType: string
  ): Promise<ApiResponse<{ uploadUrl: string }>> => {
    const response = await api.get<ApiResponse<{ uploadUrl: string }>>(`/api/v1/marketplace-items/${id}/upload-url`, {
      params: { contentType }
    });
    return response.data;
  },

  confirmUploadComplete: async (
    id: string,
    objectKey?: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post<ApiResponse<{ message: string }>>(`/api/v1/marketplace-items/${id}/upload-complete`, null, {
      params: { objectKey }
    });
    return response.data;
  },

  // Proxy upload: gửi file zip lên backend → StorageRouter (S3 hoặc SeaweedFS theo routing config)
  uploadItemFile: async (
    id: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<{ message: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ message: string }>>(
      `/api/v1/marketplace-items/${id}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      }
    );
    return response.data;
  },

  // Upload thumbnail / screenshots / video
  uploadMedia: async (
    id: string,
    fileType: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<{ message: string; objectKey: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ message: string; objectKey: string }>>(
      `/api/v1/marketplace-items/${id}/media/upload`,
      formData,
      {
        params: { fileType },
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      }
    );
    return response.data;
  },

  // Delete a specific media by url
  deleteMediaItem: async (
    id: string,
    mediaUrl: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(
      `/api/v1/marketplace-items/${id}/media/item`,
      { params: { mediaUrl } }
    );
    return response.data;
  },

  deleteMarketplaceItem: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/api/v1/marketplace-items/${id}`);
    return response.data;
  },

  approveMarketplaceItem: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/api/v1/marketplace-items/${id}/approve`);
    return response.data;
  },

  rejectMarketplaceItem: async (id: string, reason: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/api/v1/marketplace-items/${id}/reject`, { reason });
    return response.data;
  }
};
